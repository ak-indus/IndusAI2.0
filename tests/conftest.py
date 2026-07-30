# =======================
# Backend Integration Test Harness
# =======================
"""
Runs the platform services against a real PostgreSQL database.

Requires a reachable Postgres instance; configure via TEST_DATABASE_URL
(defaults to postgresql://postgres:postgres@localhost:5432/indusai_test).
CI provides this via a postgres service container.
"""

from __future__ import annotations

import logging
import os

import asyncpg
import pytest

# main.py requires SECRET_KEY at import time — set before any test imports it.
os.environ.setdefault("SECRET_KEY", "integration-test-secret-key-32-chars!!")
# Keep debug off so importing main never seeds demo data into the test DB.
os.environ.setdefault("DEBUG", "false")

from services.platform.schema import PLATFORM_SCHEMA, PLATFORM_INDEXES  # noqa: E402
from services.platform.analytics_service import AnalyticsService  # noqa: E402
from services.platform.customer_service import CustomerService  # noqa: E402
from services.platform.erp_connector import MockERPConnector  # noqa: E402
from services.platform.inventory_service import InventoryService  # noqa: E402
from services.platform.invoice_service import InvoiceService  # noqa: E402
from services.platform.order_service import OrderService  # noqa: E402
from services.platform.pricing_service import PricingService  # noqa: E402
from services.platform.procurement_service import ProcurementService  # noqa: E402
from services.platform.product_service import ProductService  # noqa: E402
from services.platform.quote_service import QuoteService  # noqa: E402
from services.platform.rma_service import RMAService  # noqa: E402
from services.platform.validation_service import ValidationService  # noqa: E402
from services.platform.intake_service import OrderIntakeService  # noqa: E402
from services.platform.erp_sync_service import ERPSyncService  # noqa: E402
from services.platform.workflow_engine import WorkflowEngine  # noqa: E402

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/indusai_test",
)

# Base tables normally created by DatabaseManager._create_tables()
BASE_SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_id VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL,
    message_type VARCHAR(50),
    confidence REAL DEFAULT 0.0,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    response_content TEXT,
    response_time REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS escalation_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(100) NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'open',
    assigned_to VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""

# Every table the platform writes to, for cleanup between tests.
ALL_TABLES = [
    "workflow_transitions", "workflows",
    "rma_lines", "rma_requests",
    "payments", "invoice_lines", "invoices",
    "intake_lines", "intake_runs",
    "erp_sync_log",
    "goods_receipt_lines", "goods_receipts",
    "purchase_order_lines", "purchase_orders",
    "supplier_products", "suppliers",
    "order_lines", "orders",
    "quote_lines", "quotes",
    "customer_contracts", "price_list_items", "price_lists",
    "inventory_transactions", "inventory",
    "product_cross_references", "product_specs", "products",
    "product_feedback", "pilot_leads",
    "escalation_tickets", "messages", "customers",
]


class FakeDB:
    """Stand-in for DatabaseManager: services only touch `.pool`."""

    def __init__(self, pool):
        self.pool = pool
        self.redis_client = None


@pytest.fixture(scope="session")
async def pool():
    try:
        pg_pool = await asyncpg.create_pool(TEST_DATABASE_URL, min_size=1, max_size=5)
    except Exception as e:  # pragma: no cover
        pytest.skip(f"Test database not available at {TEST_DATABASE_URL}: {e}")
    async with pg_pool.acquire() as conn:
        await conn.execute(BASE_SCHEMA)
        await conn.execute(PLATFORM_SCHEMA)
        await conn.execute(PLATFORM_INDEXES)
    yield pg_pool
    await pg_pool.close()


@pytest.fixture
async def db(pool):
    yield FakeDB(pool)
    async with pool.acquire() as conn:
        await conn.execute(f"TRUNCATE {', '.join(ALL_TABLES)} CASCADE")


@pytest.fixture
def logger():
    return logging.getLogger("test")


@pytest.fixture
def services(db, logger):
    """The full, correctly wired service graph (mirrors main.py)."""
    erp = MockERPConnector()
    workflow = WorkflowEngine(db, logger)
    products = ProductService(db, erp, logger)
    inventory = InventoryService(db, logger)
    customers = CustomerService(db, logger)
    pricing = PricingService(db, logger)
    orders = OrderService(db, inventory, pricing, customers, workflow, logger)
    quotes = QuoteService(db, pricing, customers, logger)
    procurement = ProcurementService(db, inventory, workflow, logger)
    invoices = InvoiceService(db, customers, logger)
    rma = RMAService(db, inventory, workflow, logger)
    analytics = AnalyticsService(db, logger)
    validation = ValidationService(db, logger)
    # ERP write-back through the mock connector (deterministic; the Prophet 21
    # connector has its own unit tests against a mocked HTTP transport).
    erp = ERPSyncService(db, MockERPConnector(), orders, customers, logger,
                         connector_name="mock")
    # Intake runs deterministically (no LLM router / graph) in tests — the
    # catalog-only resolution path is exactly what we want to lock down. ERP
    # auto-push is wired so the end-to-end commit path is covered.
    intake = OrderIntakeService(db, products, pricing, customers, orders, logger,
                                erp_sync=erp, auto_push_erp=True)
    return {
        "products": products,
        "inventory": inventory,
        "customers": customers,
        "pricing": pricing,
        "orders": orders,
        "quotes": quotes,
        "procurement": procurement,
        "invoices": invoices,
        "rma": rma,
        "workflow": workflow,
        "analytics": analytics,
        "validation": validation,
        "intake": intake,
        "erp": erp,
    }


@pytest.fixture
async def api_client(services):
    """HTTP client against the platform API router (real routes, real DB)."""
    import httpx
    from fastapi import FastAPI

    from routes.platform import router, set_services

    set_services(services)
    app = FastAPI()
    app.include_router(router)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ---------------------------------------------------------------------------
# Data factories
# ---------------------------------------------------------------------------

@pytest.fixture
async def customer(services):
    return await services["customers"].create_customer({
        "external_id": "CUST-001",
        "name": "Jane Buyer",
        "email": "jane@acme-industrial.com",
        "company": "Acme Industrial",
        "payment_terms": "NET30",
        "credit_limit": 50000,
    })


@pytest.fixture
async def product(services):
    return await services["products"].create_product({
        "sku": "BRG-6205-2RS",
        "name": "Deep Groove Ball Bearing 6205-2RS",
        "category": "Bearings",
        "manufacturer": "SKF",
        "uom": "EA",
        "lead_time_days": 5,
    })


@pytest.fixture
async def priced_product(services, product):
    """Product with a default price list: $10 each, $8 at qty 50+."""
    pl = await services["pricing"].create_price_list({
        "name": "Standard List", "is_default": True,
    })
    await services["pricing"].add_price_list_item(pl["id"], product["id"], 10.0, 1)
    await services["pricing"].add_price_list_item(pl["id"], product["id"], 8.0, 50)
    return product


@pytest.fixture
async def stocked_product(services, priced_product):
    """Priced product with 100 units on hand in MAIN."""
    ok = await services["inventory"].adjust_stock(
        priced_product["id"], "MAIN", 100, "Initial stock", "test",
    )
    assert ok
    return priced_product
