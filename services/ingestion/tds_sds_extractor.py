"""TDS/SDS PDF extraction pipeline using Claude LLM.

Downloads TDS (Technical Data Sheet) and SDS (Safety Data Sheet) PDFs,
extracts text via pdfplumber or Firecrawl, then uses Claude to parse
structured fields for storage in the Neo4j knowledge graph.
"""

import io
import json
import logging
import re
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape"

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class TDSData:
    """Structured data extracted from a Technical Data Sheet."""
    product_sku: str
    product_name: str = ""
    manufacturer: str = ""
    revision_date: str = ""
    pdf_url: str = ""
    # Physical properties
    appearance: str = ""
    color: str = ""
    density: str = ""
    viscosity: str = ""
    flash_point: str = ""
    pour_point: str = ""
    # Bearing-specific
    operating_temp_min: str = ""
    operating_temp_max: str = ""
    base_oil_type: str = ""
    thickener_type: str = ""
    nlgi_grade: str = ""
    # Performance
    load_capacity: str = ""
    speed_factor: str = ""
    corrosion_protection: str = ""
    water_resistance: str = ""
    # Certifications
    certifications: list[str] = field(default_factory=list)
    # Raw fields from LLM for flexibility
    extra_fields: dict = field(default_factory=dict)


@dataclass
class SDSData:
    """Structured data extracted from a Safety Data Sheet."""
    product_sku: str
    product_name: str = ""
    manufacturer: str = ""
    revision_date: str = ""
    pdf_url: str = ""
    # GHS classification
    signal_word: str = ""                   # "Danger" or "Warning"
    hazard_statements: list[str] = field(default_factory=list)
    precautionary_statements: list[str] = field(default_factory=list)
    ghs_pictograms: list[str] = field(default_factory=list)
    # Composition
    cas_numbers: list[dict] = field(default_factory=list)  # [{cas_number, name, percent}]
    # First aid
    first_aid_inhalation: str = ""
    first_aid_skin: str = ""
    first_aid_eyes: str = ""
    first_aid_ingestion: str = ""
    # Storage / handling
    storage_conditions: str = ""
    handling_precautions: str = ""
    # Exposure controls
    exposure_limits: list[dict] = field(default_factory=list)
    ppe_required: str = ""
    # Extra
    extra_fields: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# LLM prompts
# ---------------------------------------------------------------------------

TDS_EXTRACTION_PROMPT = """Extract structured data from this Technical Data Sheet (TDS).
Return a JSON object with the following fields (use null for missing values):

{{
  "product_name": "product trade name",
  "manufacturer": "manufacturer name",
  "revision_date": "document revision date",
  "appearance": "physical appearance",
  "color": "color",
  "density": "density with units",
  "viscosity": "viscosity with units and temperature",
  "flash_point": "flash point with units",
  "pour_point": "pour point with units",
  "operating_temp_min": "minimum operating temperature",
  "operating_temp_max": "maximum operating temperature",
  "base_oil_type": "base oil type (e.g. mineral, synthetic, PAO)",
  "thickener_type": "thickener type (e.g. lithium, polyurea)",
  "nlgi_grade": "NLGI consistency grade",
  "load_capacity": "load carrying capacity rating",
  "speed_factor": "speed factor or DN value",
  "corrosion_protection": "corrosion protection rating",
  "water_resistance": "water resistance rating",
  "certifications": ["list of certifications/approvals"],
  "extra_fields": {{"any_other_key": "any other important data"}}
}}

Return ONLY valid JSON, no markdown.

Document content:
{content}"""

SDS_EXTRACTION_PROMPT = """Extract structured data from this Safety Data Sheet (SDS).
Return a JSON object with the following fields (use null for missing values):

{{
  "product_name": "product trade name",
  "manufacturer": "manufacturer name",
  "revision_date": "document revision date",
  "signal_word": "Danger or Warning",
  "hazard_statements": ["list of H-statements"],
  "precautionary_statements": ["list of P-statements"],
  "ghs_pictograms": ["list of GHS pictogram codes, e.g. GHS02, GHS07"],
  "cas_numbers": [
    {{"cas_number": "CAS#", "name": "chemical name", "percent": "percentage range"}}
  ],
  "first_aid_inhalation": "first aid for inhalation",
  "first_aid_skin": "first aid for skin contact",
  "first_aid_eyes": "first aid for eye contact",
  "first_aid_ingestion": "first aid for ingestion",
  "storage_conditions": "storage requirements",
  "handling_precautions": "handling precautions",
  "exposure_limits": [
    {{"substance": "name", "type": "TWA/STEL", "value": "value with units"}}
  ],
  "ppe_required": "required PPE summary",
  "extra_fields": {{"any_other_key": "any other important safety data"}}
}}

Return ONLY valid JSON, no markdown.

Document content:
{content}"""


# ---------------------------------------------------------------------------
# Extractor
# ---------------------------------------------------------------------------

