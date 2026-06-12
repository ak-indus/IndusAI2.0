# =======================
# Customer Validation Loop Integration Tests
# =======================
"""Feedback capture and pilot-lead funnel — the instrumentation that turns
demo traffic and design-partner usage into roadmap and pipeline data."""


async def test_submit_and_summarize_feedback(services):
    v = services["validation"]
    await v.submit_feedback({"score": 5, "page": "/orders", "comment": "Order entry is fast"})
    await v.submit_feedback({"score": 4, "page": "/orders"})
    await v.submit_feedback({"score": 2, "page": "/rma", "comment": "Confusing flow"})

    items, total = await v.list_feedback()
    assert total == 3
    assert items[0]["created_at"]  # newest first, serialized

    summary = await v.feedback_summary()
    assert summary["total"] == 3
    assert summary["average_score"] == round((5 + 4 + 2) / 3, 2)
    assert summary["promoters"] == 2
    assert summary["detractors"] == 1
    by_page = {p["page"]: p for p in summary["by_page"]}
    assert by_page["/orders"]["count"] == 2
    assert by_page["/orders"]["average_score"] == 4.5


async def test_lead_capture_and_funnel(services):
    v = services["validation"]
    lead = await v.submit_lead({
        "company": "Gulf Coast Bearings",
        "contact_name": "Ray Operator",
        "email": "ray@gulfcoastbearings.com",
        "monthly_order_lines": 4000,
        "estimated_annual_savings": 182000,
        "source": "roi_calculator",
    })
    assert lead["status"] == "new"
    assert lead["estimated_annual_savings"] == 182000.0

    moved = await v.update_lead_status(lead["id"], "qualified")
    assert moved["status"] == "qualified"

    await v.submit_lead({"company": "Delta Supply", "email": "ops@deltasupply.com"})

    funnel = await v.lead_funnel_summary()
    assert funnel["total"] == 2
    assert funnel["by_status"] == {"qualified": 1, "new": 1}
    assert funnel["open_pipeline_estimated_savings"] == 182000.0


async def test_invalid_lead_status_rejected(services):
    v = services["validation"]
    lead = await v.submit_lead({"company": "Test Co", "email": "t@t.com"})
    result = await v.update_lead_status(lead["id"], "bogus")
    assert result.get("error")


async def test_lost_leads_drop_out_of_pipeline_value(services):
    v = services["validation"]
    lead = await v.submit_lead({
        "company": "Churn Co", "email": "c@churn.com",
        "estimated_annual_savings": 99000,
    })
    await v.update_lead_status(lead["id"], "lost")
    funnel = await v.lead_funnel_summary()
    assert funnel["open_pipeline_estimated_savings"] == 0
