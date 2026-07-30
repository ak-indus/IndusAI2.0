# =======================
# ERP Sync Service
# =======================
"""
Pushes committed orders into the customer's ERP through a pluggable connector
(Prophet 21 in production, MockERPConnector for demo/dev/tests) and records
every attempt for auditability and retry.

The order-intake commit calls this so the end-to-end story is real: an
unstructured order is parsed, the confident lines are committed to a draft
order, and that order lands in the ERP — with the ERP order number stamped
back onto our record. A push failure never rolls back the internal order; it
is logged as `failed` and can be retried, because losing the captured order
would be worse than a deferred sync.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional


class ERPSyncService:
    """Push orders to the configured ERP connector and track sync state."""

    def __init__(self, db_manager, connector, order_service, customer_service,
                 logger, connector_name: str = "mock"):
        self.db = db_manager
        self.connector = connector
        self.orders = order_service
        self.customers = customer_service
        self.logger = logger
        self.connector_name = connector_name

    async def push_order(self, order_id: str) -> Dict[str, Any]:
        """
        Load the order, enrich it with the ERP customer id, submit to the ERP,
        and stamp the result back. Returns
        {status, erp_order_no?, error?, connector}.
        """
        order = await self.orders.get_order(order_id)
        if not order:
            return {"status": "failed", "error": "Order not found",
                    "connector": self.connector_name}

        # The ERP customer id is our customer's external_id (P21 customer_id).
        erp_customer_id = None
        if self.customers and order.get("customer_id"):
            customer = await self.customers.get_customer(order["customer_id"])
            if customer:
                erp_customer_id = customer.get("external_id")
        order = {**order, "erp_customer_id": erp_customer_id}

        try:
            result = await self.connector.submit_order(order)
        except Exception as e:
            self.logger.error(f"ERP submit raised for order {order_id}: {e}")
            result = {"status": "failed", "error": str(e)}

        status = "synced" if result.get("status") in ("confirmed", "accepted") else "failed"
        erp_order_no = result.get("erp_order_id")
        error = result.get("error")

        await self._record(order_id, status, erp_order_no, order, error)

        return {"status": status, "erp_order_no": erp_order_no,
                "error": error, "connector": self.connector_name}

    async def get_sync_status(self, order_id: str) -> Dict[str, Any]:
        if not self.db.pool:
            return {"order_id": order_id, "erp_sync_status": "unknown", "attempts": []}
        try:
            async with self.db.pool.acquire() as conn:
                order = await conn.fetchrow(
                    "SELECT erp_order_no, erp_sync_status, erp_synced_at FROM orders WHERE id = $1",
                    order_id,
                )
                if not order:
                    return {"order_id": order_id, "erp_sync_status": "not_found", "attempts": []}
                attempts = await conn.fetch(
                    """SELECT connector, status, erp_order_no, error, created_at
                       FROM erp_sync_log WHERE order_id = $1 ORDER BY created_at DESC""",
                    order_id,
                )
            return {
                "order_id": order_id,
                "erp_order_no": order["erp_order_no"],
                "erp_sync_status": order["erp_sync_status"],
                "erp_synced_at": order["erp_synced_at"].isoformat() if order["erp_synced_at"] else None,
                "attempts": [
                    {"connector": a["connector"], "status": a["status"],
                     "erp_order_no": a["erp_order_no"], "error": a["error"],
                     "created_at": a["created_at"].isoformat() if a["created_at"] else None}
                    for a in attempts
                ],
            }
        except Exception as e:
            self.logger.error(f"Failed to read ERP sync status: {e}")
            return {"order_id": order_id, "erp_sync_status": "unknown", "attempts": []}

    async def health(self) -> Dict[str, Any]:
        try:
            health = await self.connector.health_check()
        except Exception as e:
            health = {"connected": False, "error": str(e)}
        return {"connector": self.connector_name, **health}

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    async def _record(self, order_id: str, status: str, erp_order_no: Optional[str],
                      order: Dict[str, Any], error: Optional[str]) -> None:
        if not self.db.pool:
            return
        summary = {
            "order_number": order.get("order_number"),
            "customer_id": order.get("erp_customer_id"),
            "line_count": len(order.get("lines", [])),
            "total_amount": order.get("total_amount"),
        }
        try:
            async with self.db.pool.acquire() as conn:
                async with conn.transaction():
                    await conn.execute(
                        """
                        INSERT INTO erp_sync_log
                            (order_id, connector, status, erp_order_no, request_summary, error)
                        VALUES ($1,$2,$3,$4,$5,$6)
                        """,
                        order_id, self.connector_name, status, erp_order_no,
                        json.dumps(summary), error,
                    )
                    if status == "synced":
                        await conn.execute(
                            """UPDATE orders SET erp_order_no = $1,
                               erp_sync_status = 'synced', erp_synced_at = NOW()
                               WHERE id = $2""",
                            erp_order_no, order_id,
                        )
                    else:
                        await conn.execute(
                            "UPDATE orders SET erp_sync_status = 'failed' WHERE id = $1",
                            order_id,
                        )
        except Exception as e:
            self.logger.error(f"Failed to record ERP sync for order {order_id}: {e}")

    async def list_failures(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Orders whose last ERP sync failed — the retry queue."""
        if not self.db.pool:
            return []
        try:
            async with self.db.pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT o.id, o.order_number, o.erp_sync_status, o.total_amount
                       FROM orders o WHERE o.erp_sync_status = 'failed'
                       ORDER BY o.updated_at DESC LIMIT $1""",
                    limit,
                )
            return [{"order_id": str(r["id"]), "order_number": r["order_number"],
                     "erp_sync_status": r["erp_sync_status"],
                     "total_amount": float(r["total_amount"]) if r["total_amount"] is not None else None}
                    for r in rows]
        except Exception as e:
            self.logger.error(f"Failed to list ERP failures: {e}")
            return []
