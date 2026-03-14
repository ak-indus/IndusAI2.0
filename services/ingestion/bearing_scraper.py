"""Bearing manufacturer scrapers for SKF, NSK, and FAG/Schaeffler.

Uses Firecrawl API to fetch catalog pages and Claude LLM to extract
structured bearing data (part numbers, specs, cross-references).
"""

import json
import logging
import re
from dataclasses import dataclass, field
from html import unescape

import httpx

logger = logging.getLogger(__name__)

FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape"

# ---------------------------------------------------------------------------
# Shared data structures
# ---------------------------------------------------------------------------


@dataclass
class BearingProduct:
    """Structured bearing product extracted from a manufacturer catalog."""
    part_number: str
    manufacturer: str
    bearing_type: str = ""          # e.g. "Deep groove ball bearing"
    series: str = ""                # e.g. "6200", "7300"
    bore_mm: float | None = None
    od_mm: float | None = None
    width_mm: float | None = None
    dynamic_load_kn: float | None = None
    static_load_kn: float | None = None
    speed_limit_rpm: int | None = None
    weight_kg: float | None = None
    seal_type: str = ""             # e.g. "2RS", "ZZ", "Open"
    material: str = ""              # e.g. "Chrome steel", "Ceramic hybrid"
    cage_type: str = ""
    description: str = ""
    source_url: str = ""
    tds_url: str | None = None
    cad_url: str | None = None


@dataclass
class CrossReference:
    """A cross-reference mapping between two manufacturer part numbers."""
    source_sku: str
    source_manufacturer: str
    target_sku: str
    target_manufacturer: str
    ref_type: str = "EQUIVALENT_TO"   # EQUIVALENT_TO | ALTERNATIVE_TO
    confidence: float = 0.85
    notes: str = ""


# ---------------------------------------------------------------------------
# LLM extraction prompts
# ---------------------------------------------------------------------------

SKF_EXTRACTION_PROMPT = """Extract bearing product data from this SKF catalog page.
Return a JSON array of bearings. Each bearing should have:
- part_number: SKF designation (e.g. "6205-2RS1", "7308 BECBP")
- bearing_type: type (e.g. "Deep groove ball bearing", "Angular contact ball bearing")
- series: series number (e.g. "6200", "7300")
- bore_mm: bore diameter in mm (number)
- od_mm: outside diameter in mm (number)
- width_mm: width in mm (number)
- dynamic_load_kn: basic dynamic load rating in kN (number, null if not found)
- static_load_kn: basic static load rating in kN (number, null if not found)
- speed_limit_rpm: limiting speed in rpm (number, null if not found)
- weight_kg: mass in kg (number, null if not found)
- seal_type: seal/shield type (e.g. "2RS1", "2Z", "Open")
- material: bearing material if specified
- cage_type: cage material/type if specified
- description: short description
- tds_url: URL to product data sheet (null if not found)
- cad_url: URL to CAD model (null if not found)

Only extract REAL bearing products. Return ONLY valid JSON array, no markdown.

Page content:
{content}"""

NSK_EXTRACTION_PROMPT = """Extract bearing product data from this NSK catalog page.
Return a JSON array of bearings. Each bearing should have:
- part_number: NSK designation (e.g. "6205ZZ", "7308B")
- bearing_type: type (e.g. "Deep groove ball bearing", "Angular contact ball bearing")
- series: series (e.g. "6200", "7300")
- bore_mm: bore diameter in mm
- od_mm: outside diameter in mm
- width_mm: width in mm
- dynamic_load_kn: basic dynamic load rating Cr in kN (null if not found)
- static_load_kn: basic static load rating C0r in kN (null if not found)
- speed_limit_rpm: limiting speed in rpm (null if not found)
- weight_kg: mass in kg (null if not found)
- seal_type: seal/shield type (e.g. "ZZ", "DDU", "VV")
- description: short description

Only extract REAL bearing products. Return ONLY valid JSON array, no markdown.

Page content:
{content}"""

NSK_CROSSREF_PROMPT = """Extract cross-reference mappings from this NSK interchange page.
Return a JSON array. Each item should have:
- nsk_part: NSK part number
- competitor_part: competitor/OEM part number
- competitor_brand: competitor brand name (e.g. "SKF", "FAG", "NTN", "Timken")
- ref_type: "EQUIVALENT_TO" if direct replacement, "ALTERNATIVE_TO" if approximate
- notes: any notes about differences or fit

Return ONLY valid JSON array, no markdown.

Page content:
{content}"""

