# =======================
# Order-to-Cash Lifecycle Integration Tests
# =======================
"""
The revenue path a paying customer exercises on day one:
order -> submit (credit + reservation) -> confirm -> ship -> deliver
-> invoice -> payment, plus cancellation and credit-rejection paths.
"""


async def _create_order(services, customer, product, qty=10):
    return await services["orders"].create_order({
        "customer_id": customer["id"],
        "lines": [{"product_id": product["id"], "quantity": qty}],
    })


async def test_create_order_prices_lines_from_pricing_engine(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=10)
    assert order and not order.get("error")
    assert order["status"] == "draft"
    assert order["order_number"].startswith("ORD-")
    assert len(order["lines"]) == 1
    line = order["lines"][0]
    assert line["unit_price"] == 10.0  # default list price
    assert line["line_total"] == 100.0
    assert order["total_amount"] == 100.0
    assert order["payment_terms"] == "NET30"  # inherited from customer


async def test_volume_tier_applied_at_quantity_break(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=50)
    assert order["lines"][0]["unit_price"] == 8.0
    assert order["total_amount"] == 400.0


async def test_full_lifecycle_submit_confirm_ship_deliver(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=10)
    order_id = order["id"]
    product_id = stocked_product["id"]

    submitted = await services["orders"].submit_order(order_id)
    assert submitted["status"] == "submitted"
    stock = await services["inventory"].get_stock(product_id)
    assert stock["quantity_reserved"] == 10
    assert stock["quantity_available"] == 90

    confirmed = await services["orders"].confirm_order(order_id, approved_by="ops")
    assert confirmed["status"] == "confirmed"
    cust = await services["customers"].get_customer(customer["id"])
    assert cust["credit_used"] == 100.0

    shipped = await services["orders"].ship_order(order_id, tracking_number="1Z999")
    assert shipped["status"] == "shipped"
    assert shipped["lines"][0]["tracking_number"] == "1Z999"
    stock = await services["inventory"].get_stock(product_id)
    assert stock["quantity_on_hand"] == 90
    assert stock["quantity_reserved"] == 0

    delivered = await services["orders"].deliver_order(order_id)
    assert delivered["status"] == "delivered"
    assert delivered["lines"][0]["status"] == "delivered"


async def test_invoice_and_payments_close_the_loop(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=10)
    await services["orders"].submit_order(order["id"])
    await services["orders"].confirm_order(order["id"])
    await services["orders"].ship_order(order["id"])

    invoice = await services["invoices"].create_invoice_from_order(order["id"])
    assert invoice and not invoice.get("error")
    assert invoice["status"] == "draft"
    assert invoice["total_amount"] == 100.0
    assert invoice["balance_due"] == 100.0
    assert len(invoice["lines"]) == 1

    partial = await services["invoices"].record_payment({
        "invoice_id": invoice["id"], "amount": 40, "payment_method": "ach",
    })
    assert partial["invoice_status"] == "partial_paid"
    assert partial["balance_due"] == 60.0

    final = await services["invoices"].record_payment({
        "invoice_id": invoice["id"], "amount": 60, "payment_method": "ach",
    })
    assert final["invoice_status"] == "paid"
    assert final["balance_due"] == 0

    # Credit consumed at confirm is released by payments
    cust = await services["customers"].get_customer(customer["id"])
    assert cust["credit_used"] == 0

    # Paid invoices cannot take further payments
    again = await services["invoices"].record_payment({
        "invoice_id": invoice["id"], "amount": 1, "payment_method": "ach",
    })
    assert again.get("error")


async def test_cannot_invoice_draft_order(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product)
    result = await services["invoices"].create_invoice_from_order(order["id"])
    assert result.get("error")


async def test_credit_check_blocks_over_limit_orders(services, stocked_product):
    broke = await services["customers"].create_customer({
        "external_id": "CUST-BROKE", "name": "Low Credit Co", "credit_limit": 50,
    })
    order = await _create_order(services, broke, stocked_product, qty=10)  # $100 > $50
    result = await services["orders"].submit_order(order["id"])
    assert "Credit check failed" in result.get("error", "")
    refreshed = await services["orders"].get_order(order["id"])
    assert refreshed["status"] == "draft"


async def test_cancel_releases_reservation_and_credit(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=10)
    await services["orders"].submit_order(order["id"])
    await services["orders"].confirm_order(order["id"])

    cancelled = await services["orders"].cancel_order(order["id"], reason="customer request")
    assert cancelled["status"] == "cancelled"
    stock = await services["inventory"].get_stock(stocked_product["id"])
    assert stock["quantity_reserved"] == 0
    assert stock["quantity_on_hand"] == 100
    cust = await services["customers"].get_customer(customer["id"])
    assert cust["credit_used"] == 0


async def test_cannot_cancel_shipped_order(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product)
    await services["orders"].submit_order(order["id"])
    await services["orders"].confirm_order(order["id"])
    await services["orders"].ship_order(order["id"])
    result = await services["orders"].cancel_order(order["id"])
    assert result.get("error")


async def test_large_order_spawns_approval_workflow(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=51)  # hits the $8 tier... still only $408
    # push over the $5000 approval threshold with an explicit price
    big = await services["orders"].create_order({
        "customer_id": customer["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 10, "unit_price": 600}],
    })
    await services["orders"].submit_order(big["id"])
    pending = await services["workflow"].get_pending_workflows("order_approval")
    assert any(w.get("reference_id") == big["id"] for w in pending)
    # the small order should not have spawned one
    await services["orders"].submit_order(order["id"])
    pending = await services["workflow"].get_pending_workflows("order_approval")
    assert not any(w.get("reference_id") == order["id"] for w in pending)


async def test_analytics_dashboard_reflects_orders(services, customer, stocked_product):
    order = await _create_order(services, customer, stocked_product, qty=10)
    await services["orders"].submit_order(order["id"])

    metrics = await services["analytics"].get_dashboard_metrics()
    assert metrics["orders_today"] == 1
    assert metrics["revenue_today"] == 100.0
    assert metrics["open_orders"] == 1
    assert metrics["top_products"][0]["sku"] == stocked_product["sku"]
    assert metrics["recent_orders"][0]["order_number"] == order["order_number"]