class TDSSDSExtractor:
    """Extract structured data from TDS/SDS PDFs using Claude LLM.

    Workflow:
    1. Download PDF (direct HTTP or via Firecrawl for auth-walled docs)
    2. Extract text (pdfplumber for local PDFs, Firecrawl markdown for remote)
    3. Send text to Claude for structured extraction
    4. Return typed TDSData or SDSData for graph storage
    """

    def __init__(self, firecrawl_api_key: str, llm_router=None):
        self._firecrawl_key = firecrawl_api_key
        self._llm = llm_router

    async def extract_tds(self, pdf_url: str, product_sku: str) -> TDSData:
        """Download and extract structured data from a TDS PDF."""
        text = await self._get_document_text(pdf_url)
        if not text:
            logger.warning("No text extracted from TDS: %s", pdf_url)
            return TDSData(product_sku=product_sku, pdf_url=pdf_url)

        raw = await self._extract_with_llm(text, TDS_EXTRACTION_PROMPT)
        if not raw:
            return TDSData(product_sku=product_sku, pdf_url=pdf_url)

        return TDSData(
            product_sku=product_sku,
            product_name=raw.get("product_name", ""),
            manufacturer=raw.get("manufacturer", ""),
            revision_date=raw.get("revision_date", ""),
            pdf_url=pdf_url,
            appearance=raw.get("appearance", ""),
            color=raw.get("color", ""),
            density=raw.get("density", ""),
            viscosity=raw.get("viscosity", ""),
            flash_point=raw.get("flash_point", ""),
            pour_point=raw.get("pour_point", ""),
            operating_temp_min=raw.get("operating_temp_min", ""),
            operating_temp_max=raw.get("operating_temp_max", ""),
            base_oil_type=raw.get("base_oil_type", ""),
            thickener_type=raw.get("thickener_type", ""),
            nlgi_grade=raw.get("nlgi_grade", ""),
            load_capacity=raw.get("load_capacity", ""),
            speed_factor=raw.get("speed_factor", ""),
            corrosion_protection=raw.get("corrosion_protection", ""),
            water_resistance=raw.get("water_resistance", ""),
            certifications=raw.get("certifications") or [],
            extra_fields=raw.get("extra_fields") or {},
        )

    async def extract_sds(self, pdf_url: str, product_sku: str) -> SDSData:
        """Download and extract structured data from an SDS PDF."""
        text = await self._get_document_text(pdf_url)
        if not text:
            logger.warning("No text extracted from SDS: %s", pdf_url)
            return SDSData(product_sku=product_sku, pdf_url=pdf_url)

        raw = await self._extract_with_llm(text, SDS_EXTRACTION_PROMPT)
        if not raw:
            return SDSData(product_sku=product_sku, pdf_url=pdf_url)

        return SDSData(
            product_sku=product_sku,
            product_name=raw.get("product_name", ""),
            manufacturer=raw.get("manufacturer", ""),
            revision_date=raw.get("revision_date", ""),
            pdf_url=pdf_url,
            signal_word=raw.get("signal_word", ""),
            hazard_statements=raw.get("hazard_statements") or [],
            precautionary_statements=raw.get("precautionary_statements") or [],
            ghs_pictograms=raw.get("ghs_pictograms") or [],
            cas_numbers=raw.get("cas_numbers") or [],
            first_aid_inhalation=raw.get("first_aid_inhalation", ""),
            first_aid_skin=raw.get("first_aid_skin", ""),
            first_aid_eyes=raw.get("first_aid_eyes", ""),
            first_aid_ingestion=raw.get("first_aid_ingestion", ""),
            storage_conditions=raw.get("storage_conditions", ""),
            handling_precautions=raw.get("handling_precautions", ""),
            exposure_limits=raw.get("exposure_limits") or [],
            ppe_required=raw.get("ppe_required", ""),
            extra_fields=raw.get("extra_fields") or {},
        )

    async def extract_batch(self, documents: list[dict]) -> dict:
        """Extract data from multiple TDS/SDS documents.

        Args:
            documents: List of dicts with keys:
                - url: PDF URL
                - sku: product SKU
                - doc_type: "tds" or "sds"

        Returns:
            {"tds": [TDSData, ...], "sds": [SDSData, ...], "errors": [...]}
        """
        results = {"tds": [], "sds": [], "errors": []}

        for doc in documents:
            url = doc.get("url", "")
            sku = doc.get("sku", "")
            doc_type = doc.get("doc_type", "tds").lower()

            if not url or not sku:
                continue

            try:
                if doc_type == "sds":
                    data = await self.extract_sds(url, sku)
                    results["sds"].append(data)
                else:
                    data = await self.extract_tds(url, sku)
                    results["tds"].append(data)

                logger.info("Extracted %s for %s from %s", doc_type.upper(), sku, url)
            except Exception as e:
                error = f"Failed to extract {doc_type} for {sku} from {url}: {e}"
                logger.error(error)
                results["errors"].append(error)

        logger.info(
            "Batch extraction: %d TDS, %d SDS, %d errors",
            len(results["tds"]), len(results["sds"]), len(results["errors"]),
        )
        return results

    def tds_to_graph_dict(self, tds: TDSData) -> dict:
        """Convert TDSData to dict format for TDSSDSGraphService.create_tds."""
        d = {
            "product_name": tds.product_name,
            "manufacturer": tds.manufacturer,
            "revision_date": tds.revision_date or "unknown",
            "pdf_url": tds.pdf_url,
        }
        # Add non-empty fields
        for attr in ("appearance", "color", "density", "viscosity", "flash_point",
                      "pour_point", "operating_temp_min", "operating_temp_max",
                      "base_oil_type", "thickener_type", "nlgi_grade",
                      "load_capacity", "speed_factor", "corrosion_protection",
                      "water_resistance"):
            val = getattr(tds, attr, "")
            if val:
                d[attr] = val

        if tds.certifications:
            d["certifications"] = ", ".join(tds.certifications)

        d.update(tds.extra_fields)
        return d

    def sds_to_graph_dict(self, sds: SDSData) -> dict:
        """Convert SDSData to dict format for TDSSDSGraphService.create_sds."""
        d = {
            "product_name": sds.product_name,
            "manufacturer": sds.manufacturer,
            "revision_date": sds.revision_date or "unknown",
            "pdf_url": sds.pdf_url,
            "cas_numbers": sds.cas_numbers,
        }
        for attr in ("signal_word", "first_aid_inhalation", "first_aid_skin",
                      "first_aid_eyes", "first_aid_ingestion",
                      "storage_conditions", "handling_precautions", "ppe_required"):
            val = getattr(sds, attr, "")
            if val:
                d[attr] = val

        if sds.hazard_statements:
            d["hazard_statements"] = "; ".join(sds.hazard_statements)
        if sds.precautionary_statements:
            d["precautionary_statements"] = "; ".join(sds.precautionary_statements)
        if sds.ghs_pictograms:
            d["ghs_pictograms"] = ", ".join(sds.ghs_pictograms)

        d.update(sds.extra_fields)
        return d

    # -----------------------------------------------------------------------
    # Internal methods
    # -----------------------------------------------------------------------

    async def _get_document_text(self, url: str) -> str:
        """Get text content from a PDF URL.

        Tries direct download + pdfplumber first.
        Falls back to Firecrawl (which handles JS-rendered and auth-walled PDFs).
        """
        # Try direct download + pdfplumber
        try:
            pdf_bytes = await self._download_file(url)
            text = self._extract_text_pdfplumber(pdf_bytes)
            if text and len(text.strip()) > 100:
                logger.info("Extracted %d chars via pdfplumber from %s", len(text), url)
                return text
        except Exception as e:
            logger.debug("Direct PDF download failed for %s: %s", url, e)

        # Fall back to Firecrawl
        try:
            return await self._fetch_via_firecrawl(url)
        except Exception as e:
            logger.warning("Firecrawl also failed for %s: %s", url, e)
            return ""

    async def _download_file(self, url: str) -> bytes:
        """Download a file directly."""
        timeout = httpx.Timeout(30.0, connect=10.0, read=30.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content

    def _extract_text_pdfplumber(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes using pdfplumber."""
        try:
            import pdfplumber
        except ImportError:
            logger.debug("pdfplumber not installed, skipping local extraction")
            return ""

        all_text = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    all_text.append(text)

                # Also extract tables
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            all_text.append(" | ".join(str(cell or "") for cell in row))

        return "\n".join(all_text)

    async def _fetch_via_firecrawl(self, url: str) -> str:
        """Fetch document content via Firecrawl API."""
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                FIRECRAWL_API_URL,
                headers={
                    "Authorization": f"Bearer {self._firecrawl_key}",
                    "Content-Type": "application/json",
                },
                json={"url": url, "formats": ["markdown"]},
            )
            if resp.status_code != 200:
                logger.warning("Firecrawl failed for %s: HTTP %d", url, resp.status_code)
                return ""
            data = resp.json().get("data", {})
            return data.get("markdown", "")

    async def _extract_with_llm(self, content: str, prompt_template: str) -> dict:
        """Use LLM to extract structured data from document text."""
        if not content or not self._llm:
            return {}

        # Truncate to fit LLM context
        content_truncated = content[:15000]
        prompt = prompt_template.format(content=content_truncated)

        try:
            response = await self._llm.chat(
                messages=[{"role": "user", "content": prompt}],
                task="tds_sds_extraction",
                max_tokens=4096,
                temperature=0.1,
            )

            # Parse JSON from response
            text = response.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text[3:]
                text = text.rsplit("```", 1)[0]

            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            logger.warning("LLM TDS/SDS extraction failed: %s", e)

        return {}
