# =======================
# Quote Lifecycle & Pricing Engine Integration Tests
# =======================


async def test_quote_lifecycle_to_order(services, customer, stocked_product):
    quote = await services["quotes"].create_quote({
        "customer_id": customer["id"],
        "valid_days": 14,
        "lines": [{"product_id": stocked_product["id"], "quantity": 10}],
    })
    assert quote and not quote.get("error")
    assert quote["status"] == "draft"
    assert quote["quote_number"].startswith("QUO-")
    assert quote["total_amount"] == 100.0

    sent = await services["quotes"].send_quote(quote["id"])
    assert sent["status"] == "sent"

    accepted = await services["quotes"].accept_quote(quote["id"])
    assert accepted["status"] == "accepted"

    order = await services["quotes"].convert_to_order(quote["id"], services["orders"])
    assert order and not order.get("error")
    assert order["total_amount"] == quote["total_amount"]
    assert order["lines"][0]["unit_price"] == 10.0

    refreshed = await services["quotes"].get_quote(quote["id"])
    assert refreshed["converted_order_id"] == order["id"]


async def test_only_accepted_quotes_convert(services, customer, stocked_product):
    quote = await services["quotes"].create_quote({
        "customer_id": customer["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 5}],
    })
    result = await services["quotes"].convert_to_order(quote["id"], services["orders"])
    assert result.get("error")


async def test_quote_status_guard_rails(services, customer, stocked_product):
    quote = await services["quotes"].create_quote({
        "customer_id": customer["id"],
        "lines": [{"product_id": stocked_product["id"], "quantity": 5}],
    })
    # accept before send is invalid
    result = await services["quotes"].accept_quote(quote["id"])
    assert result.get("error")


async def test_quote_for_unknown_customer_fails(services, stocked_product):
    import uuid
    result = await services["quotes"].create_quote({
        "customer_id": str(uuid.uuid4()),
        "lines": [{"product_id": stocked_product["id"], "quantity": 5}],
    })
    assert result.get("error") == "Customer not found"


# ---------------------------------------------------------------------------
# Pricing engine
# ---------------------------------------------------------------------------

async def test_default_list_price(services, customer, priced_product):
    price = await services["pricing"].get_price(priced_product["id"], customer["id"], 1)
    assert price["list_price"] == 10.0
    assert price["customer_price"] == 10.0
    assert price["total_price"] == 10.0


async def test_volume_tier_pricing(services, customer, priced_product):
    price = await services["pricing"].get_price(priced_product["id"], customer["id"], 100)
    assert price["customer_price"] == 8.0
    assert price["total_price"] == 800.0


async def test_contract_discount_applies(services, customer, priced_product):
    contract = await services["pricing"].create_contract({
        "customer_id": customer["id"],
        "contract_number": "CON-001",
        "discount_percent": 20,
    })
    assert contract
    price = await services["pricing"].get_price(priced_product["id"], customer["id"], 1)
    assert price["customer_price"] == 8.0  # 10.0 less 20%
    assert price["contract_number"] == "CON-001"
    assert price["discount_percent"] == 20


async def test_contract_price_list_overrides_default(services, customer, priced_product):
    special = await services["pricing"].create_price_list({"name": "Acme Special"})
    await services["pricing"].add_price_list_item(special["id"], priced_product["id"], 7.5, 1)
    await services["pricing"].create_contract({
        "customer_id": customer["id"],
        "contract_number": "CON-002",
        "price_list_id": special["id"],
        "discount_percent": 10,
    })
    price = await services["pricing"].get_price(priced_product["id"], customer["id"], 1)
    # contract list price 7.50, then 10% contract discount on top
    assert price["customer_price"] == 6.75
    assert price["price_list_name"] == "Acme Special"


async def test_anonymous_buyer_gets_list_price(services, priced_product):
    price = await services["pricing"].get_price(priced_product["id"], None, 1)
    assert price["customer_price"] == 10.0
    assert price["contract_number"] is None