FAG_EXTRACTION_PROMPT = """Extract bearing product data from this Schaeffler/FAG/INA catalog page.
Return a JSON array of bearings. Each bearing should have:
- part_number: FAG/INA designation (e.g. "6205-2RSR", "B7308-C-T-P4S")
- bearing_type: type (e.g. "Deep groove ball bearing", "Angular contact ball bearing")
- series: series (e.g. "6200", "7300")
- bore_mm: bore diameter in mm
- od_mm: outside diameter in mm
- width_mm: width in mm
- dynamic_load_kn: basic dynamic load rating Cr in kN (null if not found)
- static_load_kn: basic static load rating C0r in kN (null if not found)
- speed_limit_rpm: limiting speed in rpm (null if not found)
- weight_kg: mass in kg (null if not found)
- seal_type: seal/shield type (e.g. "2RSR", "2ZR", "Open")
- description: short description
- tds_url: URL to product data (null if not found)

Only extract REAL bearing products. Return ONLY valid JSON array, no markdown.

Page content:
{content}"""

FAG_CROSSREF_PROMPT = """Extract cross-reference or interchange data from this Schaeffler/FAG page.
Return a JSON array. Each item should have:
- fag_part: FAG/INA part number
- competitor_part: competitor part number
- competitor_brand: competitor brand (e.g. "SKF", "NSK", "NTN", "Timken")
- ref_type: "EQUIVALENT_TO" if direct replacement, "ALTERNATIVE_TO" if approximate
- notes: any notes about differences

Return ONLY valid JSON array, no markdown.

Page content:
{content}"""


def _clean(raw: str) -> str:
    """Strip HTML tags and decode entities."""
    cleaned = re.sub(r'<[^>]+>', '', raw)
    return unescape(cleaned).strip()


# ---------------------------------------------------------------------------
# Base bearing scraper
# ---------------------------------------------------------------------------

