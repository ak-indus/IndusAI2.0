# =======================
# Validation Service — Customer Feedback & Pilot Leads
# =======================
"""
The customer-validation loop, built into the product:

- Feedback: every page carries a lightweight 1-5 score + comment widget so
  design partners rate workflows where they use them. The summary endpoint
  gives a per-page satisfaction view that drives the build roadmap.
- Pilot leads: prospects who run the ROI calculator (or any demo page) can
  request a pilot. Leads carry the inputs they entered, so sales follow-up
  starts from the prospect's own numbers.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional


LEAD_STATUSES = ("new", "contacted", "qualified", "pilot", "customer", "lost")


class ValidationService:
    """Stores and aggregates in-app feedback and pilot-request leads."""

    def __init__(self, db_manager, logger):
        self.db = db_manager
        self.logger = logger

    # ------------------------------------------------------------------
    # Feedback
    # ------------------------------------------------------------------

    async def submit_feedback(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.db.pool:
            return None
        try:
            feedback_id = str(uuid.uuid4())
            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO product_feedback
                        (id, score, comment, page, persona, contact_email, source)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                    """,
                    feedback_id, int(data["score"]), data.get("comment"),
                    data.get("page"), data.get("persona"),
                    data.get("contact_email"), data.get("source", "in_app"),
                )
                row = await conn.fetchrow(
                    "SELECT * FROM product_feedback WHERE id = $1", feedback_id,
                )
            return self._row_to_feedback(row)
        except Exception as e:
            self.logger.error(f"Failed to submit feedback: {e}")
            return None

    async def list_feedback(self, page: int = 1,
                            page_size: int = 25) -> tuple[List[Dict[str, Any]], int]:
        if not self.db.pool:
            return [], 0
        try:
            offset = (page - 1) * page_size
            async with self.db.pool.acquire() as conn:
                total = await conn.fetchval("SELECT COUNT(*) FROM product_feedback")
                rows = await conn.fetch(
                    """
                    SELECT * FROM product_feedback
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2
                    """,
                    page_size, offset,
                )
            return [self._row_to_feedback(r) for r in rows], total or 0
        except Exception as e:
            self.logger.error(f"Failed to list feedback: {e}")
            return [], 0

    async def feedback_summary(self) -> Dict[str, Any]:
        """Aggregate satisfaction metrics: overall and per page."""
        if not self.db.pool:
            return {"total": 0, "average_score": 0, "by_page": []}
        try:
            async with self.db.pool.acquire() as conn:
                overall = await conn.fetchrow(
                    """
                    SELECT COUNT(*) as total, AVG(score) as average_score,
                           COUNT(*) FILTER (WHERE score >= 4) as promoters,
                           COUNT(*) FILTER (WHERE score <= 2) as detractors
                    FROM product_feedback
                    """
                )
                by_page = await conn.fetch(
                    """
                    SELECT page, COUNT(*) as count, AVG(score) as average_score
                    FROM product_feedback
                    WHERE page IS NOT NULL
                    GROUP BY page
                    ORDER BY count DESC
                    """
                )
            total = overall["total"] or 0
            return {
                "total": total,
                "average_score": round(float(overall["average_score"] or 0), 2),
                "promoters": overall["promoters"] or 0,
                "detractors": overall["detractors"] or 0,
                "by_page": [
                    {
                        "page": r["page"],
                        "count": r["count"],
                        "average_score": round(float(r["average_score"] or 0), 2),
                    }
                    for r in by_page
                ],
            }
        except Exception as e:
            self.logger.error(f"Failed to summarize feedback: {e}")
            return {"total": 0, "average_score": 0, "by_page": []}

    # ------------------------------------------------------------------
    # Pilot Leads
    # ------------------------------------------------------------------

    async def submit_lead(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.db.pool:
            return None
        try:
            lead_id = str(uuid.uuid4())
            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO pilot_leads
                        (id, company, contact_name, email, phone, role,
                         monthly_order_lines, pain_points,
                         estimated_annual_savings, source)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                    """,
                    lead_id, data["company"], data.get("contact_name"),
                    data["email"], data.get("phone"), data.get("role"),
                    data.get("monthly_order_lines"), data.get("pain_points"),
                    data.get("estimated_annual_savings"),
                    data.get("source", "roi_calculator"),
                )
                row = await conn.fetchrow(
                    "SELECT * FROM pilot_leads WHERE id = $1", lead_id,
                )
            self.logger.info(f"Pilot lead captured: {data['company']}")
            return self._row_to_lead(row)
        except Exception as e:
            self.logger.error(f"Failed to submit lead: {e}")
            return None

    async def list_leads(self, status: Optional[str] = None, page: int = 1,
                         page_size: int = 25) -> tuple[List[Dict[str, Any]], int]:
        if not self.db.pool:
            return [], 0
        try:
            where = "WHERE status = $3" if status else ""
            params: list = [page_size, (page - 1) * page_size]
            if status:
                params.append(status)
            async with self.db.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"SELECT COUNT(*) FROM pilot_leads {where}",
                    *([status] if status else []),
                )
                rows = await conn.fetch(
                    f"""
                    SELECT * FROM pilot_leads {where}
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2
                    """,
                    *params,
                )
            return [self._row_to_lead(r) for r in rows], total or 0
        except Exception as e:
            self.logger.error(f"Failed to list leads: {e}")
            return [], 0

    async def update_lead_status(self, lead_id: str,
                                 status: str) -> Optional[Dict[str, Any]]:
        if status not in LEAD_STATUSES:
            return {"error": f"Invalid status. Must be one of: {', '.join(LEAD_STATUSES)}"}
        if not self.db.pool:
            return None
        try:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    UPDATE pilot_leads SET status = $1, updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                    """,
                    status, lead_id,
                )
            if not row:
                return None
            return self._row_to_lead(row)
        except Exception as e:
            self.logger.error(f"Failed to update lead status: {e}")
            return None

    async def lead_funnel_summary(self) -> Dict[str, Any]:
        """Pipeline counts by status — the validation funnel at a glance."""
        if not self.db.pool:
            return {"total": 0, "by_status": {}}
        try:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT status, COUNT(*) as count FROM pilot_leads GROUP BY status"
                )
                pipeline_value = await conn.fetchval(
                    """
                    SELECT SUM(estimated_annual_savings) FROM pilot_leads
                    WHERE status NOT IN ('lost')
                    """
                )
            by_status = {r["status"]: r["count"] for r in rows}
            return {
                "total": sum(by_status.values()),
                "by_status": by_status,
                "open_pipeline_estimated_savings": float(pipeline_value or 0),
            }
        except Exception as e:
            self.logger.error(f"Failed to summarize lead funnel: {e}")
            return {"total": 0, "by_status": {}}

    # ------------------------------------------------------------------
    # Row mappers
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_feedback(row) -> Dict[str, Any]:
        d = dict(row)
        d["id"] = str(d["id"])
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()
        return d

    @staticmethod
    def _row_to_lead(row) -> Dict[str, Any]:
        d = dict(row)
        d["id"] = str(d["id"])
        if d.get("estimated_annual_savings") is not None:
            d["estimated_annual_savings"] = float(d["estimated_annual_savings"])
        for key in ("created_at", "updated_at"):
            if d.get(key):
                d[key] = d[key].isoformat()
        return d
