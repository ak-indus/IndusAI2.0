# =======================
# Order Intake Integration Tests — the validated wedge
# =======================
"""
Locks down the deterministic (catalog-only, no LLM/graph) intake path:
extraction → confidence-scored resolution → touchless classification →
draft-order commit → touchless-rate KPI.
"""

import pytest


@pytest.fixture
async def second_bearing(services):
    """A second bearing so description searches can be genuinely ambiguous."""
    return await services["products"].create_product({
        "sku": "BRG-6206-2RS",
        "name": "Deep Groove Ball Bearing 6206-2RS",
        "category": "Bearings",
        "manufacturer": "SKF",
    })


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def test_quantity_extraction_variants(services):
    svc = services["intake"]
    cases = [
        ("10x BRG-6205-2RS", 10, "BRG-6205-2RS"),
        ("qty 5 of gate valve", 5, "gate valve"),
        ("2 ea SKF 6205 bearing", 2, "SKF 6205 bearing"),
        ("need 100 hex bolts M8", 100, "hex bolts M8"),
        ("- 3 centrifugal pump", 3, "centrifugal pump"),
        ("BRG-6205-2RS x10", 10, "BRG-6205-2RS"),
    ]
    for line, want_qty, want_body in cases:
        qty, remainder = svc._extract_quantity(line)
        assert qty == want_qty, f"{line!r} → qty {qty}"
        assert want_body.split()[0].lower() in (remainder or "").lower()


def test_boilerplate_lines_are_skipped(services):
    svc = services["intake"]
    text = """Hi team,
Please send me the following:
10x BRG-6205-2RS
Thanks,
Jane"""
    candidates = svc._extract_candidate_lines(text)
    bodies = [c[0] for c in candidates]
    assert any("BRG-6205-2RS" in b for b in bodies)
    assert not any("Hi team" in b for b in bodies)
    assert not any(b.strip().lower().startswith("thanks") for b in bodies)


# ---------------------------------------------------------------------------
# Resolution & disposition
# ---------------------------------------------------------------------------

async def test_exact_sku_match_is_touchless(services, customer, stocked_product):
    run = await services["intake"].parse_order(
        "10x BRG-6205-2RS", customer_external_id="CUST-001",
    )
    assert run["line_count"] == 1
    line = run["lines"][0]
    assert line["disposition"] == "touchless"
    assert line["resolved_sku"] == "BRG-6205-2RS"
    assert line["extracted_quantity"] == 10
    assert line["confidence"] >= 0.8
    assert line["unit_price"] == 10.0  # priced via the pricing engine
    assert run["touchless_rate"] == 1.0


async def test_single_description_match_is_touchless(services, customer, stocked_product):
    run = await services["intake"].parse_order("2 ea Deep Groove Ball Bearing 6205")
    line = run["lines"][0]
    assert line["disposition"] == "touchless"
    assert line["resolved_sku"] == "BRG-6205-2RS"


async def test_ambiguous_description_needs_review_with_candidates(
    services, stocked_product, second_bearing,
):
    # "Deep Groove Ball Bearing" matches both 6205 and 6206 → ambiguous.
    run = await services["intake"].parse_order("5 Deep Groove Ball Bearing")
    line = run["lines"][0]
    assert line["disposition"] == "needs_review"
    skus = {c["sku"] for c in line["candidates"]}
    assert {"BRG-6205-2RS", "BRG-6206-2RS"}.issubset(skus)


async def test_unknown_part_is_unresolved(services, stocked_product):
    run = await services["intake"].parse_order("5x WIDGET-9999-NONEXISTENT")
    line = run["lines"][0]
    assert line["disposition"] == "unresolved"
    assert line["resolved_product_id"] is None
    assert line["confidence"] == 0.0


async def test_mixed_order_touchless_rate(services, customer, stocked_product, second_bearing):
    text = """Hi, please ship:
10x BRG-6205-2RS
5 Deep Groove Ball Bearing
3x WIDGET-0000-MISSING"""
    run = await services["intake"].parse_order(text, customer_external_id="CUST-001")
    assert run["line_count"] == 3
    assert run["touchless_count"] == 1
    assert run["review_count"] == 1
    assert run["unresolved_count"] == 1
    assert run["touchless_rate"] == round(1 / 3, 4)


# ---------------------------------------------------------------------------
# Persistence & reads
# ---------------------------------------------------------------------------

async def test_run_is_persisted_and_retrievable(services, customer, stocked_product):
    run = await services["intake"].parse_order("10x BRG-6205-2RS", customer_external_id="CUST-001")
    fetched = await services["intake"].get_run(run["id"])
    assert fetched is not None
    assert fetched["line_count"] == 1
    assert fetched["lines"][0]["resolved_sku"] == "BRG-6205-2RS"

    runs, total = await services["intake"].list_runs()
    assert total == 1
    assert runs[0]["id"] == run["id"]


# ---------------------------------------------------------------------------
# Commit → draft order
# ---------------------------------------------------------------------------

