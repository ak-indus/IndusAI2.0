# =======================
# App Wiring & Route Registration Regression Tests
# =======================
"""
Locks down the dependency-injection wiring in main.py and the route table.

These tests exist because the platform shipped with: a ProductService
constructor crash on startup, OrderService/QuoteService receiving the wrong
collaborators, service-registry keys that matched none of the router lookups,
and channel routes added to the router after it was included in the app.
Each assertion below would have caught one of those.
"""

import main


def test_app_imports_and_starts():
    assert main.app is not None
    assert main.APP_VERSION


def test_order_service_collaborators():
    assert main.order_service.db is main.db_manager
    assert main.order_service.inventory is main.inventory_service
    assert main.order_service.pricing is main.pricing_service
    assert main.order_service.customers is main.customer_service
    assert main.order_service.workflow is main.workflow_engine


def test_quote_service_collaborators():
    assert main.quote_service.pricing is main.pricing_service
    assert main.quote_service.customers is main.customer_service


def test_product_service_collaborators():
    assert main.product_service.erp is main.erp_connector
    assert main.product_service.logger is main.logger


def test_invoice_and_rma_collaborators():
    assert main.invoice_service.customers is main.customer_service
    assert main.rma_service.inventory is main.inventory_service
    assert main.procurement_service.inventory is main.inventory_service


def _all_paths(app):
    """Collect every route path, recursing into included sub-routers.

    FastAPI/Starlette versions differ: older ones flatten included routes into
    app.routes; newer ones (>=0.141 / starlette >=1.3) nest them under a lazy
    router object. Recursing handles both.
    """
    paths = set()

    def visit(routes):
        for route in routes:
            p = getattr(route, "path", None)
            if p:
                paths.add(p)
            # Newer FastAPI wraps includes in a lazy router exposing its routes
            # under `original_router`; older versions nest under `routes`.
            included = getattr(route, "original_router", None)
            if included is not None and getattr(included, "routes", None):
                visit(included.routes)
            sub = getattr(route, "routes", None)
            if sub and not isinstance(sub, str):
                visit(sub)

    visit(app.routes)
    return paths


def test_critical_routes_registered():
    paths = _all_paths(main.app)
    expected = [
        "/health",
        "/api/v1/message",
        "/api/v1/products",
        "/api/v1/inventory",
        "/api/v1/inventory/reorder-alerts",
        "/api/v1/customers",
        "/api/v1/orders",
        "/api/v1/orders/{order_id}/submit",
        "/api/v1/quotes",
        "/api/v1/quotes/{quote_id}/convert",
        "/api/v1/invoices",
        "/api/v1/invoices/aging",
        "/api/v1/rma",
        "/api/v1/analytics/dashboard",
        # Channel routes are defined in main.py after router creation —
        # they vanish if include_router() runs before they are declared.
        "/api/v1/channels/stats",
        "/api/v1/channels/messages",
        "/api/v1/channels/escalations",
        # Validation loop
        "/api/v1/feedback",
        "/api/v1/feedback/summary",
        "/api/v1/leads",
        "/api/v1/leads/summary",
        # Order intake (the validated wedge)
        "/api/v1/intake/parse",
        "/api/v1/intake/touchless-summary",
        "/api/v1/intake/{run_id}/commit",
        # ERP write-back (Prophet 21 first)
        "/api/v1/erp/health",
        "/api/v1/orders/{order_id}/push-to-erp",
        "/api/v1/orders/{order_id}/erp-status",
    ]
    missing = [p for p in expected if p not in paths]
    assert not missing, f"Missing routes: {missing}"


def test_service_registry_keys_match_router_lookups():
    """Every _svc("name") lookup in routes/platform.py must have a matching
    key injected by main.py's lifespan. A mismatch returns 503 on every call."""
    import re
    from pathlib import Path

    source = Path(main.__file__).parent.joinpath("routes", "platform.py").read_text()
    lookups = set(re.findall(r'_svc\("([a-z_]+)"\)', source))

    main_source = Path(main.__file__).read_text()
    registry_block = re.search(r"set_services\(\{(.*?)\}\)", main_source, re.S)
    assert registry_block, "set_services({...}) call not found in main.py"
    registered = set(re.findall(r'"([a-z_]+)":', registry_block.group(1)))

    unresolved = lookups - registered
    assert not unresolved, f"Router looks up services never registered: {unresolved}"
