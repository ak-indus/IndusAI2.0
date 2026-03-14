"""Master orchestrator for bearing manufacturer scraping.

Coordinates SKF, NSK, and FAG scrapers, TDS/SDS extraction, and feeds
results into the existing ingestion pipeline (normalize → resolve → build).
"""

import logging
from dataclasses import dataclass, field

from services.ingestion.bearing_scraper import (
    BearingProduct,
    CrossReference,
    FAGScraper,
    NSKScraper,
    SKFScraper,
)
from services.ingestion.tds_sds_extractor import TDSSDSExtractor

logger = logging.getLogger(__name__)


@dataclass
class BearingScrapeResult:
    """Summary of a bearing scrape orchestration run."""
    bearings_scraped: int = 0
    cross_refs_found: int = 0
    tds_extracted: int = 0
    sds_extracted: int = 0
    bearings_ingested: int = 0
    cross_refs_created: int = 0
    errors: list[str] = field(default_factory=list)


class BearingOrchestrator:
    """Orchestrate scraping of bearing manufacturer catalogs.

    Usage:
        orchestrator = BearingOrchestrator(
            firecrawl_api_key="...",
            llm_router=claude_client,
            graph_service=graph_svc,
            tds_sds_service=tds_sds_svc,
        )
        result = await orchestrator.run_full_scrape(skf_urls=[...], nsk_urls=[...])
    """

    def __init__(self, firecrawl_api_key: str, llm_router=None,
                 graph_service=None, tds_sds_service=None):
        self._firecrawl_key = firecrawl_api_key
        self._llm = llm_router
        self._graph = graph_service
        self._tds_sds = tds_sds_service

        # Initialize scrapers
        self._skf = SKFScraper(firecrawl_api_key, llm_router)
        self._nsk = NSKScraper(firecrawl_api_key, llm_router)
        self._fag = FAGScraper(firecrawl_api_key, llm_router)
        self._extractor = TDSSDSExtractor(firecrawl_api_key, llm_router)

    async def run_full_scrape(
        self,
        skf_urls: list[str] | None = None,
        nsk_urls: list[str] | None = None,
        nsk_crossref_urls: list[str] | None = None,
        fag_urls: list[str] | None = None,
        fag_crossref_urls: list[str] | None = None,
        extract_tds: bool = True,
    ) -> BearingScrapeResult:
        """Run a full scrape across all configured manufacturers.

        Args:
            skf_urls: SKF catalog/listing page URLs to scrape.
            nsk_urls: NSK catalog/listing page URLs to scrape.
            nsk_crossref_urls: NSK interchange/cross-reference page URLs.
            fag_urls: FAG/Schaeffler catalog page URLs to scrape.
            fag_crossref_urls: FAG cross-reference page URLs.
            extract_tds: Whether to extract TDS/SDS from discovered PDF links.
        """
        result = BearingScrapeResult()
        all_bearings: list[BearingProduct] = []
        all_crossrefs: list[CrossReference] = []

        # --- SKF ---
        for url in (skf_urls or []):
            try:
                bearings = await self._skf.scrape_product_listing(url)
                all_bearings.extend(bearings)
                logger.info("SKF: %d bearings from %s", len(bearings), url)
            except Exception as e:
                error = f"SKF scrape failed for {url}: {e}"
                logger.error(error)
                result.errors.append(error)

        # --- NSK ---
        for url in (nsk_urls or []):
            try:
                bearings = await self._nsk.scrape_product_listing(url)
                all_bearings.extend(bearings)
                logger.info("NSK: %d bearings from %s", len(bearings), url)
            except Exception as e:
                error = f"NSK scrape failed for {url}: {e}"
                logger.error(error)
                result.errors.append(error)

        for url in (nsk_crossref_urls or []):
            try:
                refs = await self._nsk.scrape_interchange_table(url)
                all_crossrefs.extend(refs)
                logger.info("NSK cross-refs: %d from %s", len(refs), url)
            except Exception as e:
                error = f"NSK cross-ref failed for {url}: {e}"
                logger.error(error)
                result.errors.append(error)

        # --- FAG ---
        for url in (fag_urls or []):
            try:
                bearings = await self._fag.scrape_product_listing(url)
                all_bearings.extend(bearings)
                logger.info("FAG: %d bearings from %s", len(bearings), url)
            except Exception as e:
                error = f"FAG scrape failed for {url}: {e}"
                logger.error(error)
                result.errors.append(error)

        for url in (fag_crossref_urls or []):
            try:
                refs = await self._fag.scrape_cross_references(url)
                all_crossrefs.extend(refs)
                logger.info("FAG cross-refs: %d from %s", len(refs), url)
            except Exception as e:
                error = f"FAG cross-ref failed for {url}: {e}"
                logger.error(error)
                result.errors.append(error)

        result.bearings_scraped = len(all_bearings)
        result.cross_refs_found = len(all_crossrefs)

        # --- Ingest bearings into graph ---
        if self._graph and all_bearings:
            ingested = await self._ingest_bearings(all_bearings)
            result.bearings_ingested = ingested

        # --- Create cross-reference edges ---
        if self._graph and all_crossrefs:
            created = await self._create_cross_references(all_crossrefs)
            result.cross_refs_created = created

        # --- Extract TDS/SDS ---
        if extract_tds and self._tds_sds:
            tds_count, sds_count = await self._extract_documents(all_bearings)
            result.tds_extracted = tds_count
            result.sds_extracted = sds_count

        logger.info(
            "Bearing scrape complete: %d bearings, %d cross-refs, "
            "%d TDS, %d SDS, %d errors",
            result.bearings_scraped, result.cross_refs_found,
            result.tds_extracted, result.sds_extracted, len(result.errors),
        )
        return result

    async def scrape_skf(self, urls: list[str]) -> list[BearingProduct]:
        """Scrape only SKF URLs and return bearing data (no graph writes)."""
        bearings = []
        for url in urls:
            try:
                bearings.extend(await self._skf.scrape_product_listing(url))
            except Exception as e:
                logger.error("SKF scrape failed for %s: %s", url, e)
        return bearings

    async def scrape_nsk(self, urls: list[str],
                         crossref_urls: list[str] | None = None
                         ) -> tuple[list[BearingProduct], list[CrossReference]]:
        """Scrape NSK URLs and optionally cross-reference pages."""
        bearings = []
        crossrefs = []
        for url in urls:
            try:
                bearings.extend(await self._nsk.scrape_product_listing(url))
            except Exception as e:
                logger.error("NSK scrape failed for %s: %s", url, e)
        for url in (crossref_urls or []):
            try:
                crossrefs.extend(await self._nsk.scrape_interchange_table(url))
            except Exception as e:
                logger.error("NSK cross-ref failed for %s: %s", url, e)
        return bearings, crossrefs

    async def scrape_fag(self, urls: list[str],
                         crossref_urls: list[str] | None = None
                         ) -> tuple[list[BearingProduct], list[CrossReference]]:
        """Scrape FAG/Schaeffler URLs and optionally cross-reference pages."""
        bearings = []
        crossrefs = []
        for url in urls:
            try:
                bearings.extend(await self._fag.scrape_product_listing(url))
            except Exception as e:
                logger.error("FAG scrape failed for %s: %s", url, e)
        for url in (crossref_urls or []):
            try:
                crossrefs.extend(await self._fag.scrape_cross_references(url))
            except Exception as e:
                logger.error("FAG cross-ref failed for %s: %s", url, e)
        return bearings, crossrefs

    # -----------------------------------------------------------------------
    # Graph integration
    # -----------------------------------------------------------------------

    async def _ingest_bearings(self, bearings: list[BearingProduct]) -> int:
        """Write bearing products to the Neo4j graph."""
        count = 0
        seen = set()

        for b in bearings:
            if not b.part_number or b.part_number in seen:
                continue
            seen.add(b.part_number)

            try:
                # Determine the right scraper to get ingestion dict
                scraper = self._skf  # default; all share the same method
                ingestion_dict = scraper.bearing_to_ingestion_dict(b)

                await self._graph.upsert_part(
                    sku=ingestion_dict["part_number"],
                    name=ingestion_dict["name"],
                    description=ingestion_dict["description"],
                    category=ingestion_dict["category"],
                    manufacturer=ingestion_dict["manufacturer"],
                    specs=ingestion_dict.get("specifications"),
                )
                count += 1
            except Exception as e:
                logger.error("Failed to ingest bearing %s: %s", b.part_number, e)

        logger.info("Ingested %d / %d unique bearings", count, len(seen))
        return count

    async def _create_cross_references(self, crossrefs: list[CrossReference]) -> int:
        """Create cross-reference edges in Neo4j."""
        count = 0
        for ref in crossrefs:
            try:
                # Ensure both parts exist
                await self._graph.upsert_part(
                    sku=ref.source_sku,
                    name=f"{ref.source_manufacturer} {ref.source_sku}",
                    manufacturer=ref.source_manufacturer,
                    category="bearing",
                )
                await self._graph.upsert_part(
                    sku=ref.target_sku,
                    name=f"{ref.target_manufacturer} {ref.target_sku}",
                    manufacturer=ref.target_manufacturer,
                    category="bearing",
                )
                await self._graph.add_cross_reference(
                    sku_a=ref.source_sku,
                    sku_b=ref.target_sku,
                    ref_type=ref.ref_type,
                    confidence=ref.confidence,
                    source="bearing_scraper",
                )
                count += 1
            except Exception as e:
                logger.error(
                    "Failed to create cross-ref %s→%s: %s",
                    ref.source_sku, ref.target_sku, e,
                )

        logger.info("Created %d / %d cross-references", count, len(crossrefs))
        return count

    async def _extract_documents(self, bearings: list[BearingProduct]) -> tuple[int, int]:
        """Extract TDS/SDS PDFs discovered during scraping."""
        tds_count = 0
        sds_count = 0

        for b in bearings:
            if not b.tds_url:
                continue

            try:
                tds_data = await self._extractor.extract_tds(b.tds_url, b.part_number)
                graph_dict = self._extractor.tds_to_graph_dict(tds_data)
                await self._tds_sds.create_tds(b.part_number, graph_dict)
                tds_count += 1
            except Exception as e:
                logger.error("TDS extraction failed for %s: %s", b.part_number, e)

        logger.info("Extracted %d TDS, %d SDS documents", tds_count, sds_count)
        return tds_count, sds_count