async def test_commit_creates_draft_order_from_touchless_lines(
    services, customer, stocked_product,
):
    run = await services["intake"].parse_order(
        "10x BRG-6205-2RS", customer_external_id="CUST-001",
    )
    order = await services["intake"].commit_run(run["id"])
    assert order and not order.get("error")
    assert order["status"] == "draft"
    assert len(order["lines"]) == 1
    assert order["lines"][0]["sku"] == "BRG-6205-2RS"
    assert order["lines"][0]["quantity"] == 10
    assert order["total_amount"] == 100.0  # 10 @ $10

    # Run is now marked committed and linked to the order.
    refetched = await services["intake"].get_run(run["id"])
    assert refetched["status"] == "committed"
    assert refetched["committed_order_id"] == order["id"]


async def test_commit_with_human_confirmed_lines(
    services, customer, stocked_product, second_bearing,
):
    # An ambiguous order: human picks a candidate and commits it explicitly.
    run = await services["intake"].parse_order(
        "5 Deep Groove Ball Bearing", customer_external_id="CUST-001",
    )
    assert run["lines"][0]["disposition"] == "needs_review"
    chosen = run["lines"][0]["candidates"][0]
    order = await services["intake"].commit_run(
        run["id"],
        lines=[{"product_id": chosen["product_id"], "quantity": 5}],
    )
    assert order and not order.get("error")
    assert order["lines"][0]["product_id"] == chosen["product_id"]
    assert order["lines"][0]["quantity"] == 5


async def test_commit_guards(services, customer, stocked_product):
    # No customer on the run → cannot commit.
    anon = await services["intake"].parse_order("10x BRG-6205-2RS")
    result = await services["intake"].commit_run(anon["id"])
    assert result.get("error")

    # Nothing touchless → cannot commit.
    nothing = await services["intake"].parse_order(
        "5x WIDGET-9999", customer_external_id="CUST-001",
    )
    result = await services["intake"].commit_run(nothing["id"])
    assert result.get("error")

    # Double commit is rejected.
    good = await services["intake"].parse_order(
        "10x BRG-6205-2RS", customer_external_id="CUST-001",
    )
    first = await services["intake"].commit_run(good["id"])
    assert not first.get("error")
    second = await services["intake"].commit_run(good["id"])
    assert second.get("error")


# ---------------------------------------------------------------------------
# Touchless KPI
# ---------------------------------------------------------------------------

async def test_touchless_summary_aggregates(services, customer, stocked_product, second_bearing):
    await services["intake"].parse_order("10x BRG-6205-2RS", customer_external_id="CUST-001")
    await services["intake"].parse_order(
        "5 Deep Groove Ball Bearing\n3x WIDGET-0000", customer_external_id="CUST-001",
    )
    summary = await services["intake"].touchless_summary()
    assert summary["runs"] == 2
    assert summary["total_lines"] == 3
    assert summary["touchless_lines"] == 1
    assert summary["review_lines"] == 1
    assert summary["unresolved_lines"] == 1
    assert summary["touchless_rate"] == round(1 / 3, 4)
    assert len(summary["by_day"]) >= 1


# ---------------------------------------------------------------------------
# HTTP contract
# ---------------------------------------------------------------------------

async def test_intake_over_http(api_client):
    # Seed a customer + priced/stocked product through the API.
    r = await api_client.post("/api/v1/customers", json={
        "external_id": "INTAKE-CUST", "name": "Intake Buyer", "credit_limit": 100000,
    })
    assert r.status_code == 201
    prod = (await api_client.post("/api/v1/products", json={
        "sku": "PMP-200", "name": "Centrifugal Pump 2in", "category": "Pumps",
    })).json()
    pl = (await api_client.post("/api/v1/price-lists", json={"name": "Default", "is_default": True})).json()
    await api_client.post(f"/api/v1/price-lists/{pl['id']}/items",
                          json={"product_id": prod["id"], "unit_price": 250, "min_quantity": 1})
    await api_client.post("/api/v1/inventory/adjust",
                          json={"product_id": prod["id"], "adjustment_qty": 20, "reason": "seed"})

    # Parse an order.
    r = await api_client.post("/api/v1/intake/parse", json={
        "raw_text": "Hi, please send 4x PMP-200",
        "customer_external_id": "INTAKE-CUST",
    })
    assert r.status_code == 201, r.text
    run = r.json()
    assert run["touchless_count"] == 1
    assert run["lines"][0]["resolved_sku"] == "PMP-200"

    # Commit it to a draft order.
    r = await api_client.post(f"/api/v1/intake/{run['id']}/commit", json={})
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["total_amount"] == 1000.0  # 4 @ $250

    # KPI reflects the run.
    r = await api_client.get("/api/v1/intake/touchless-summary")
    assert r.status_code == 200
    assert r.json()["committed_orders"] == 1

    # touchless-summary is not shadowed by /intake/{run_id}.
    r = await api_client.get("/api/v1/intake")
    assert r.status_code == 200
    assert r.json()["total"] == 1


async def test_intake_parse_rejects_empty(api_client):
    r = await api_client.post("/api/v1/intake/parse", json={"raw_text": ""})
    assert r.status_code == 422  # min_length=1 violation
