# Technical Validation — Evidence-Based Architecture Decisions

**Date**: August 26, 2026
**Classification**: Confidential — Internal Engineering / Board Use
**Relationship to other docs**: Validates (and where the evidence demands, **amends**) the engineering plan in `FUTURE.md` §4.3/§6.7. Five dedicated research workstreams: extraction architecture, ERP integration reality, GraphRAG vs. alternatives, HITL/eval/QA operations, and security/compliance. Full citations live in the underlying research; the load-bearing sources are named inline.

---

## 0. Decision Summary

| Question | Verdict | Changes the plan? |
|---|---|---|
| Is the email/PDF → ERP extraction pipeline technically achievable at 85% touchless? | **Yes, conditionally** — 85% blended is a *best-in-class* outcome requiring <10–15% degraded-input share and >90% crosswalk coverage; expect 55–65% at months 0–6, 80–88% at months 18–24 | Sets contract language and the per-account kill floor |
| Vision-LLM-centric extraction (Claude) — right bet? | **Validated** — with a bought structure-aware parse layer and a multi-signal confidence layer; raw logprobs are near-useless for routing (0.705 AUC vs 0.928 for dual-call verify) | Adds the verify-pass and parse-vendor line items |
| Keep the Neo4j knowledge graph? | **No — replace with Postgres-first hybrid now; defer the graph** | **Major amendment** to FUTURE.md §4.3 item 6 — see §3 |
| ERP connector sequencing (was: Datacor → P21) | **Reordered: NetSuite → P21 → Datacor** — Datacor has no public API and is building competing AI | **Amendment** to the connector plan — see §4 |
| Build or buy the exception workbench? | **Build** — no embeddable HITL component exists for order-line review; the workbench is the product and the flywheel | Confirms FUTURE.md §6.7 |
| Is SOC 2 required for design partners? | **No** — DPA + AI addendum + month-1 security checklist suffices; SOC 2 Type I needed before first *paid* contract (~month 7) | Sequences compliance spend (~$25K → ~$50K staged) |
| Is inference cost a margin risk? | **No** — ~$0.06–0.12/document all-in against $2.50–4.50/document pricing (>90% inference GM); review labor is the real COGS | Confirms operate-model math in FUTURE.md §6.4 |

---

## 1. Extraction Architecture (validated, with sharpened expectations)

