# =======================
# Prophet 21 Connector Unit Tests (mocked HTTP transport)
# =======================
"""
Exercises the real request/response logic of the P21 connector against canned
responses via httpx.MockTransport — no live P21 required. Verifies auth token
caching, sales-order payload mapping, order-number extraction across response
shapes, and error handling.
"""

import logging

import httpx

from services.platform.erp_prophet21 import Prophet21Connector

logger = logging.getLogger("test")


def make_connector(handler, **kwargs):
    transport = httpx.MockTransport(handler)
    return Prophet21Connector(
        "https://p21.example.com", "svc_user", "secret", logger,
        transport=transport, **kwargs,
    )


# ---------------------------------------------------------------------------
# Payload mapping (pure, no I/O)
# ---------------------------------------------------------------------------

def test_build_order_payload_maps_fields():
    payload = Prophet21Connector.build_order_payload({
        "order_number": "ORD-000042",
        "customer_external_id": "CUST-001",
        "po_number": "PO-778",
        "lines": [
            {"line_number": 1, "sku": "BRG-6205-2RS", "quantity": 10, "unit_price": 12.5},
            {"line_number": 2, "sku": "VLV-100", "quantity": 3, "unit_price": 25},
        ],
    })
    assert payload["customer_id"] == "CUST-001"
    assert payload["po_no"] == "PO-778"
    assert payload["web_reference"] == "ORD-000042"
    assert payload["source"] == "IndusAI"
    assert len(payload["line_items"]) == 2
    assert payload["line_items"][0] == {
        "line_number": 1, "item_id": "BRG-6205-2RS", "unit_quantity": 10.0, "unit_price": 12.5,
    }


def test_build_order_payload_drops_nulls_and_prefers_erp_ids():
    payload = Prophet21Connector.build_order_payload({
        "order_number": "ORD-1",
        "erp_customer_id": "P21CUST9",       # explicit ERP id wins
        "customer_external_id": "CUST-001",
        "lines": [{"sku": "A", "erp_item_id": "P21ITEM1", "quantity": 1}],
    })
    assert payload["customer_id"] == "P21CUST9"
    assert "po_no" not in payload  # null dropped
    assert payload["line_items"][0]["item_id"] == "P21ITEM1"
    assert "unit_price" not in payload["line_items"][0]  # omitted when absent


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

async def test_authenticate_caches_token():
    calls = {"token": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/security/token":
            calls["token"] += 1
            return httpx.Response(200, json={"AccessToken": "tok-abc"})
        return httpx.Response(404)

    conn = make_connector(handler)
    assert await conn.connect() is True
    # health_check reuses the cached token, so no second auth call.
    await conn.health_check()
    assert calls["token"] == 1
    headers = await conn._auth_headers()
    assert headers["Authorization"] == "Bearer tok-abc"
    await conn.disconnect()


async def test_missing_token_field_raises():
    conn = make_connector(lambda r: httpx.Response(200, json={"nope": 1}))
    assert await conn.connect() is False  # connect swallows and returns False
    health = await conn.health_check()
    assert health["connected"] is False


# ---------------------------------------------------------------------------
# Order submission
# ---------------------------------------------------------------------------

async def test_submit_order_success():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/security/token":
            return httpx.Response(200, json={"AccessToken": "tok"})
        if request.url.path == "/api/sales/orders":
            import json
            seen["auth"] = request.headers.get("Authorization")
            seen["body"] = json.loads(request.content)
            return httpx.Response(201, json={"order_no": "P21-55012"})
        return httpx.Response(404)

    conn = make_connector(handler)
    result = await conn.submit_order({
        "order_number": "ORD-1", "customer_external_id": "CUST-001",
        "lines": [{"sku": "BRG-6205-2RS", "quantity": 10, "unit_price": 12.5}],
    })
    assert result["status"] == "confirmed"
    assert result["erp_order_id"] == "P21-55012"
    assert seen["auth"] == "Bearer tok"
    assert seen["body"]["customer_id"] == "CUST-001"


async def test_submit_order_extracts_nested_order_number():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/security/token":
            return httpx.Response(200, json={"AccessToken": "tok"})
        return httpx.Response(200, json={"data": {"OrderNo": "P21-99"}})

    conn = make_connector(handler)
    result = await conn.submit_order({
        "customer_external_id": "CUST-001",
        "lines": [{"sku": "X", "quantity": 1}],
    })
    assert result["erp_order_id"] == "P21-99"


async def test_submit_order_requires_customer_and_lines():
    conn = make_connector(lambda r: httpx.Response(200, json={"AccessToken": "t"}))
    no_lines = await conn.submit_order({"customer_external_id": "C", "lines": []})
    assert no_lines["status"] == "failed"
    no_cust = await conn.submit_order({"lines": [{"sku": "X", "quantity": 1}]})
    assert no_cust["status"] == "failed"


async def test_submit_order_handles_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/security/token":
            return httpx.Response(200, json={"AccessToken": "tok"})
        return httpx.Response(400, json={"error": "invalid item_id"})

    conn = make_connector(handler)
    result = await conn.submit_order({
        "customer_external_id": "CUST-001",
        "lines": [{"sku": "BAD", "quantity": 1}],
    })
    assert result["status"] == "failed"
    assert "400" in result["error"]


async def test_get_order_status_maps_completed_flag():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/security/token":
            return httpx.Response(200, json={"AccessToken": "tok"})
        return httpx.Response(200, json={"value": [{"order_no": "P21-1", "completed": "Y"}]})

    conn = make_connector(handler)
    status = await conn.get_order_status("P21-1")
    assert status["erp_status"] == "completed"
