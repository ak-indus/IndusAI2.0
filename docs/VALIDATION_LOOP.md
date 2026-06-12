# Customer Validation Loop

How market and customer validation is instrumented directly into the product,
so every demo, pilot, and design-partner session produces data instead of
anecdotes.

## The loop

```
Prospect runs ROI calculator  ──►  pilot_leads (with their own numbers)
        │                                  │
        ▼                                  ▼
   Demo / pilot usage          Sales follow-up from /api/v1/leads
        │                      Funnel: new → contacted → qualified
        ▼                              → pilot → customer | lost
 In-app feedback widget
 (score 1-5 + comment,
  tagged with the page)
        │
        ▼
 /api/v1/feedback/summary  ──►  per-workflow satisfaction → roadmap
```

## Components

| Piece | Where | What it captures |
|-------|-------|------------------|
| Feedback widget | Every page (floating button, bottom-right) | 1–5 score, optional comment, page path |
| ROI calculator | `/roi` in the app sidebar | Prospect's order volume, labor cost, error rate → estimated annual savings |
| Pilot request CTA | ROI calculator results panel | Company, email, monthly order lines, and the savings estimate they computed |
| Feedback summary API | `GET /api/v1/feedback/summary` | Average score overall and per page, promoter/detractor counts |
| Lead funnel API | `GET /api/v1/leads/summary` | Lead counts by stage and open-pipeline estimated savings |

## Operating cadence

1. **Every demo** ends on the ROI calculator with the prospect's own numbers.
   If they won't share rough volumes, that itself is a qualification signal.
2. **Every design-partner session**: watch which pages collect low scores;
   a sub-3 average on a workflow page outranks any roadmap opinion.
3. **Weekly**: review `GET /api/v1/leads?status=new`, advance or close each
   lead (`PATCH /api/v1/leads/{id}/status`). The funnel summary is the
   source of truth for the pipeline slide in investor updates.
4. **ROI model assumptions** (`src/lib/roi.ts`: 70% automation rate, 80%
   error prevention) are deliberately conservative defaults — replace them
   with measured pilot data as soon as the first pilot reports.

## Why this exists

The March 2026 leadership review flagged "no paying customer" as the top
fundraising gap. Validation is not a phase before building — it is telemetry
the product emits while being demoed and used. This loop turns every
prospect interaction into either pipeline (leads) or roadmap signal
(feedback), with zero manual logging.
