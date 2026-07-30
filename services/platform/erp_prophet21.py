# =======================
# Epicor Prophet 21 ERP Connector
# =======================
"""
Production connector for Epicor Prophet 21 — the dominant ERP in the
mid-market industrial-distribution segment (~1,700-2,000+ installs), and the
research's #1 connector priority (docs/MARKET_VALIDATION_RESEARCH.md §4).

It targets the Prophet 21 REST "middleware" API: token authentication followed
by a sales-order transaction POST, plus OData-backed reads. Endpoint paths and
the auth flow vary across P21 versions and hosting (on-prem vs Epicor cloud),
so every path is configurable and defaults follow the common P21 REST
convention. The order-write and auth paths are verified against the documented
contract with a mocked HTTP transport in tests; a live sandbox is required to
certify against a specific customer instance (a known integration cost the
research flagged — P21 API access carries extra subscription/transaction
limits).

Design notes:
- `transport` is injectable so tests exercise the real request/response logic
  against canned P21 responses without a live server.
- Bearer tokens are cached until shortly before expiry.
- ID mapping: P21 `customer_id` comes from our customer's `external_id`, and
  P21 `item_id` from our product `sku`. Deployments without SKU/customer-id
  parity need a cross-reference table; that is called out, not silently
  assumed.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

import httpx

from services.platform.erp_connector import BaseERPConnector


class Prophet21Connector(BaseERPConnector):
    """Epicor Prophet 21 REST middleware connector."""

    def __init__(self, base_url: str, username: str, password: str,
                 logger, *, order_path: str = "/api/sales/orders",
                 token_path: str = "/api/security/token",
                 odata_path: str = "/odataservice/odata",
                 timeout: float = 30.0,
                 token_ttl: int = 3300,  # ~55 min; P21 tokens commonly last 1h
                 transport: Optional[httpx.AsyncBaseTransport] = None):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.logger = logger
        self.order_path = order_path
        self.token_path = token_path
        self.odata_path = odata_path
        self.timeout = timeout
        self.token_ttl = token_ttl
        self._transport = transport

        self._client: Optional[httpx.AsyncClient] = None
        self._token: Optional[str] = None
        self._token_acquired_at: float = 0.0

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            kwargs: Dict[str, Any] = {"base_url": self.base_url, "timeout": self.timeout}
            if self._transport is not None:
                kwargs["transport"] = self._transport
            self._client = httpx.AsyncClient(**kwargs)
        return self._client

    async def connect(self) -> bool:
        try:
            await self._authenticate()
            return True
        except Exception as e:
            self.logger.error(f"Prophet 21 connect failed: {e}")
            return False

    async def disconnect(self):
        if self._client is not None:
            await self._client.aclose()
            self._client = None
        self._token = None

    async def health_check(self) -> Dict[str, Any]:
        start = time.monotonic()
        try:
            await self._ensure_token()
            latency = int((time.monotonic() - start) * 1000)
            return {"connected": True, "system": "Prophet21",
                    "base_url": self.base_url, "latency_ms": latency}
        except Exception as e:
            return {"connected": False, "system": "Prophet21",
                    "base_url": self.base_url, "error": str(e)}

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    async def _authenticate(self) -> str:
        """POST credentials to the P21 token endpoint; cache the bearer token."""
        resp = await self._http().post(
            self.token_path,
            json={"username": self.username, "password": self.password},
        )
        resp.raise_for_status()
        data = resp.json()
        # P21 versions differ on the token field name.
        token = (data.get("AccessToken") or data.get("access_token")
                 or data.get("token") or data.get("Token"))
        if not token:
            raise RuntimeError("Prophet 21 auth response contained no access token")
        self._token = token
        self._token_acquired_at = time.monotonic()
        return token

    async def _ensure_token(self) -> str:
        if self._token and (time.monotonic() - self._token_acquired_at) < self.token_ttl:
            return self._token
        return await self._authenticate()

    async def _auth_headers(self) -> Dict[str, str]:
        token = await self._ensure_token()
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # ------------------------------------------------------------------
    # Orders (the O2C write path — the reason this connector exists)
    # ------------------------------------------------------------------

    @staticmethod
    def build_order_payload(order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map an internal order dict (from OrderService.get_order) to a P21
        sales-order payload. Kept pure and static so the mapping is unit-tested
        in isolation.
        """
        line_items = []
        for idx, line in enumerate(order_data.get("lines", []), start=1):
            item = {
                "line_number": line.get("line_number", idx),
                "item_id": line.get("erp_item_id") or line.get("sku"),
                "unit_quantity": float(line.get("quantity", 0)),
            }
            if line.get("unit_price") is not None:
                item["unit_price"] = float(line["unit_price"])
            line_items.append(item)

        payload: Dict[str, Any] = {
            "customer_id": order_data.get("erp_customer_id")
            or order_data.get("customer_external_id"),
            "po_no": order_data.get("po_number"),
            "class_id": order_data.get("erp_class_id"),
            "source": "IndusAI",
            "web_reference": order_data.get("order_number"),
            "line_items": line_items,
        }
        # P21 rejects unknown nulls on some transaction endpoints; drop them.
        return {k: v for k, v in payload.items() if v is not None}

    async def submit_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a sales order in Prophet 21. Returns the ERP order reference."""
        if not order_data.get("lines"):
            return {"status": "failed", "error": "Order has no line items"}
        if not (order_data.get("erp_customer_id") or order_data.get("customer_external_id")):
            return {"status": "failed",
                    "error": "No ERP customer id (customer external_id) on order"}

        payload = self.build_order_payload(order_data)
        try:
            headers = await self._auth_headers()
            resp = await self._http().post(self.order_path, json=payload, headers=headers)
            resp.raise_for_status()
            body = resp.json() if resp.content else {}
            erp_order_no = self._extract_order_no(body)
            return {
                "status": "confirmed" if erp_order_no else "accepted",
                "erp_order_id": erp_order_no,
                "raw": body,
            }
        except httpx.HTTPStatusError as e:
            detail = self._safe_body(e.response)
            self.logger.error(f"Prophet 21 order submit HTTP {e.response.status_code}: {detail}")
            return {"status": "failed",
                    "error": f"P21 returned {e.response.status_code}: {detail}"}
        except Exception as e:
            self.logger.error(f"Prophet 21 order submit failed: {e}")
            return {"status": "failed", "error": str(e)}

    async def get_order_status(self, order_ref: str) -> Dict[str, Any]:
        """Read an order's status from P21 via OData (best-effort across versions)."""
        try:
            headers = await self._auth_headers()
            resp = await self._http().get(
                f"{self.odata_path}/P21_view_oe_hdr",
                params={"$filter": f"order_no eq '{order_ref}'",
                        "$select": "order_no,completed,cancel_flag,delete_flag"},
                headers=headers,
            )
            resp.raise_for_status()
            rows = (resp.json() or {}).get("value", [])
            if not rows:
                return {"order_ref": order_ref, "erp_status": "not_found"}
            row = rows[0]
            status = "completed" if row.get("completed") == "Y" else "open"
            if row.get("cancel_flag") == "Y":
                status = "cancelled"
            return {"order_ref": order_ref, "erp_status": status, "raw": row}
        except Exception as e:
            self.logger.error(f"Prophet 21 order status failed: {e}")
            return {"order_ref": order_ref, "erp_status": "unknown", "error": str(e)}

    @staticmethod
    def _extract_order_no(body: Dict[str, Any]) -> Optional[str]:
        for key in ("order_no", "order_number", "OrderNo", "OrderNumber", "id", "Id"):
            if body.get(key):
                return str(body[key])
        # Some P21 transaction responses nest the result.
        for container in ("data", "result", "Order", "order"):
            inner = body.get(container)
            if isinstance(inner, dict):
                found = Prophet21Connector._extract_order_no(inner)
                if found:
                    return found
        return None

    @staticmethod
    def _safe_body(resp: httpx.Response) -> str:
        try:
            return resp.text[:500]
        except Exception:
            return "<unreadable response>"

    # ------------------------------------------------------------------
    # OData-backed reads
    # ------------------------------------------------------------------

    async def _odata_get(self, entity: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        headers = await self._auth_headers()
        resp = await self._http().get(f"{self.odata_path}/{entity}",
                                      params=params, headers=headers)
        resp.raise_for_status()
        return (resp.json() or {}).get("value", [])

    async def get_product(self, sku: str) -> Optional[Dict[str, Any]]:
        try:
            rows = await self._odata_get(
                "P21_view_inv_mast",
                {"$filter": f"item_id eq '{sku}'",
                 "$select": "item_id,item_desc,default_selling_unit"},
            )
            if not rows:
                return None
            r = rows[0]
            return {"sku": r.get("item_id"), "name": r.get("item_desc"),
                    "uom": r.get("default_selling_unit")}
        except Exception as e:
            self.logger.error(f"Prophet 21 get_product failed: {e}")
            return None

    async def search_products(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
        try:
            rows = await self._odata_get(
                "P21_view_inv_mast",
                {"$filter": f"contains(item_desc,'{query}') or contains(item_id,'{query}')",
                 "$top": limit,
                 "$select": "item_id,item_desc,default_selling_unit"},
            )
            return [{"sku": r.get("item_id"), "name": r.get("item_desc"),
                     "uom": r.get("default_selling_unit")} for r in rows]
        except Exception as e:
            self.logger.error(f"Prophet 21 search_products failed: {e}")
            return []

    async def get_stock_level(self, sku: str, warehouse: str = "MAIN") -> Dict[str, Any]:
        try:
            rows = await self._odata_get(
                "P21_view_inv_loc",
                {"$filter": f"item_id eq '{sku}' and location_id eq '{warehouse}'",
                 "$select": "item_id,location_id,qty_on_hand,qty_allocated,qty_on_order"},
            )
            if not rows:
                return {"sku": sku, "warehouse": warehouse, "quantity_on_hand": 0,
                        "quantity_reserved": 0, "quantity_available": 0, "quantity_on_order": 0}
            r = rows[0]
            on_hand = float(r.get("qty_on_hand") or 0)
            reserved = float(r.get("qty_allocated") or 0)
            return {"sku": sku, "warehouse": warehouse,
                    "quantity_on_hand": on_hand, "quantity_reserved": reserved,
                    "quantity_available": on_hand - reserved,
                    "quantity_on_order": float(r.get("qty_on_order") or 0)}
        except Exception as e:
            self.logger.error(f"Prophet 21 get_stock_level failed: {e}")
            return {"sku": sku, "warehouse": warehouse, "quantity_on_hand": 0,
                    "quantity_reserved": 0, "quantity_available": 0, "quantity_on_order": 0}

    async def reserve_stock(self, sku: str, qty: float, order_ref: str, warehouse: str = "MAIN") -> bool:
        # P21 allocates stock at order entry, not via a separate reservation
        # call, so submit_order handles this. No-op by design.
        return True

    async def release_stock(self, sku: str, qty: float, order_ref: str, warehouse: str = "MAIN") -> bool:
        return True

    async def get_customer_price(self, sku: str, customer_id: str, qty: float = 1) -> Dict[str, Any]:
        # P21 pricing is a contract/price-library resolution best done server-side
        # by P21 at order entry; the intake pricing engine handles quotes locally.
        return {"sku": sku, "customer_price": None,
                "note": "Priced by P21 at order entry"}

    async def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        try:
            rows = await self._odata_get(
                "P21_view_customer",
                {"$filter": f"customer_id eq '{customer_id}'",
                 "$select": "customer_id,customer_name"},
            )
            if not rows:
                return None
            r = rows[0]
            return {"id": str(r.get("customer_id")), "name": r.get("customer_name")}
        except Exception as e:
            self.logger.error(f"Prophet 21 get_customer failed: {e}")
            return None

    async def check_credit(self, customer_id: str, amount: float) -> Dict[str, Any]:
        # Credit holds are enforced by P21 at order entry; surfaced on submit.
        return {"customer_id": customer_id, "approved": True,
                "note": "Credit enforced by P21 at order entry"}
