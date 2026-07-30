# =======================
# Order Intake Service — the validated wedge
# =======================
"""
Converts an unstructured order (email body, pasted PO, WhatsApp message) into
resolved, ERP-ready order lines with a confidence-scored disposition per line:

    touchless     — confident single catalog match; needs no human
    needs_review  — ambiguous; carries candidate matches for a human to pick
    unresolved    — no catalog match found

The touchless rate (touchless lines / total lines) is the pilot KPI: it is what
sales sells on and what renewals are measured against (see the research report,
docs/MARKET_VALIDATION_RESEARCH.md, §3 and §5).

Design constraint (deliberate): this works DETERMINISTICALLY on the Postgres
product catalog alone — regex line extraction + catalog search + confidence
scoring — so it runs with no Anthropic key and no Neo4j. An LLM router and a
knowledge-graph service are OPTIONAL enhancement layers: when present they
improve extraction (messy prose/tables) and resolution (competitor/equivalent
part numbers via the graph), but the wedge is demoable and testable today
without them. This is what makes it "deployable for a design partner" rather
than a slideware dependency on external services.
"""

from __future__ import annotations

import json
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

# A line is touchless when our confidence in the single resolved SKU is at least
# this high. Calibrated conservatively: published mature deployments average
# ~67% touchless (Esker), so the bar errs toward routing to humans over
# committing a wrong line, which is the costlier error in distribution.
TOUCHLESS_THRESHOLD = 0.80

# Confidence assigned to each resolution outcome.
CONFIDENCE_EXACT_SKU = 0.98       # token matched a catalog SKU exactly
CONFIDENCE_SINGLE_MATCH = 0.85    # one strong catalog search hit
CONFIDENCE_GRAPH_EQUIVALENT = 0.90  # resolved via knowledge-graph equivalence
CONFIDENCE_AMBIGUOUS = 0.50       # several plausible matches → needs_review
CONFIDENCE_NONE = 0.0             # no match → unresolved

# A token that looks like a part/SKU: contains a digit and is reasonably long,
# or is hyphenated alphanumerics (e.g. BRG-6205-2RS, 6205-2RS, 1/2-13).
_PART_TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9\-/\.]{2,}")

# Quantity extraction patterns, tried in order. Each captures (qty, remainder).
_QTY_PATTERNS = [
    re.compile(r"^\s*(\d+)\s*[xX]\s+(.+)$"),                                   # 10x BRG-6205
    re.compile(r"^\s*(?:qty|quantity)[:\s]+(\d+)\s*(?:of\s+|x\s+)?(.+)$", re.I),  # qty 5 of gate valve
    re.compile(r"^\s*(\d+)\s*(?:ea|each|pcs?|pieces?|units?|nos?)\.?\s+(?:of\s+)?(.+)$", re.I),  # 2 ea SKF 6205
    re.compile(r"^\s*(?:need|order|send|want|please\s+send)\s+(\d+)\s+(.+)$", re.I),  # need 100 hex bolts
    re.compile(r"^\s*[-*•]?\s*(\d+)\s+(.+)$"),                                  # 5 gate valves / - 5 gate valves
    re.compile(r"^(.+?)\s*[xX×]\s*(\d+)\s*$"),                                  # BRG-6205 x10  (qty is group 2)
]

# Fallback for a quantity appearing mid-line (e.g. "please send 4x PMP-200").
# Requires the number to start at a word boundary so it never fires inside a
# part token like "VLV100EA".
_MIDLINE_QTY_RE = re.compile(
    r"(?:^|\s)(\d+)\s*(?:[xX×]|ea|each|pcs?|pieces?|units?|nos?)\b", re.I,
)

# Boilerplate / greeting lines that are never order lines.
_BOILERPLATE_RE = re.compile(
    r"^\s*(hi|hello|hey|dear|thanks|thank you|regards|best|please|kindly|"
    r"following|below|order|po\b|purchase order|attached|see|find|here)\b",
    re.I,
)


