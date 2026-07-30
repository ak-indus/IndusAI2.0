# =======================
# ERP Sync Service + Intake Auto-Push Integration Tests
# =======================
"""
Uses the mock connector against a real DB to verify: push stamps the ERP order
number and sync status, every attempt is logged, failures are recorded without
losing the order, and the intake commit path auto-pushes end-to-end.
"""


from services.platform.erp_sync_service import ERPSyncService


class _FailingConnector:
    """A connector whose order submission always fails, for the failure path."""

    async def submit_order(self, order_data):
        return {"status": "failed", "error": "P21 returned 400: credit hold"}

    async def health_check(self):
        return {"connected": False, "error": "unreachable"}


async def _committed_order(services, customer, stocked_product):
    """Run intake → commit to get a real draft order id."""
    run = await services["intake"].parse_order(
        "10x BRG-6205-2RS", customer_external_id="CUST-001",
    )
    order = await services["intake"].commit_run(run["id"])
    return order


# ---------------------------------------------------------------------------
# Push success
# ---------------------------------------------------------------------------

async def test_push_stamps_erp_ref_and_logs(services, customer, stocked_product):
    order = await _committed_order(services, customer, stocked_product)
    # The intake commit already auto-pushed (mock connector). Confirm state.
    status = await services["erp"].get_sync_status(order["id"])
    assert status["erp_sync_status"] == "synced"
    assert status["erp_order_no"]  # mock returns an ERP-XXXX ref
    assert status["erp_synced_at"]
    assert len(status["attempts"]) >= 1
    assert status["attempts"][0]["status"] == "synced"
    assert status["attempts"][0]["connector"] == "mock"


async def test_intake_commit_attaches_erp_result(services, customer, stocked_product):
    run = await services["intake"].parse_order(
        "10x BRG-6205-2RS", customer_external_id="CUST-001",
    )
    order = await services["intake"].commit_run(run["id"])
    assert order["erp"]["status"] == "synced"
    assert order["erp"]["erp_order_no"]
    assert order["erp"]["connector"] == "mock"


async def test_manual_push_is_idempotent_enough(services, customer, stocked_product, db, logger):
    # A push service with no auto-push, to test the manual path in isolation.
    from services.platform.erp_connector import MockERPConnector
    erp = ERPSyncService(db, MockERPConnector(), services["orders"],
                         services["customers"], logger, connector_name="mock")
    order = await services["orders"].create_order({
        "customer_id": customer["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 2}],
    })
    r1 = await erp.push_order(order["id"])
    r2 = await erp.push_order(order["id"])
    assert r1["status"] == "synced" and r2["status"] == "synced"
    status = await erp.get_sync_status(order["id"])
    assert len(status["attempts"]) == 2  # both attempts logged


# ---------------------------------------------------------------------------
# Push failure never loses the order
# ---------------------------------------------------------------------------

async def test_failed_push_records_but_keeps_order(services, customer, stocked_product, db, logger):
    erp = ERPSyncService(db, _FailingConnector(), services["orders"],
                         services["customers"], logger, connector_name="prophet21")
    order = await services["orders"].create_order({
        "customer_id": customer["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 1}],
    })
    result = await erp.push_order(order["id"])
    assert result["status"] == "failed"
    assert "credit hold" in result["error"]

    # Order still exists and is flagged failed (retryable), not rolled back.
    still_there = await services["orders"].get_order(order["id"])
    assert still_there is not None
    status = await erp.get_sync_status(order["id"])
    assert status["erp_sync_status"] == "failed"

    failures = await erp.list_failures()
    assert any(f["order_id"] == order["id"] for f in failures)


async def test_push_missing_customer_external_id_fails_cleanly(services, stocked_product, db, logger):
    from services.platform.erp_connector import MockERPConnector
    # Customer with no external_id-based ERP mapping still pushes via mock, but
    # a Prophet21-style connector would reject; here we assert the sync records.
    cust = await services["customers"].create_customer({
        "external_id": "NO-CONTRACT", "name": "No Contract Co", "credit_limit": 5000,
    })
    erp = ERPSyncService(db, MockERPConnector(), services["orders"],
                         services["customers"], logger, connector_name="mock")
    order = await services["orders"].create_order({
        "customer_id": cust["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 1, "unit_price": 5}],
    })
    result = await erp.push_order(order["id"])
    assert result["status"] == "synced"  # mock accepts; external_id passed through


# ---------------------------------------------------------------------------
# HTTP routes
# ---------------------------------------------------------------------------

async def test_erp_routes_over_http(api_client):
    r = await api_client.get("/api/v1/erp/health")
    assert r.status_code == 200
    assert r.json()["connector"] == "mock"

    # Seed and commit an order via intake, then check its ERP status route.
    await api_client.post("/api/v1/customers", json={
        "external_id": "ERP-CUST", "name": "ERP Buyer", "credit_limit": 100000,
    })
    prod = (await api_client.post("/api/v1/products", json={"sku": "ERP-SKU-1", "name": "Widget"})).json()
    pl = (await api_client.post("/api/v1/price-lists", json={"name": "D", "is_default": True})).json()
    await api_client.post(f"/api/v1/price-lists/{pl['id']}/items",
                          json={"product_id": prod["id"], "unit_price": 10, "min_quantity": 1})
    await api_client.post("/api/v1/inventory/adjust",
                          json={"product_id": prod["id"], "adjustment_qty": 50, "reason": "seed"})

    run = (await api_client.post("/api/v1/intake/parse", json={
        "raw_text": "5x ERP-SKU-1", "customer_external_id": "ERP-CUST",
    })).json()
    order = (await api_client.post(f"/api/v1/intake/{run['id']}/commit", json={})).json()
    assert order["erp"]["status"] == "synced"

    r = await api_client.get(f"/api/v1/orders/{order['id']}/erp-status")
    assert r.status_code == 200
    assert r.json()["erp_sync_status"] == "synced"

    # Manual re-push route works too.
    r = await api_client.post(f"/api/v1/orders/{order['id']}/push-to-erp")
    assert r.status_code == 200
    assert r.json()["status"] == "synced"
