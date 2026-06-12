# =======================
# HTTP API Contract Tests
# =======================
"""
Exercises the real FastAPI router against the real database — the same
surface the React frontend and any ERP integration consumes.
"""


async def _seed_catalog(api_client):
    """Create customer + priced + stocked product through the API itself."""
    cust = (await api_client.post("/api/v1/customers", json={
        "external_id": "API-CUST-1",
        "name": "API Buyer",
        "credit_limit": 100000,
    })).json()

    prod = (await api_client.post("/api/v1/products", json={
        "sku": "VLV-100",
        "name": "Gate Valve 1in",
        "category": "Valves",
    })).json()

    pl = (await api_client.post("/api/v1/price-lists", json={
        "name": "Default", "is_default": True,
    })).json()
    r = await api_client.post(f"/api/v1/price-lists/{pl['id']}/items", json={
        "product_id": prod["id"], "unit_price": 25, "min_quantity": 1,
    })
    assert r.status_code == 200

    r = await api_client.post("/api/v1/inventory/adjust", json={
        "product_id": prod["id"], "adjustment_qty": 40, "reason": "API seed",
    })
    assert r.status_code == 200
    return cust, prod


async def test_product_crud_and_search(api_client):
    r = await api_client.post("/api/v1/products", json={
        "sku": "MTR-55", "name": "AC Motor 5HP", "category": "Motors",
        "manufacturer": "Baldor",
    })
    assert r.status_code == 201
    product = r.json()

    r = await api_client.get("/api/v1/products", params={"q": "motor"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["sku"] == "MTR-55"

    r = await api_client.get(f"/api/v1/products/{product['id']}")
    assert r.status_code == 200

    r = await api_client.get("/api/v1/products/sku/MTR-55")
    assert r.status_code == 200

    r = await api_client.patch(f"/api/v1/products/{product['id']}", json={"name": "AC Motor 5HP TEFC"})
    assert r.json()["name"] == "AC Motor 5HP TEFC"


async def test_reorder_alerts_route_not_shadowed(api_client):
    """Regression: /inventory/reorder-alerts used to be captured by
    /inventory/{product_id} and 404 on every call."""
    r = await api_client.get("/api/v1/inventory/reorder-alerts")
    assert r.status_code == 200
    assert r.json() == []


async def test_order_lifecycle_over_http(api_client):
    cust, prod = await _seed_catalog(api_client)

    r = await api_client.post("/api/v1/orders", json={
        "customer_id": cust["id"],
        "lines": [{"product_id": prod["id"], "quantity": 4}],
    })
    assert r.status_code == 201
    order = r.json()
    assert order["total_amount"] == 100.0

    for action in ("submit", "confirm", "ship", "deliver"):
        r = await api_client.post(f"/api/v1/orders/{order['id']}/{action}")
        assert r.status_code == 200, f"{action}: {r.text}"
    assert r.json()["status"] == "delivered"

    r = await api_client.post("/api/v1/invoices", json={"order_id": order["id"]})
    assert r.status_code == 201
    invoice = r.json()

    r = await api_client.post("/api/v1/payments", json={
        "invoice_id": invoice["id"], "amount": 100, "payment_method": "ach",
    })
    assert r.status_code == 201
    assert r.json()["invoice_status"] == "paid"

    r = await api_client.get("/api/v1/invoices/aging")
    assert r.status_code == 200


async def test_quote_convert_over_http(api_client):
    cust, prod = await _seed_catalog(api_client)
    r = await api_client.post("/api/v1/quotes", json={
        "customer_id": cust["id"],
        "lines": [{"product_id": prod["id"], "quantity": 2}],
    })
    assert r.status_code == 201
    quote = r.json()

    assert (await api_client.post(f"/api/v1/quotes/{quote['id']}/send")).status_code == 200
    assert (await api_client.post(f"/api/v1/quotes/{quote['id']}/accept")).status_code == 200
    r = await api_client.post(f"/api/v1/quotes/{quote['id']}/convert")
    assert r.status_code == 200
    assert r.json()["total_amount"] == 50.0


async def test_invalid_order_submission_rejected(api_client):
    cust, prod = await _seed_catalog(api_client)
    r = await api_client.post("/api/v1/orders", json={
        "customer_id": cust["id"],
        "lines": [{"product_id": prod["id"], "quantity": 1}],
    })
    order = r.json()
    # deliver before ship is an invalid transition
    r = await api_client.post(f"/api/v1/orders/{order['id']}/deliver")
    assert r.status_code == 400

    # unknown order id is a 404
    import uuid
    r = await api_client.get(f"/api/v1/orders/{uuid.uuid4()}")
    assert r.status_code == 404


async def test_pydantic_validation_guards_input(api_client):
    # missing required lines
    r = await api_client.post("/api/v1/orders", json={"customer_id": "x", "lines": []})
    assert r.status_code == 422
    # feedback score out of range
    r = await api_client.post("/api/v1/feedback", json={"score": 9})
    assert r.status_code == 422


async def test_feedback_and_leads_over_http(api_client):
    r = await api_client.post("/api/v1/feedback", json={
        "score": 5, "page": "/demo", "comment": "GraphRAG demo sold me",
    })
    assert r.status_code == 201

    r = await api_client.get("/api/v1/feedback/summary")
    assert r.json()["total"] == 1

    r = await api_client.post("/api/v1/leads", json={
        "company": "Pilot Co", "email": "buyer@pilot.co",
        "monthly_order_lines": 2500, "estimated_annual_savings": 120000,
    })
    assert r.status_code == 201
    lead = r.json()

    r = await api_client.patch(f"/api/v1/leads/{lead['id']}/status", json={"status": "contacted"})
    assert r.status_code == 200
    assert r.json()["status"] == "contacted"

    r = await api_client.patch(f"/api/v1/leads/{lead['id']}/status", json={"status": "invalid"})
    assert r.status_code == 422

    r = await api_client.get("/api/v1/leads/summary")
    assert r.json()["total"] == 1


async def test_dashboard_over_http(api_client):
    r = await api_client.get("/api/v1/analytics/dashboard")
    assert r.status_code == 200
    body = r.json()
    assert "orders_today" in body
    assert "revenue_this_month" in body
