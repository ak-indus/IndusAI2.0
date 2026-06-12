# =======================
# Inventory Service Integration Tests
# =======================


async def test_adjust_creates_record_and_transaction(services, product):
    ok = await services["inventory"].adjust_stock(product["id"], "MAIN", 25, "Cycle count", "tester")
    assert ok
    stock = await services["inventory"].get_stock(product["id"])
    assert stock["quantity_on_hand"] == 25
    assert stock["quantity_available"] == 25

    txns = await services["inventory"].get_transactions(product["id"])
    assert len(txns) == 1
    assert txns[0]["transaction_type"] == "adjustment"
    assert txns[0]["quantity"] == 25


async def test_negative_adjustment(services, stocked_product):
    await services["inventory"].adjust_stock(stocked_product["id"], "MAIN", -30, "Damage write-off")
    stock = await services["inventory"].get_stock(stocked_product["id"])
    assert stock["quantity_on_hand"] == 70


async def test_reserve_respects_available_quantity(services, stocked_product):
    import uuid
    pid = stocked_product["id"]
    order_ref = str(uuid.uuid4())
    assert await services["inventory"].reserve_stock(pid, "MAIN", 60, order_ref)
    # only 40 left available
    assert not await services["inventory"].reserve_stock(pid, "MAIN", 50, str(uuid.uuid4()))
    stock = await services["inventory"].get_stock(pid)
    assert stock["quantity_reserved"] == 60
    assert stock["quantity_available"] == 40


async def test_release_reservation(services, stocked_product):
    import uuid
    pid = stocked_product["id"]
    order_ref = str(uuid.uuid4())
    await services["inventory"].reserve_stock(pid, "MAIN", 60, order_ref)
    await services["inventory"].release_reservation(pid, "MAIN", 60, order_ref)
    stock = await services["inventory"].get_stock(pid)
    assert stock["quantity_reserved"] == 0
    assert stock["quantity_available"] == 100


async def test_get_stock_by_sku(services, stocked_product):
    stock = await services["inventory"].get_stock_by_sku(stocked_product["sku"])
    assert stock is not None
    assert stock["quantity_on_hand"] == 100


async def test_reorder_alerts_trigger_below_reorder_point(services, stocked_product, db):
    pid = stocked_product["id"]
    async with db.pool.acquire() as conn:
        await conn.execute(
            "UPDATE inventory SET reorder_point = 20, reorder_qty = 50 WHERE product_id = $1",
            pid,
        )
    alerts = await services["inventory"].get_reorder_alerts()
    assert alerts == []  # 100 on hand, well above the reorder point

    await services["inventory"].adjust_stock(pid, "MAIN", -85, "Heavy usage")
    alerts = await services["inventory"].get_reorder_alerts()
    assert len(alerts) == 1
    assert alerts[0]["product_id"] == pid
    assert alerts[0]["quantity_available"] == 15
    assert alerts[0]["reorder_qty"] == 50


async def test_multi_warehouse_isolation(services, priced_product):
    pid = priced_product["id"]
    await services["inventory"].adjust_stock(pid, "MAIN", 10, "init")
    await services["inventory"].adjust_stock(pid, "EAST", 99, "init")
    main_stock = await services["inventory"].get_stock(pid, "MAIN")
    east_stock = await services["inventory"].get_stock(pid, "EAST")
    assert main_stock["quantity_on_hand"] == 10
    assert east_stock["quantity_on_hand"] == 99
