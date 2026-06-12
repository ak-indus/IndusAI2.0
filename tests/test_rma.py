# =======================
# RMA / Returns Integration Tests
# =======================


async def _shipped_order(services, customer, product, qty=10):
    order = await services["orders"].create_order({
        "customer_id": customer["id"],
        "lines": [{"product_id": product["id"], "quantity": qty}],
    })
    await services["orders"].submit_order(order["id"])
    await services["orders"].confirm_order(order["id"])
    await services["orders"].ship_order(order["id"])
    return await services["orders"].get_order(order["id"])


async def test_full_return_cycle_restocks_and_refunds(services, customer, stocked_product):
    order = await _shipped_order(services, customer, stocked_product, qty=10)
    line = order["lines"][0]

    rma = await services["rma"].create_rma({
        "order_id": order["id"],
        "customer_id": customer["id"],
        "reason": "defective",
        "lines": [{
            "order_line_id": line["id"],
            "product_id": stocked_product["id"],
            "quantity": 4,
        }],
    })
    assert rma and not rma.get("error")
    assert rma["status"] == "requested"
    assert rma["rma_number"].startswith("RMA-")

    approved = await services["rma"].approve_rma(rma["id"])
    assert approved["status"] == "approved"

    # 100 on hand initially, 10 shipped -> 90; receiving 4 back -> 94
    received = await services["rma"].receive_return(rma["id"])
    assert received["status"] == "received"
    stock = await services["inventory"].get_stock(stocked_product["id"])
    assert stock["quantity_on_hand"] == 94

    refunded = await services["rma"].process_refund(rma["id"])
    assert refunded["status"] == "refunded"
    assert refunded["total_refund"] == 40.0  # 4 units @ $10
    assert refunded["lines"][0]["refund_amount"] == 40.0


async def test_cannot_return_unshipped_order(services, customer, stocked_product):
    order = await services["orders"].create_order({
        "customer_id": customer["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 1}],
    })
    result = await services["rma"].create_rma({
        "order_id": order["id"],
        "customer_id": customer["id"],
        "reason": "not_needed",
        "lines": [],
    })
    assert result.get("error")


async def test_refund_requires_received_status(services, customer, stocked_product):
    order = await _shipped_order(services, customer, stocked_product)
    line = order["lines"][0]
    rma = await services["rma"].create_rma({
        "order_id": order["id"],
        "customer_id": customer["id"],
        "reason": "damaged",
        "lines": [{
            "order_line_id": line["id"],
            "product_id": stocked_product["id"],
            "quantity": 1,
        }],
    })
    result = await services["rma"].process_refund(rma["id"])
    assert result.get("error")


async def test_reject_rma(services, customer, stocked_product):
    order = await _shipped_order(services, customer, stocked_product)
    line = order["lines"][0]
    rma = await services["rma"].create_rma({
        "order_id": order["id"],
        "customer_id": customer["id"],
        "reason": "wrong_item",
        "lines": [{
            "order_line_id": line["id"],
            "product_id": stocked_product["id"],
            "quantity": 1,
        }],
    })
    rejected = await services["rma"].reject_rma(rma["id"])
    assert rejected["status"] == "rejected"
    # rejected RMAs cannot be received
    result = await services["rma"].receive_return(rma["id"])
    assert result.get("error")