**The honest accuracy picture (independent benchmarks, not vendor claims):** frontier vision-LLMs reach 95–98% on header fields but no evaluated system exceeded 80% value-F1 on schema-constrained *enterprise* extraction at low cost (ExtractBench, 2026); line-item tables are the weak spot (generalist LLM line items can crater to ~57% vs Azure Document Intelligence's 87%); handwriting/fax caps at 60–85% field accuracy. Classification is solved (~99%).

**The compounding-error trap**: a 20-line PO at 98% per-field accuracy is only ~30% likely to be fully correct. **Touchless is won by validation and repair, not extraction**: ERP existence checks, qty×price=extended-price checksums, price-tier/MOQ validation, and the customer-part crosswalk. This is exactly why Conexiom's ~87% took years of per-customer mapping — and why crosswalk seeding from ERP order history at onboarding (past order lines are labeled pairs) is the single highest-leverage move: touchless day-30, not day-300.

**Reference pipeline** (each element evidence-backed):

```
Ingest → classify (Haiku-class, ~solved) → quality gate (route fax/scan to high-effort path)
→ structure-aware parse (BUY: Reducto/Extend/Azure DI, $0.01–0.03/page — commoditized, swappable)
→ schema-constrained extraction (Sonnet-class; page IMAGES + parsed text — image-native beat
   text-only 92.7% vs 64.0% on scans; strict JSON schema)
→ independent verify pass (dual-call "Hunter–Mapper": re-locate each field; agreement = confidence.
   Multi-signal confidence hits 0.928 AUC → 99.1% automated accuracy at 80% coverage;
   raw logprobs manage only 0.705 AUC — DO NOT route on logprobs)
→ deterministic validation & repair (SKU exists, checksums, crosswalk, price tier)
→ route: touchless post | field-level review | full manual   [score per LINE, not per document]
→ corrections → crosswalk + golden set + per-customer few-shot store
Escalation cascade Haiku → Sonnet → Opus on low confidence (cascades cut cost 45–98% at equal quality)
```

**Cost**: ~$0.06–0.12 per 2-page PO all-in (parse + extract + verify + matching + escalation reserve); ~half that with batch APIs where latency permits. Inference is 4–5% of revenue at $4/document pricing — cost is not the risk; **routing quality is**.

**Realistic touchless by document type** (blended targets for contracts):

| Type | Months 0–6 | Months 18–24 |
|---|---|---|
| Digital PDF, repeat customer, known parts | 75–85% | 92–97% |
| Digital PDF, new customer/parts | 30–50% | 70–85% |
| Email-body free text | 60–75% | 85–90% |
| RFQ → quote (pricing logic is the gate) | 40–60% | 70–80% |
| Fax/scan/handwritten | 10–30% | 35–55% — segment out and price separately |
| **Blended** | **55–65%** | **80–88%** |

**Mandate**: build a 300–500-document golden set from real customer POs before choosing a parse vendor or publishing any touchless SLA — nearly every vendor accuracy number in the market is vendor-published.

---

## 2. Cross-Reference Layer: Postgres-First, Graph Deferred (major amendment)

The dedicated architecture review returned a decisive verdict against keeping Neo4j in the serving path:

1. **The codebase's own Cypher is the confession**: every cross-reference query in `services/graph/graph_service.py` is a 1-hop pattern match — structurally a `SELECT` on a `cross_reference(sku_a, sku_b, ref_type, confidence)` table. No variable-length traversals exist anywhere. Real equivalence chains run 2–3 hops — comfortable recursive-CTE territory.
2. **Independent GraphRAG evidence is narrow**: graphs win on multi-hop reasoning over unstructured corpora (LinkedIn's +77.6% MRR on tree-structured tickets); plain RAG wins single-hop factual lookups — which is what PN→SKU resolution is. The "60–90% accuracy improvement" in our March docs traces to vendor-run benchmarks; independent studies show GraphRAG *losing* to simpler methods on lookup-style workloads.
3. **The industry's incumbents ship tables, not graphs**: ACES/PIES interchange segments, Epicor PartExpert, BearingBrain's 1.44M interchange records, Hollander (curated since the 1930s). **The moat is the curated interchange data and correction capture, not query topology.**
4. **The operational tax is real for a tiny team**: Neo4j Community has no hot backup/HA/RBAC; production-grade means Aura at $65+/GB/mo plus outbox/CDC infrastructure to fix `sync.py`'s naive dual-write (which silently diverges on any crash between writes). Collapsing to Postgres deletes the entire problem class.

**Target architecture**: Postgres 16 + `pgvector` + `pg_trgm` + FTS in one database. Match cascade: normalize → exact (`part_alias` — customer-specific PN mappings, which the graph schema doesn't even model today) → xref table (recursive CTE ≤3 hops, confidence-multiplied) → trigram fuzzy → hybrid semantic (pgvector + tsvector, RRF fusion) → **rerank top-50 with voyage rerank-2.5** (the cheapest precision lever available: +8–25% in published evals — likely worth more than the entire graph layer) → spec-filter (JSONB) → Claude adjudicates ambiguous candidates. Keep Voyage embeddings (defensible: ~+14% NDCG over OpenAI on technical text).

**Migration is ~1–2 weeks**: port the graph schema 1:1 to tables behind the existing `GraphService` method signatures (the query engine won't notice); delete `sync.py`, `neo4j_client.py`, the Neo4j inventory/price caches, and the Neo4j service from docker-compose. Stages 1/4/5 of the query engine are storage-agnostic and survive unchanged.

**Reintroduction criteria** (revisit quarterly; adopt only if ≥2 fire): >10% of production resolutions need >3 hops or p95 CTE latency >100ms; xref edges >5–10M with dense connectivity; multi-hop *reasoning* becomes a paid feature; graph algorithms (community detection/pathfinding) become product features; headcount exists to own a second stateful store. Even then, evaluate SQL/PGQ or Apache AGE inside Postgres before returning to Neo4j.

**Positioning note**: keep saying "knowledge graph" in sales/investor materials — the *substance* is the accumulated cross-reference dataset, and it exports to any graph store in an afternoon if the criteria ever fire.

---

## 3. ERP Connectors: Resequenced (amendment)

| ERP | Reality found | Pattern | Timeline |
|---|---|---|---|
| **NetSuite** (now first) | SuiteTalk REST covers everything incl. one-call quote→order transform; no partner gate for direct customers; **the only ERP with a shipping MCP server today** (AI Connector Service — external LLM clients invoke role-governed tools) | REST + SuiteScript webhooks; MCP consumption as fast-follow; SDN Select ($3K/yr) + Built-for-NetSuite only when 2–3 customers exist | 4–8 weeks |
| **Epicor Prophet 21** (second — where the ICP lives) | Real API (OData reads, Transaction API writes incl. sales orders) but customer-licensed and expensively so, with transaction limits; docs behind logins (community GitHub fills the gap); **Epicor partnered with Conexiom (July 2026)** — the incumbent has a head start, and Epicor's Prism/Agent Foundry ships MCP | Direct REST on the customer's licensed middleware; Automation Studio recipes for events; apply to Alliance ISV in parallel; differentiate on quotes/pricing/chemical logic, not head-on order automation | 8–14 weeks |
| **Datacor** (third — the vertical moat *if* cracked) | **No public API, no ISV program, building its own OCR order entry and agentic workflows**; third parties integrate via Progress OpenEdge ODBC reads, EDI/file exchange (Cleo connector exists), or negotiated custom work | Two-track: pitch a technology partnership; if rebuffed, ship customer-blessed ODBC read replica + EDI/CSV/email-injection writes. Read-heavy/file-write so there's nothing for Datacor to revoke | 3–6 months per early customer |
| Eclipse / Infor CSD | Eclipse write access is a "Premium API bundle" upsell; Infor's ION gateway is solid but SX.e APIs are archaeology | After the above, against committed design partners only | 8–16 weeks each |

**Universal rules**: one canonical internal schema + adapter pattern from day one; write only through business-logic-enforcing APIs (never direct SQL writes); human approval before order commit; idempotency keys and draft/quote-first workflows; **RPA banned from the core product** (allowed only as explicitly-fragile paid services glue); ~15–20% recurring engineering allocation for connector maintenance against ERP release calendars. Budget: ~2 engineers × 6 months, <$25K program fees — the gating resource is design partners who own API licenses.

---

## 4. HITL Workbench, Flywheel, Eval & QA Operations (validated; concrete stack)

**Workbench — build it** (no embeddable order-line HITL component exists; Rossum/Hyperscience/Instabase are competitors, not components). Requirements distilled from best-in-class: side-by-side doc + fields with bbox click-to-source; **field-level** (not document-level) confidence routing; catalog/price/ship-to-constrained corrections (dropdowns, not free text — prevents whole error classes); queue ordered by SLA-clock-remaining; **mandatory reason code on every correction**. Retool is an acceptable v1 shell; Label Studio (self-hosted, free) for offline golden-set labeling and dual-pass audits only. The Hyperscience mental model for contracts: customer picks target accuracy, system solves for the automation rate it can sustain.

**Correction flywheel — triage by reason code, in strict order**:
1. **Deterministic rule/crosswalk first** (stable mappings: customer PN→SKU, alias ship-tos, UoM quirks) — instant, zero regression risk, feeds the moat table;
2. **Per-account few-shot/context second** (account idiosyncrasies) — retrieved into the extraction prompt, days to deploy;
3. **Fine-tuning last** (systematic cross-account weaknesses, only with hundreds of clean examples) — and **never train on the model's own outputs, only on QA-verified human corrections** (Rossum's explicit anti-contamination rule).

**Eval stack**: Langfuse self-hosted (tracing, per-account/per-field scores, cost-per-document telemetry) + a homegrown ~500-line pytest field-level eval harness run in CI on every prompt/model change, failing the build on per-field-type regression. Our evals are deterministic golden-set comparisons, not LLM-judge chat evals. Golden set grows free from QA-audited documents. Braintrust ($249/mo) only if the comparison UX becomes the bottleneck. Drift alerts on confidence-distribution shift, correction-rate spikes, and touchless-rate drops per account.

**SLA/QA methodology (what makes "≥99% line-item accuracy" contractually honest)**: two separate statistical jobs — ISO 2859-1 AQL lot acceptance for weekly ops, and binomial confidence bounds for the contract number. Rule of three: ~300 randomly sampled lines with zero errors = 95% upper bound of ~1% error; ~750 lines/month for ±0.5% estimation. **Stratify the audit across touchless AND touched documents** — silent failures live in the touchless stream. QA layers: agent → QA reviewer (5–10% sampling, tapering with demonstrated accuracy) → monthly calibration with inter-rater agreement tracking; gold-task qualification (~99%) before any agent touches live queues.

**Offshore team**: Philippines micro-BPO (Cebu ~10–20% cheaper than Manila), dedicated-staff model, **$1,000–1,400/mo/FTE (~$7–10/hr loaded)**, 2→6 agents; +20% overhead on quoted rates; 1:8–1:10 supervision; 15–25% annual attrition in the capacity model; 30%+ headroom. Non-negotiables: SOC 2 Type II partner, VDI/secure-browser-only access (no local data, USB lockdown, MFA, DLP), gold-task gating. Not Upwork — SLA contracts with customer PII need employer-of-record continuity and facility control. LatAm agents only if live US-hours phone escalation becomes part of the service.

**Orchestration**: **Temporal Cloud (Python SDK)** — one workflow per document; `wait_condition` for human steps at zero compute; durable timers at T-10/T-5/T-0 of the 15-minute SLA clock driving reprioritization → lead ping → US on-call; event history doubles as SLA audit evidence. Inngest is the acceptable lighter start; plain Postgres queues alone are not, given contractual SLA clocks.

**Top operational risks** (each with a named mitigation in the underlying research): silent accuracy failure in the touchless stream; flywheel contamination; SLA breaches from thin offshore coverage; offshore data incident; exception-tail stagnation (treat a flat cohort touchless curve ≥4 weeks as an incident).

---

## 5. Security, Compliance & the Chemical Domain (staged; chemicals is the differentiator *and* the liability)

**Staged roadmap**:
- **Design partners (months 1–6, ~$20–35K)**: SOC 2 NOT required — evidence converges that a DPA + security exhibit, an **AI addendum** (contractual no-training commitment; pass-through of Anthropic's no-training default and 7-day log deletion, ZDR requested), the month-1 checklist (MFA everywhere, encryption at rest/in transit, named accounts + least privilege, tenant isolation at the API layer, secrets management, tested backups, six written policies), and ~$10–18K/yr baseline insurance clears mid-market security review. Do not delay pilots for SOC 2. Compliance platform (Vanta/Drata-class, ~$12–18K/yr) starts month 2–3.
- **First paid contract (months 4–12, ~$40–60K incremental)**: SOC 2 **Type I in hand before procurement review** (~month 7, $8–15K boutique auditor), Type II observation window immediately after; pen test ($4–8K); insurance to **$2M Tech E&O/cyber with AFFIRMATIVE AI-output coverage** — AI exclusions are appearing in 2026 renewals and silent coverage is disappearing; reject any policy with a generative-AI exclusion (dedicated capacity exists: Armilla, Munich Re aiSure). Offshore hardened to contractual standard (VDI, no-download, session recording, back-to-back DPA). CCPA service-provider terms everywhere — B2B contact data is regulated post-2023.
- **Scale (year 2+, ~$60–100K/yr)**: annual Type II; ISO 42001 as roadmap-only until a deal demands it; $5M limits past ~$1M ARR.

**Chemical-domain requirements the product must encode** (these answer the compliance questionnaire and shrink the E&O surface simultaneously):
1. **SDS pass-through engine** (29 CFR 1910.1200(g)): correct SDS before/with first shipment and after each revision; **dual-format support (GHS Rev 3 + Rev 7) through the 2027 mixture deadline** — customers are mid-transition on HazCom 2024 deadlines landing now; retrieve-and-attach ONLY with SKU↔document checksum match — **the LLM never generates or selects SDS content**. Wrong-SDS transmission is the distributor's own OSHA violation and our single largest liability surface.
2. **CoA lot-exact matching** (order line ↔ shipped lot ↔ CoA; block send on mismatch; immutable transmission log).
3. **DOT hazmat fields** (49 CFR 172) as schema-validated structured data against the Hazardous Materials Table — never free text; 2-year retention.
4. **DEA listed-chemical guardrails** (21 CFR 1309/1310): SKU-level List I/II flags; **hard stop on auto-acceptance** unless the orderer matches the authorized-purchasing-agent-of-record list; anomaly flags (quantity/frequency/payment/address) routed to humans; ≥2-year records; suspicious-order reporting support. DEA reissued KYC guidance July 2025.
5. **Configurable HITL policy tiers per customer** (auto-quote OK; auto-accept blocked for listed chemicals, new customers, first-time products, $ thresholds) — simultaneously a DEA necessity and the best E&O argument.
6. **Responsible Distribution support**: exportable audit logs formatted for ACD/NACD third-party verification (members must pass it; our logs become part of their evidence).

**Contract posture**: cap liability at 12-month fees (data-breach supercap separate); disclaim manufacturer-authored SDS *content* while owning correct *transmission* — mirroring OSHA's own good-faith allocation.

---

## 6. Consolidated Amendments to FUTURE.md

1. **§4.3 item 6 (ingestion into Neo4j) is replaced**: ingestion now targets Postgres (part/alias/xref/spec tables + pgvector embeddings). The Neo4j layer exits the serving path; ~1–2 week migration behind existing interfaces; reintroduction criteria reviewed quarterly.
2. **Connector sequencing reordered**: NetSuite → P21 → Datacor (was Datacor → P21). Datacor remains the vertical-moat target but as a BD-gated workaround, not an API build.
3. **New P1 build items**: dual-call verify/confidence layer; crosswalk seeding job from ERP order history at customer onboarding; golden-set harness (300–500 real documents) BEFORE parse-vendor selection and SLA publication; Temporal Cloud orchestration with SLA timers; reason-coded correction capture.
4. **New compliance-as-product items**: SDS dual-format validation engine, CoA lot matching, DOT field validation, DEA order-gating, per-customer HITL policy tiers.
5. **Touchless expectations formalized**: contract on the blended 55–65% → 80–88% trajectory with degraded-input carve-outs; keep the per-account 70%-by-month-12 kill floor (FUTURE.md §6.4) — now evidence-backed as achievable-but-not-automatic.
6. **Unchanged**: per-document COGS ($0.06–0.12 validated vs. the §6.4 assumption of $0.15 — margin model holds with headroom); build-the-workbench decision; offshore staffing bands ($15/hr assumption now refined to $7–10/hr Philippines + 20% overhead — favorable); staged SOC 2 timing matches the §6 scoreboard.

---

*Underlying research: five workstream reports (extraction, ERP, retrieval architecture, HITL/QA, compliance), August 26, 2026, each with full source URLs. Key load-bearing sources: ExtractBench & OmniDocBench (independent extraction benchmarks); "Beyond Logprobs" (confidence routing); arXiv 2502.11371 (RAG vs GraphRAG systematic evaluation); LinkedIn KG-RAG (SIGIR 2024); Epicor/Conexiom partnership announcements (July 2026); Epicor Insights 2026 agentic stack; NetSuite AI Connector (MCP); Datacor Winter 2026 release; Hyperscience accuracy/automation docs; Rossum Aurora training discipline; ISO 2859-1/binomial sampling methodology; OSHA HazCom 2024/GHS Rev 7 deadlines; 21 CFR 1310.07; Common Paper 2026 SaaS contract benchmark; Fenwick on AI insurance exclusions.*