class OrderIntakeService:
    """Parse unstructured orders into resolved lines and commit them to draft orders."""

    def __init__(self, db_manager, product_service, pricing_service,
                 customer_service, order_service, logger,
                 llm_router=None, graph_service=None,
                 erp_sync=None, auto_push_erp=False):
        self.db = db_manager
        self.products = product_service
        self.pricing = pricing_service
        self.customers = customer_service
        self.orders = order_service
        self.logger = logger
        # Optional enhancement layers — degrade gracefully when absent.
        self.llm = llm_router
        self.graph = graph_service
        # Optional ERP write-back: when configured, a committed order is pushed
        # to the ERP so intake lands a real order end-to-end.
        self.erp_sync = erp_sync
        self.auto_push_erp = auto_push_erp

    # ------------------------------------------------------------------
    # Parse
    # ------------------------------------------------------------------

    async def parse_order(self, raw_text: str, customer_external_id: Optional[str] = None,
                          source_channel: str = "web",
                          persist: bool = True) -> Optional[Dict[str, Any]]:
        """
        Parse raw order text into resolved lines. Returns the run dict with
        per-line dispositions and the touchless rate. Persists by default.
        """
        if not raw_text or not raw_text.strip():
            return {"error": "Empty order text"}

        # Resolve the customer (so pricing is contract-aware) if we know them.
        customer = None
        if customer_external_id and self.customers:
            customer = await self.customers.get_customer_by_external_id(customer_external_id)

        candidates = self._extract_candidate_lines(raw_text)
        extraction_method = "rules"

        resolved_lines: List[Dict[str, Any]] = []
        for idx, (raw_line, qty) in enumerate(candidates, start=1):
            line = await self._resolve_line(raw_line, qty, customer)
            line["line_number"] = idx
            resolved_lines.append(line)

        touchless = sum(1 for ln in resolved_lines if ln["disposition"] == "touchless")
        review = sum(1 for ln in resolved_lines if ln["disposition"] == "needs_review")
        unresolved = sum(1 for ln in resolved_lines if ln["disposition"] == "unresolved")
        total = len(resolved_lines)
        touchless_rate = round(touchless / total, 4) if total else 0.0

        run = {
            "id": str(uuid.uuid4()),
            "source_channel": source_channel,
            "raw_text": raw_text,
            "customer_id": customer["id"] if customer else None,
            "customer_external_id": customer_external_id,
            "status": "parsed",
            "line_count": total,
            "touchless_count": touchless,
            "review_count": review,
            "unresolved_count": unresolved,
            "touchless_rate": touchless_rate,
            "extraction_method": extraction_method,
            "lines": resolved_lines,
        }

        if persist and self.db.pool:
            await self._persist_run(run)

        return run

    # ------------------------------------------------------------------
    # Line extraction (deterministic)
    # ------------------------------------------------------------------

    def _extract_candidate_lines(self, raw_text: str) -> List[Tuple[str, float]]:
        """
        Pull (line_text, quantity) candidates from raw order text. A line is a
        candidate if it has an explicit quantity OR contains a part-like token;
        pure prose/greeting lines are skipped so they don't pollute the
        touchless denominator.
        """
        candidates: List[Tuple[str, float]] = []
        for raw in raw_text.splitlines():
            line = raw.strip()
            if not line or len(line) < 3:
                continue

            qty, remainder = self._extract_quantity(line)

            has_qty = qty is not None
            body = re.sub(r"\s+", " ", (remainder if remainder else line)).strip()
            has_part_token = self._has_part_token(body)

            # Skip boilerplate that carries neither a quantity nor a part token.
            if not has_qty and not has_part_token:
                continue
            # Skip greeting/boilerplate lines that lack a part token even if they
            # happen to contain a stray number (e.g. "thanks, order 12345 team").
            if _BOILERPLATE_RE.match(line) and not has_part_token:
                continue

            candidates.append((body.strip(), float(qty) if qty else 1.0))
        return candidates

    @staticmethod
    def _extract_quantity(line: str) -> Tuple[Optional[int], Optional[str]]:
        """Return (quantity, remaining_text) or (None, None) if no quantity found."""
        for i, pattern in enumerate(_QTY_PATTERNS):
            m = pattern.match(line)
            if not m:
                continue
            # The trailing-quantity pattern (last one) captures qty in group 2.
            if i == len(_QTY_PATTERNS) - 1:
                return int(m.group(2)), m.group(1)
            return int(m.group(1)), m.group(2)
        # Fallback: a quantity token mid-line (after a greeting/filler prefix).
        m = _MIDLINE_QTY_RE.search(line)
        if m:
            remainder = (line[:m.start()] + " " + line[m.end():]).strip()
            return int(m.group(1)), remainder or line
        return None, None

    @staticmethod
    def _has_part_token(text: str) -> bool:
        """A line is an order-line candidate only if it carries a SKU-like token
        (digit-bearing or hyphenated/slashed). Pure prose/greetings do not."""
        for tok in _PART_TOKEN_RE.findall(text):
            if any(c.isdigit() for c in tok) and len(tok) >= 3:
                return True
            if "-" in tok or "/" in tok:
                return True
        return False

    @staticmethod
    def _part_tokens(text: str) -> List[str]:
        """Candidate SKU-ish tokens, longest first (most specific)."""
        toks = [t for t in _PART_TOKEN_RE.findall(text)
                if (any(c.isdigit() for c in t) and len(t) >= 4) or "-" in t]
        return sorted(set(toks), key=len, reverse=True)

    # ------------------------------------------------------------------
    # Line resolution
    # ------------------------------------------------------------------

    async def _resolve_line(self, raw_line: str, qty: float,
                            customer: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Resolve one extracted line to a catalog SKU with a confidence/disposition."""
        base = {
            "raw_text": raw_line,
            "extracted_quantity": qty,
            "resolved_product_id": None,
            "resolved_sku": None,
            "resolved_name": None,
            "unit_price": None,
            "confidence": CONFIDENCE_NONE,
            "disposition": "unresolved",
            "candidates": [],
        }

        if not self.products:
            return base

        # 1) Exact SKU match on any part-like token.
        for token in self._part_tokens(raw_line):
            product = await self.products.get_product_by_sku(token.upper())
            if product:
                return await self._finalize(base, product, qty, customer,
                                            CONFIDENCE_EXACT_SKU)

        # 2) Knowledge-graph equivalence (optional): a competitor/legacy part
        #    number that maps to one of our SKUs via EQUIVALENT_TO.
        if self.graph:
            graph_hit = await self._resolve_via_graph(raw_line)
            if graph_hit:
                product = await self.products.get_product_by_sku(graph_hit.upper())
                if product:
                    return await self._finalize(base, product, qty, customer,
                                                CONFIDENCE_GRAPH_EQUIVALENT)

        # 3) Catalog search. The catalog does a single contiguous ILIKE, so we
        #    try progressively looser query forms — full cleaned phrase, then the
        #    most distinctive part token, then the leading keywords — and take
        #    the first form that returns hits.
        results = await self._search_catalog(raw_line)
        if len(results) == 1:
            return await self._finalize(base, results[0], qty, customer,
                                        CONFIDENCE_SINGLE_MATCH)
        if len(results) > 1:
            base["confidence"] = CONFIDENCE_AMBIGUOUS
            base["disposition"] = "needs_review"
            base["candidates"] = [
                {"product_id": r["id"], "sku": r["sku"], "name": r["name"]}
                for r in results[:5]
            ]
            return base

        return base

    async def _search_catalog(self, raw_line: str) -> List[Dict[str, Any]]:
        """Try several query forms; return the first non-empty result set."""
        query_forms: List[str] = []
        cleaned = self._clean_query(raw_line)
        if cleaned:
            query_forms.append(cleaned)
        for token in self._part_tokens(raw_line):
            query_forms.append(token)
        words = [w for w in self._clean_query(raw_line).split() if len(w) > 2]
        if words:
            query_forms.append(" ".join(words[:3]))

        seen = set()
        for form in query_forms:
            key = form.lower().strip()
            if not key or key in seen:
                continue
            seen.add(key)
            results, _ = await self.products.search_products(query=form, page_size=5)
            if results:
                return results
        return []

    async def _finalize(self, base: Dict[str, Any], product: Dict[str, Any],
                        qty: float, customer: Optional[Dict[str, Any]],
                        confidence: float) -> Dict[str, Any]:
        base = dict(base)
        base["resolved_product_id"] = product["id"]
        base["resolved_sku"] = product["sku"]
        base["resolved_name"] = product["name"]
        base["confidence"] = confidence
        base["disposition"] = "touchless" if confidence >= TOUCHLESS_THRESHOLD else "needs_review"

        if self.pricing:
            customer_id = customer["id"] if customer else None
            try:
                price = await self.pricing.get_price(product["id"], customer_id, qty)
                base["unit_price"] = price.get("customer_price")
            except Exception as e:
                self.logger.warning(f"Pricing lookup failed for {product['sku']}: {e}")
        return base

    async def _resolve_via_graph(self, raw_line: str) -> Optional[str]:
        """Use the knowledge graph to map a part number to one of our SKUs."""
        for token in self._part_tokens(raw_line):
            try:
                matches = await self.graph.resolve_part(token.upper())
                if matches:
                    return matches[0].get("sku")
            except Exception:
                continue
        return None

    @staticmethod
    def _clean_query(raw_line: str) -> str:
        """Strip filler words so catalog search keys on the meaningful terms."""
        stop = {"of", "the", "a", "an", "please", "send", "need", "order", "want",
                "ea", "each", "pcs", "pieces", "units", "nos", "qty", "quantity",
                "and", "for", "with", "x"}
        words = [w for w in re.split(r"[\s,;]+", raw_line) if w]
        kept = [w for w in words if w.lower() not in stop]
        return " ".join(kept[:6]).strip()

    # ------------------------------------------------------------------
    # Commit → draft order
    # ------------------------------------------------------------------

    async def commit_run(self, run_id: str,
                         lines: Optional[List[Dict[str, Any]]] = None,
                         created_by: str = "intake") -> Optional[Dict[str, Any]]:
        """
        Create a draft order from a parsed run. If `lines` is provided (the
        human-confirmed set from the review UI: [{product_id, quantity,
        unit_price?}]), those are used; otherwise all touchless lines are used.
        """
        if not self.db.pool:
            return None

        run = await self.get_run(run_id)
        if not run:
            return {"error": "Intake run not found"}
        if run["status"] == "committed":
            return {"error": "Intake run already committed"}
        if not run.get("customer_id"):
            return {"error": "Cannot commit an order without a known customer"}

        if lines is None:
            lines = [
                {"product_id": ln["resolved_product_id"],
                 "quantity": ln["extracted_quantity"],
                 "unit_price": ln["unit_price"]}
                for ln in run["lines"]
                if ln["disposition"] == "touchless" and ln["resolved_product_id"]
            ]

        if not lines:
            return {"error": "No resolved lines to commit"}

        order = await self.orders.create_order(
            {"customer_id": run["customer_id"],
             "notes": f"Created from AI order intake {run_id}",
             "lines": lines},
            created_by=created_by,
        )
        if not order or order.get("error"):
            return order or {"error": "Order creation failed"}

        async with self.db.pool.acquire() as conn:
            await conn.execute(
                """UPDATE intake_runs SET status = 'committed',
                   committed_order_id = $1, committed_at = NOW() WHERE id = $2""",
                order["id"], run_id,
            )
        self.logger.info(f"Intake run {run_id} committed to order {order['order_number']}")

        # Push to the ERP end-to-end when configured. A sync failure is
        # attached to the response but never fails the commit — the captured
        # order is already safe in our system and the push is retryable.
        if self.erp_sync and self.auto_push_erp:
            try:
                order["erp"] = await self.erp_sync.push_order(order["id"])
            except Exception as e:
                self.logger.error(f"Auto ERP push failed for {order['id']}: {e}")
                order["erp"] = {"status": "failed", "error": str(e)}

        return order

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    async def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        if not self.db.pool:
            return None
        try:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow("SELECT * FROM intake_runs WHERE id = $1", run_id)
                if not row:
                    return None
                run = self._row_to_run(row)
                lines = await conn.fetch(
                    "SELECT * FROM intake_lines WHERE run_id = $1 ORDER BY line_number",
                    run_id,
                )
                run["lines"] = [self._row_to_line(ln) for ln in lines]
                return run
        except Exception as e:
            self.logger.error(f"Failed to get intake run: {e}")
            return None

    async def list_runs(self, page: int = 1, page_size: int = 25) -> Tuple[List[Dict[str, Any]], int]:
        if not self.db.pool:
            return [], 0
        try:
            offset = (page - 1) * page_size
            async with self.db.pool.acquire() as conn:
                total = await conn.fetchval("SELECT COUNT(*) FROM intake_runs")
                rows = await conn.fetch(
                    "SELECT * FROM intake_runs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
                    page_size, offset,
                )
            return [self._row_to_run(r) for r in rows], total or 0
        except Exception as e:
            self.logger.error(f"Failed to list intake runs: {e}")
            return [], 0

    async def touchless_summary(self) -> Dict[str, Any]:
        """The pilot KPI: aggregate touchless rate across all runs, plus trend."""
        if not self.db.pool:
            return {"runs": 0, "total_lines": 0, "touchless_lines": 0, "touchless_rate": 0,
                    "review_lines": 0, "unresolved_lines": 0, "committed_orders": 0, "by_day": []}
        try:
            async with self.db.pool.acquire() as conn:
                agg = await conn.fetchrow(
                    """
                    SELECT COUNT(*) AS runs,
                           COALESCE(SUM(line_count), 0) AS total_lines,
                           COALESCE(SUM(touchless_count), 0) AS touchless_lines,
                           COALESCE(SUM(review_count), 0) AS review_lines,
                           COALESCE(SUM(unresolved_count), 0) AS unresolved_lines,
                           COUNT(*) FILTER (WHERE status = 'committed') AS committed_orders
                    FROM intake_runs
                    """
                )
                by_day = await conn.fetch(
                    """
                    SELECT date_trunc('day', created_at)::date AS day,
                           SUM(line_count) AS lines,
                           SUM(touchless_count) AS touchless
                    FROM intake_runs
                    GROUP BY day ORDER BY day DESC LIMIT 30
                    """
                )
            total_lines = int(agg["total_lines"] or 0)
            touchless_lines = int(agg["touchless_lines"] or 0)
            return {
                "runs": int(agg["runs"] or 0),
                "total_lines": total_lines,
                "touchless_lines": touchless_lines,
                "review_lines": int(agg["review_lines"] or 0),
                "unresolved_lines": int(agg["unresolved_lines"] or 0),
                "touchless_rate": round(touchless_lines / total_lines, 4) if total_lines else 0.0,
                "committed_orders": int(agg["committed_orders"] or 0),
                "by_day": [
                    {"day": r["day"].isoformat(),
                     "lines": int(r["lines"] or 0),
                     "touchless": int(r["touchless"] or 0),
                     "touchless_rate": round(int(r["touchless"] or 0) / int(r["lines"]), 4)
                     if r["lines"] else 0.0}
                    for r in by_day
                ],
            }
        except Exception as e:
            self.logger.error(f"Failed to compute touchless summary: {e}")
            return {"runs": 0, "total_lines": 0, "touchless_lines": 0, "touchless_rate": 0,
                    "review_lines": 0, "unresolved_lines": 0, "committed_orders": 0, "by_day": []}

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------

    async def _persist_run(self, run: Dict[str, Any]) -> None:
        try:
            async with self.db.pool.acquire() as conn:
                async with conn.transaction():
                    await conn.execute(
                        """
                        INSERT INTO intake_runs
                            (id, source_channel, raw_text, customer_id,
                             customer_external_id, status, line_count,
                             touchless_count, review_count, unresolved_count,
                             touchless_rate, extraction_method)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                        """,
                        run["id"], run["source_channel"], run["raw_text"],
                        run["customer_id"], run["customer_external_id"],
                        run["status"], run["line_count"], run["touchless_count"],
                        run["review_count"], run["unresolved_count"],
                        run["touchless_rate"], run["extraction_method"],
                    )
                    for ln in run["lines"]:
                        await conn.execute(
                            """
                            INSERT INTO intake_lines
                                (id, run_id, line_number, raw_text,
                                 extracted_quantity, resolved_product_id,
                                 resolved_sku, resolved_name, unit_price,
                                 confidence, disposition, candidates)
                            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                            """,
                            str(uuid.uuid4()), run["id"], ln["line_number"],
                            ln["raw_text"], ln["extracted_quantity"],
                            ln["resolved_product_id"], ln["resolved_sku"],
                            ln["resolved_name"], ln["unit_price"],
                            ln["confidence"], ln["disposition"],
                            json.dumps(ln["candidates"]),
                        )
        except Exception as e:
            self.logger.error(f"Failed to persist intake run: {e}")

    @staticmethod
    def _row_to_run(row) -> Dict[str, Any]:
        d = dict(row)
        d["id"] = str(d["id"])
        if d.get("customer_id"):
            d["customer_id"] = str(d["customer_id"])
        if d.get("committed_order_id"):
            d["committed_order_id"] = str(d["committed_order_id"])
        if d.get("touchless_rate") is not None:
            d["touchless_rate"] = float(d["touchless_rate"])
        for key in ("created_at", "committed_at"):
            if d.get(key):
                d[key] = d[key].isoformat()
        return d

    @staticmethod
    def _row_to_line(row) -> Dict[str, Any]:
        d = dict(row)
        d["id"] = str(d["id"])
        d["run_id"] = str(d["run_id"])
        if d.get("resolved_product_id"):
            d["resolved_product_id"] = str(d["resolved_product_id"])
        for key in ("extracted_quantity", "unit_price", "confidence"):
            if d.get(key) is not None:
                d[key] = float(d[key])
        if isinstance(d.get("candidates"), str):
            d["candidates"] = json.loads(d["candidates"])
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()
        return d