class _BaseBearingScraper:
    """Shared Firecrawl + LLM extraction logic for bearing scrapers."""

    MANUFACTURER: str = ""

    def __init__(self, firecrawl_api_key: str, llm_router=None):
        self._firecrawl_key = firecrawl_api_key
        self._llm = llm_router

    async def _fetch_page(self, url: str) -> str:
        """Fetch page content via Firecrawl API."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                FIRECRAWL_API_URL,
                headers={
                    "Authorization": f"Bearer {self._firecrawl_key}",
                    "Content-Type": "application/json",
                },
                json={"url": url, "formats": ["markdown"]},
            )
            if resp.status_code != 200:
                logger.warning("Firecrawl failed %s: HTTP %d", url, resp.status_code)
                return ""
            data = resp.json().get("data", {})
            return data.get("markdown", "")

    async def _extract_with_llm(self, content: str, prompt_template: str) -> list[dict]:
        """Use LLM to extract structured data from page content."""
        if not content or not self._llm:
            return []

        content_truncated = content[:12000]
        prompt = prompt_template.format(content=content_truncated)

        try:
            response = await self._llm.chat(
                messages=[{"role": "user", "content": prompt}],
                task="bearing_extraction",
                max_tokens=4096,
                temperature=0.1,
            )
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            logger.warning("LLM extraction failed: %s", e)

        return []

    def _raw_to_bearing(self, raw: dict, source_url: str) -> BearingProduct:
        """Convert raw LLM output dict to a BearingProduct."""
        return BearingProduct(
            part_number=_clean(str(raw.get("part_number", ""))),
            manufacturer=self.MANUFACTURER,
            bearing_type=raw.get("bearing_type", ""),
            series=raw.get("series", ""),
            bore_mm=_safe_float(raw.get("bore_mm")),
            od_mm=_safe_float(raw.get("od_mm")),
            width_mm=_safe_float(raw.get("width_mm")),
            dynamic_load_kn=_safe_float(raw.get("dynamic_load_kn")),
            static_load_kn=_safe_float(raw.get("static_load_kn")),
            speed_limit_rpm=_safe_int(raw.get("speed_limit_rpm")),
            weight_kg=_safe_float(raw.get("weight_kg")),
            seal_type=raw.get("seal_type", ""),
            material=raw.get("material", ""),
            cage_type=raw.get("cage_type", ""),
            description=raw.get("description", ""),
            source_url=source_url,
            tds_url=raw.get("tds_url"),
            cad_url=raw.get("cad_url"),
        )

    def bearing_to_ingestion_dict(self, b: BearingProduct) -> dict:
        """Convert a BearingProduct to the dict format expected by the ingestion pipeline."""
        specs = {}
        if b.bore_mm is not None:
            specs["bore_mm"] = b.bore_mm
        if b.od_mm is not None:
            specs["od_mm"] = b.od_mm
        if b.width_mm is not None:
            specs["width_mm"] = b.width_mm
        if b.dynamic_load_kn is not None:
            specs["dynamic_load_kn"] = b.dynamic_load_kn
        if b.static_load_kn is not None:
            specs["static_load_kn"] = b.static_load_kn
        if b.speed_limit_rpm is not None:
            specs["speed_limit_rpm"] = b.speed_limit_rpm
        if b.weight_kg is not None:
            specs["weight_kg"] = b.weight_kg
        if b.seal_type:
            specs["seal_type"] = b.seal_type
        if b.material:
            specs["material"] = b.material
        if b.cage_type:
            specs["cage_type"] = b.cage_type
        if b.series:
            specs["series"] = b.series

        return {
            "part_number": b.part_number,
            "name": f"{b.manufacturer} {b.part_number}",
            "description": b.description or f"{b.bearing_type} {b.part_number}",
            "category": "bearing",
            "manufacturer": b.manufacturer,
            "specifications": specs,
            "source_url": b.source_url,
            "tds_url": b.tds_url,
        }


# ---------------------------------------------------------------------------
# SKF Scraper
# ---------------------------------------------------------------------------

class SKFScraper(_BaseBearingScraper):
    """Scrape SKF bearing catalog pages and extract structured product data.

    Targets:
    - Product detail pages (e.g. skf.com/us/products/rolling-bearings/ball-bearings/...)
    - Product listing/table pages
    - Product search results
    """

    MANUFACTURER = "SKF"

    async def scrape_product_page(self, url: str) -> list[BearingProduct]:
        """Scrape a single SKF product page."""
        content = await self._fetch_page(url)
        raw_list = await self._extract_with_llm(content, SKF_EXTRACTION_PROMPT)
        return [self._raw_to_bearing(r, url) for r in raw_list if r.get("part_number")]

    async def scrape_product_listing(self, url: str) -> list[BearingProduct]:
        """Scrape an SKF product listing/table page.

        Also extracts links to individual product pages for deeper crawling.
        """
        content = await self._fetch_page(url)
        if not content:
            return []

        # Extract product detail links from markdown
        product_urls = []
        for match in re.finditer(
            r'\[([^\]]*)\]\((https?://[^\)]*skf\.com[^\)]*product[^\)]*)\)', content
        ):
            product_urls.append(match.group(2))

        # Extract data from listing page itself
        raw_list = await self._extract_with_llm(content, SKF_EXTRACTION_PROMPT)
        bearings = [self._raw_to_bearing(r, url) for r in raw_list if r.get("part_number")]

        # Follow up to 20 product detail links
        seen_parts = {b.part_number for b in bearings}
        for detail_url in product_urls[:20]:
            try:
                detail_bearings = await self.scrape_product_page(detail_url)
                for b in detail_bearings:
                    if b.part_number not in seen_parts:
                        seen_parts.add(b.part_number)
                        bearings.append(b)
            except Exception as e:
                logger.warning("Failed to scrape SKF detail page %s: %s", detail_url, e)

        logger.info("SKF listing scrape: %d bearings from %s", len(bearings), url)
        return bearings

    async def scrape_series(self, series_url: str, max_pages: int = 10) -> list[BearingProduct]:
        """Scrape an entire SKF bearing series (e.g. all 6200-series)."""
        all_bearings = []
        visited = set()
        to_visit = [series_url]

        while to_visit and len(visited) < max_pages:
            url = to_visit.pop(0)
            if url in visited:
                continue
            visited.add(url)

            content = await self._fetch_page(url)
            if not content:
                continue

            raw_list = await self._extract_with_llm(content, SKF_EXTRACTION_PROMPT)
            bearings = [self._raw_to_bearing(r, url) for r in raw_list if r.get("part_number")]
            all_bearings.extend(bearings)

            # Find next/more pages
            for match in re.finditer(
                r'\[(?:next|more|view all|show more)[^\]]*\]\(([^)]+)\)', content, re.IGNORECASE
            ):
                href = match.group(1)
                if href.startswith("http"):
                    to_visit.append(href)

            logger.info("SKF series page %s: %d bearings", url, len(bearings))

        logger.info("SKF series scrape complete: %d total bearings", len(all_bearings))
        return all_bearings


# ---------------------------------------------------------------------------
# NSK Scraper
# ---------------------------------------------------------------------------

class NSKScraper(_BaseBearingScraper):
    """Scrape NSK bearing catalog and cross-reference pages.

    Targets:
    - Product catalog pages (nskamericas.com, nsk.com)
    - Cross-reference / interchange tables
    """

    MANUFACTURER = "NSK"

    async def scrape_product_page(self, url: str) -> list[BearingProduct]:
        """Scrape a single NSK product page."""
        content = await self._fetch_page(url)
        raw_list = await self._extract_with_llm(content, NSK_EXTRACTION_PROMPT)
        return [self._raw_to_bearing(r, url) for r in raw_list if r.get("part_number")]

    async def scrape_product_listing(self, url: str, max_pages: int = 10) -> list[BearingProduct]:
        """Scrape NSK product listing with pagination."""
        all_bearings = []
        visited = set()
        to_visit = [url]

        while to_visit and len(visited) < max_pages:
            current_url = to_visit.pop(0)
            if current_url in visited:
                continue
            visited.add(current_url)

            content = await self._fetch_page(current_url)
            if not content:
                continue

            raw_list = await self._extract_with_llm(content, NSK_EXTRACTION_PROMPT)
            bearings = [self._raw_to_bearing(r, current_url)
                        for r in raw_list if r.get("part_number")]
            all_bearings.extend(bearings)

            # Find pagination links
            for match in re.finditer(
                r'\[(?:next|›|>>)[^\]]*\]\(([^)]+)\)', content, re.IGNORECASE
            ):
                href = match.group(1)
                if href.startswith("http"):
                    to_visit.append(href)

            logger.info("NSK listing page %s: %d bearings", current_url, len(bearings))

        return all_bearings

    async def scrape_cross_references(self, url: str) -> list[CrossReference]:
        """Scrape NSK cross-reference / interchange page.

        Returns mappings between NSK parts and competitor equivalents.
        """
        content = await self._fetch_page(url)
        if not content:
            return []

        raw_list = await self._extract_with_llm(content, NSK_CROSSREF_PROMPT)
        refs = []
        for r in raw_list:
            nsk_part = r.get("nsk_part", "").strip()
            competitor_part = r.get("competitor_part", "").strip()
            if not nsk_part or not competitor_part:
                continue

            refs.append(CrossReference(
                source_sku=nsk_part,
                source_manufacturer="NSK",
                target_sku=competitor_part,
                target_manufacturer=r.get("competitor_brand", "Unknown"),
                ref_type=r.get("ref_type", "EQUIVALENT_TO"),
                confidence=0.85,
                notes=r.get("notes", ""),
            ))

        logger.info("NSK cross-ref scrape: %d references from %s", len(refs), url)
        return refs

    async def scrape_interchange_table(self, url: str) -> list[CrossReference]:
        """Scrape a full NSK interchange/cross-reference table page.

        Many interchange pages have tabular data with columns like:
        NSK | SKF | FAG | NTN | Timken
        """
        content = await self._fetch_page(url)
        if not content:
            return []

        # Try regex extraction first (tables often render as markdown tables)
        refs = self._extract_table_crossrefs(content)
        if refs:
            logger.info("NSK interchange table (regex): %d references", len(refs))
            return refs

        # Fall back to LLM extraction
        return await self.scrape_cross_references(url)

    def _extract_table_crossrefs(self, content: str) -> list[CrossReference]:
        """Extract cross-refs from markdown table format.

        Expected format:
        | NSK | SKF | FAG | NTN |
        |-----|-----|-----|-----|
        | 6205ZZ | 6205-2Z | 6205-2ZR | 6205ZZ |
        """
        refs = []
        lines = content.split("\n")
        header_idx = None
        brand_cols: dict[int, str] = {}

        for i, line in enumerate(lines):
            if not line.strip().startswith("|"):
                continue

            cells = [c.strip() for c in line.split("|")[1:-1]]
            if not cells:
                continue

            # Detect header row
            if any(brand in cells for brand in ("NSK", "SKF", "FAG", "NTN", "Timken", "INA")):
                header_idx = i
                for col_idx, cell in enumerate(cells):
                    cell_upper = cell.upper().strip()
                    if cell_upper in ("NSK", "SKF", "FAG", "NTN", "TIMKEN", "INA",
                                      "KOYO", "NACHI"):
                        brand_cols[col_idx] = cell_upper
                continue

            # Skip separator row
            if header_idx is not None and re.match(r'^[\s|:-]+$', line):
                continue

            # Data row
            if header_idx is not None and brand_cols:
                nsk_col = None
                for col_idx, brand in brand_cols.items():
                    if brand == "NSK":
                        nsk_col = col_idx
                        break

                if nsk_col is not None and nsk_col < len(cells):
                    nsk_part = cells[nsk_col].strip()
                    if not nsk_part or nsk_part == "-":
                        continue

                    for col_idx, brand in brand_cols.items():
                        if col_idx == nsk_col or col_idx >= len(cells):
                            continue
                        target_part = cells[col_idx].strip()
                        if target_part and target_part != "-":
                            refs.append(CrossReference(
                                source_sku=nsk_part,
                                source_manufacturer="NSK",
                                target_sku=target_part,
                                target_manufacturer=brand,
                                ref_type="EQUIVALENT_TO",
                                confidence=0.9,
                            ))

        return refs


# ---------------------------------------------------------------------------
# FAG / Schaeffler Scraper
# ---------------------------------------------------------------------------

class FAGScraper(_BaseBearingScraper):
    """Scrape Schaeffler (FAG/INA) bearing catalog and cross-reference pages.

    Targets:
    - medias.schaeffler.com product pages
    - Schaeffler product search results
    - FAG cross-reference data
    """

    MANUFACTURER = "FAG"

    async def scrape_product_page(self, url: str) -> list[BearingProduct]:
        """Scrape a single FAG/INA product page."""
        content = await self._fetch_page(url)
        raw_list = await self._extract_with_llm(content, FAG_EXTRACTION_PROMPT)
        return [self._raw_to_bearing(r, url) for r in raw_list if r.get("part_number")]

    async def scrape_product_listing(self, url: str, max_pages: int = 10) -> list[BearingProduct]:
        """Scrape FAG/Schaeffler product listing with pagination."""
        all_bearings = []
        visited = set()
        to_visit = [url]

        while to_visit and len(visited) < max_pages:
            current_url = to_visit.pop(0)
            if current_url in visited:
                continue
            visited.add(current_url)

            content = await self._fetch_page(current_url)
            if not content:
                continue

            raw_list = await self._extract_with_llm(content, FAG_EXTRACTION_PROMPT)
            bearings = [self._raw_to_bearing(r, current_url)
                        for r in raw_list if r.get("part_number")]
            all_bearings.extend(bearings)

            # Find pagination links
            for match in re.finditer(
                r'\[(?:next|›|>>|Next page)[^\]]*\]\(([^)]+)\)', content, re.IGNORECASE
            ):
                href = match.group(1)
                if href.startswith("http"):
                    to_visit.append(href)

            logger.info("FAG listing page %s: %d bearings", current_url, len(bearings))

        return all_bearings

    async def scrape_cross_references(self, url: str) -> list[CrossReference]:
        """Scrape FAG cross-reference / interchange data."""
        content = await self._fetch_page(url)
        if not content:
            return []

        raw_list = await self._extract_with_llm(content, FAG_CROSSREF_PROMPT)
        refs = []
        for r in raw_list:
            fag_part = r.get("fag_part", "").strip()
            competitor_part = r.get("competitor_part", "").strip()
            if not fag_part or not competitor_part:
                continue

            refs.append(CrossReference(
                source_sku=fag_part,
                source_manufacturer="FAG",
                target_sku=competitor_part,
                target_manufacturer=r.get("competitor_brand", "Unknown"),
                ref_type=r.get("ref_type", "EQUIVALENT_TO"),
                confidence=0.85,
                notes=r.get("notes", ""),
            ))

        logger.info("FAG cross-ref scrape: %d references from %s", len(refs), url)
        return refs


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _safe_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None
