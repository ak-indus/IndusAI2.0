# FUTURE — Mid-Market Thesis Recalibration

**Date**: August 20, 2026
**Classification**: Confidential — Internal Strategy / Board Use
**Supersedes**: strategic direction in `docs/investor_memo.md`, `docs/gtm_strategy_targets.md` (March 2026). The March docs remain useful as history and target lists; where this document conflicts with them, this document wins.
**Method**: Five parallel research workstreams (mid-market MRO landscape, competitive/funding intelligence, VC funding environment, mid-market buyer behavior, and a full technical audit of this repository), synthesized and then assessed through a VC lens and a CTO lens. All external claims are sourced in the appendix.

---

## 0. Executive Summary

**The verdict in three sentences.** The market thesis is *more* right than it was in March — mid-market distributors are under measurably more pressure, AI budgets are real, and three defensible white spaces remain unclaimed. But the specific March plan is now wrong in three load-bearing places: WhatsApp is not a viable North American wedge, the generic email-order-entry wedge has been occupied by 8+ funded competitors while this repo sat dormant, and the "bootstrap from customer #1" capital plan collided with a 2026 seed market that demands design partners running real volume. The company has roughly a 12-month window to land 3–5 lighthouse customers in a defensible vertical — or to accept that the realistic outcome is a feature acquisition at a modest price.

**The single most important fact**: this repository has had **zero commits since March 14, 2026** — five months of dormancy in the fastest-consolidating window this market will ever see. Every strategic recommendation below is downstream of ending that dormancy.

| Question | March 2026 answer | August 2026 answer |
|---|---|---|
| Who is the customer? | Chemical distributors → suppliers → MRO → international | **Mid-market chemical & specialty distributors ($20–500M), full stop, for 18 months** |
| What is the wedge? | WhatsApp commerce + GraphRAG discovery | **Email/RFQ → quote/order automation with cross-reference intelligence; omnichannel later** |
| What is the moat? | GraphRAG first-mover + WhatsApp + full stack | **Accumulated cross-reference data + compliance-native workflows (SDS/CoA/batch) + maintained ERP connectors** |
| How is it funded? | Bootstrap from customer #1 | **Design partners first; then a $2.5–4M seed at $15–20M post is realistic — pilots substitute for revenue** |
| Competition? | "No competitor combines all three" | **8+ funded startups + 3 ERP agent platforms in the generic wedge; chemical vertical still open** |
| Is the product real? | "Full-stack platform built" | **Partially. Real O2C schema and DB-backed logic; but the AI layer runs on 47 demo SKUs, the ingestion tier is orphaned, and 66 of 88 endpoints are unauthenticated** |

---

## 1. What Changed: March → August 2026

### 1.1 The market moved (mostly in our favor)

1. **AI adoption in distribution crossed the majority line — but stayed shallow.** 83% of distributors now have AI in at least one function (vs. 35% in 2023), yet 63% self-describe as early experimentation and only ~16% are past pilots into production. 65% plan to increase AI spend within two years. The buyer is educated and budgeted; the gap is production-grade execution. (NAW; DSG State of AI in Distribution 2026)
2. **Agentic commerce stopped being theoretical.** Amazon Business hit **$60B annualized gross sales** and shipped an AI Ordering Agent; DSG now writes that agentic commerce "is no longer theoretical." Buyer-side AI agents choosing suppliers is the new existential fear for independents — a stronger urgency narrative than "save CSR hours." (MarketScale; DSG)
3. **The growth gap widened into a chasm.** Fastenal accelerated to 14.7% daily sales growth at 61.6% digital; MSC (the mid-market proxy) grew on price only (+720bps price, +50bps volume). Mid-market volume is flat while digital leaders compound. (Investing.com; Industrial Supply Trends)
4. **Consolidation went into a boom.** >$19B of distribution M&A in the first five months of 2026; DSG (the public consolidator) taken private at $2.64B; PE roll-ups (Solve 100+ add-ons, Singer 100+ locations) absorbing independents. The independent buyer pool shrinks every quarter — but each PE platform is itself a multi-branch customer. (DSG; PMCF; Business Wire)
5. **The labor story inverted usefully.** The 2026 labor market cooled, but >40% of wholesale employment sits at firms where a quarter of staff is over 55. The resonant pitch for family-owned distributors is no longer headcount reduction — it is **"tenure capital" capture**: encoding retiring senior CSRs' product and customer knowledge before it walks out the door. (MDM; DSG)

### 1.2 The competition arrived (this is the expensive part of five months of dormancy)

The March memo's claim — "no competitor combines all three capabilities" — is no longer a usable sentence.

- **A YC swarm occupied the inbox-to-ERP wedge**: Comena (YC S25), Hexa, Whitespace ("AI operating system for wholesale distributors"), Panora, Distro (YC S24), Paragon (YC W25), Kanava (voice AI order desk). All founded/launched 2024–2026, all selling order/quote extraction into distributor ERPs, several already with US customers.
- **Funded seed/Series A players took the "agentic back office for distributors" positioning**: **Faction** ($4M seed, Nov 2025 — quoting, pricing, sourcing, collections, voice AI for distributors; the closest single competitor profile to IndusAI) and **Endeavor AI** ($7M seed, Craft Ventures — sales order automation, quoting, Voice-to-Order; already an ISA partner).
- **Proton.ai became a platform** (March 2026): CRM + PIM + eCommerce + **order/quote automation** in one "industry cloud," with the deepest distributor case-study bench in the market (MSC call center: 20x upsell revenue). Sobering counter-signal: PitchBook shows an **M&A offer valuing Proton at ~$21.5M** (~2x revenue) — distributor-SaaS exits without breakout growth are modest.
- **The ERP incumbents shipped agent platforms**: Epicor **Prism/Lux/Agent Foundry** inside Prophet 21; Infor's **Agentic Orchestrator** in CloudSuite Distribution (April 2026); NetSuite **SuiteAgents** with MCP. The ERP's answer to third-party AI layers is "we'll ship agents natively." In chemicals, **Datacor** (700+ customers) is acquiring adjacent software quarterly and shipping AI features.
- **Enterprise O2C incumbents went agentic**: HighRadius (186 GA agents, autonomous-finance-by-2027 goal), Esker (67% average touchless orders), Billtrust (Autopilot).

**What remains genuinely open** (verified by search, not vibes):
1. **Chemical-distribution-native agentic O2C.** The YC swarm targets generic industrial/PVF/HVAC. Nobody does agentic order-to-cash with SDS/CoA handling, lot/batch logic, and regulatory-aware quoting. Datacor is feature-level AI; Kimia ($7M seed, customers incl. Univar) is knowledge-only; Knowde is supplier-side data.
2. **Cross-reference intelligence as a product.** No commercial owner of GraphRAG/knowledge-graph part and product cross-referencing (competitor SKU → my SKU, spec-equivalent substitution at quote time) exists in distribution. This is the highest-leverage quote-win-rate differentiator and compounds with usage.
3. **Unified omnichannel O2C.** Every funded competitor is single-channel-first (email OR voice OR chat). One back-office brain across all inbound channels, wired through quote → order → invoice → collections, is unowned in the mid-market.
4. **Agent-readiness for the demand side.** Nobody yet sells "make your distributorship visible and sellable to buyer-side AI agents" (structured catalogs, MCP endpoints, instant machine-readable quotes) — the defensive product against Amazon's agentic front door.

### 1.3 Two March assumptions the evidence now rejects

- **WhatsApp as a North American wedge: rejected.** There is no meaningful evidence of WhatsApp as a primary B2B ordering channel in North America; US B2B ordering remains email/PDF/EDI/phone. WhatsApp is the default B2B channel in LatAm/India/MEA — it is an **international expansion asset for year 2+**, not a US entry story. In the US, the equivalent wedge is the email inbox. The March memo's moat #1 ("WhatsApp B2B Industrial Commerce — near-zero competition") was true and irrelevant: near-zero competition because near-zero US demand.
- **"Bootstrap profitable from customer #1" as the operating plan: amended.** The unit economics still support capital efficiency (and 2026 investors treat seed-strapping as a legitimate playbook). But the March plan assumed a sales motion (cold founder outreach → 2–4 week closes) that the buyer research contradicts: mid-market distributors spend 1–2% of revenue on IT, buy on peer references through associations and buying groups, and run 60–120+ day cycles with an owner/CFO signature and an IT-director veto. Bootstrap remains viable only if the GTM runs through trust channels (see §2.3), and the "profitable by month 2" timeline in the memo should not be shown to investors.

---

## 2. The Recalibrated Thesis

### 2.1 Thesis statement

> **IndusAI is the agentic order-to-cash layer for mid-market chemical and specialty distributors ($20–500M revenue) — companies too small for HighRadius and too regulated for the generic AI order-entry startups.** The wedge is the quote desk: inbound RFQs and orders (email/PDF first) turned into ERP-valid, compliance-complete, cross-reference-intelligent quotes and orders in minutes. The moat is what accumulates: cross-reference/substitution data that improves with every customer, compliance choreography (SDS, CoA, lot/batch) the generic players won't build, and maintained connectors into the ERPs the mid-market actually runs (Datacor, Epicor P21, Infor CSD, NetSuite). The expansion is the rest of the O2C loop (invoice → dispute → collections), then omnichannel (voice, SMS/WhatsApp), then the demand side: making independent distributors legible to buyer-side AI agents.

Why this framing survives the 2026 defensibility critique: it competes for **labor budgets, not IT budgets** (Bessemer's vertical-AI formula), it is an **autopilot priced on outcomes** rather than a copilot priced per seat (Sequoia's "Services: The New Software" split), and its moat is **usage-generated data plus system-of-workflow capture** — the two moat types investors still underwrite — rather than "we have a knowledge graph."

### 2.2 Why mid-market, precisely

- **Segment definition**: $20–500M revenue distributors. Below $20M there is no budget ($50K is material against a $300–600K total software spend); above $500M, Esker/HighRadius/Conexiom compete and procurement turns enterprise-grade.
- **Sizing honesty** (replacing the memo's $5.4B SAM): the US MRO market is ~$165B with Grainger at only ~7%; the top 50 distributors are only ~half of industry revenue; several thousand firms sit in the $50M–$1B band, with the chemical sub-vertical concentrated around ~400 ACD member companies (>85% of US chemical distribution capacity) plus the ICIS Top 100 tail. A realistic SAM for a $30–100K ACV product across mid-market chemical + adjacent specialty distribution is **$300M–$1B** — an order of magnitude smaller than the March memo's framing, and still more than enough for a $30–50M ARR company, which is what the next 5 years are actually about.
- **Why chemicals first**: one association (ACD/NACD), one dominant ERP (Datacor — a partnership target and plausible acquirer), compliance complexity as a structural filter against the YC swarm, and reference density achievable fast. The March GTM's chemical-first instinct was right; this doubles down on it and cuts the Phase 2–4 sprawl (suppliers, generic MRO, international) until the beachhead is won.
- **PE platforms are customers, not just threats**: with >$19B of deals in five months, position as the **post-acquisition standardization layer** — one closed PE platform logo can become 10–100 branches. Distributors also trade at 8.5–11.5x EBITDA with automation quality driving the multiple: "AI-enabled margin" is literally an exit-multiple story for a family owner considering selling. Both narratives belong in the deck.

### 2.3 GTM: buy trust, don't rent attention

The buyer research is unambiguous: this segment buys on peer references, through associations and buying groups, with a VP Ops/VP Sales champion, an owner/CFO signature, and an IT-director veto that is almost always an integration-risk veto.

1. **Channel**: enter as a service provider through **ACD (chemicals)**, **AD's eCommerce/Service Provider Program** (Conexiom's path — proven open to workflow-automation vendors), **NetPlus Alliance**, and **ISA**; show up at the MDM AI for Distributors Summit and NACD/ACD annual meeting. Endorsement converts a 6–9-month cold cycle into a 60–120-day referred cycle.
2. **Price the land inside the signature threshold**: **$25–75K/year**, per-document or per-workflow, implementation in weeks. This undercuts Conexiom/Esker volume pricing where the $50–300M distributor is underserved, and stays under board-process thresholds. Kill the March memo's five-component pricing architecture; one number, one workflow, one ROI sentence.
3. **Neutralize the IT veto before it's raised**: walk into every first meeting with a maintained **Datacor and Epicor P21 connector** (then Infor CSD, NetSuite). In this vertical the connector *is* the product credibility. Treat **MCP as the integration standard** — Epicor/Infor/NetSuite agent platforms all speak it; be the layer their agents call rather than the layer they obsolete.
4. **The pitch that fits the culture**: 56–75% of these firms are family-owned. Lead with tenure capital ("your best CSR's 30 years of product knowledge, encoded before retirement") and Amazon-agent defense ("be quotable by machines in minutes, or invisible to the next generation of buyers") — not headcount ROI.
5. **Design partners before dollars**: 3–5 chemical distributors from the March target list (Sea-Land, Tilley, ChemGroup, H.M. Royal, Chemsolv — the list and scoring in `docs/gtm_strategy_targets.md` remain valid) running real weekly volume with instrumented before/after metrics. In 2026, pilots substitute for ARR at seed; without them there is no round and no reliable bootstrap either.

### 2.4 Product sequencing (replaces the March 4-phase plan)

| Phase | Scope | Proof point |
|---|---|---|
| **1 (now–month 4)** | RFQ/order email+PDF → parsed, cross-referenced, compliance-checked (SDS/CoA attach), ERP-valid quote/order draft; human approves. Datacor + P21 connectors. | 3 design partners, ≥100 real documents/week touchless-assisted, measured minutes-per-order and error-rate deltas |
| **2 (months 4–9)** | Close the O2C loop: order confirmation, invoice generation, AR nudges. Cross-reference data flywheel instrumented (every human correction trains the graph). | First 3 paid conversions at $25–75K; NRR mechanics visible |
| **3 (months 9–15)** | Omnichannel intake (voice via partner/API, SMS; WhatsApp for LatAm-facing customers), collections agent, buyer-agent readiness (MCP endpoint exposing catalog/quote API). | $500K–$1M ARR; seed raised or consciously declined |
| **4 (15+)** | Generic MRO adjacency (bearings/fasteners parsers already exist), supplier-side deployments, international WhatsApp-first markets. | The March Phase 2–4 ideas, re-entered from strength |

---

## 3. VC Assessment (August 2026)

*Written as an investor would write it, against the 2026 bar: agentic-AI median seed ~$9.2M but bimodal; pre-revenue fundable only with design partners running real volume; AI Series A bar ~$3.5M ARR; AI-app gross margins averaging ~52% with 60–65% the underwritten floor; vertical AI still the consensus thesis (Sequoia "Services: The New Software," $4.6T services-as-software framing) but defensibility scrutiny much sharper.*

### 3.1 Grades

| Dimension | Mar 2026 | Aug 2026 | Direction | Rationale |
|---|---|---|---|---|
| Market opportunity | A- | **A-** | — | Pressure on mid-market independents measurably increased; honest SAM is smaller than the memo claimed but ample |
| Timing | A | **B+** | ↓ | Window still open (63% of distributors in early experimentation) but no longer early — 8+ funded entrants since the memo was written |
| Competitive position | B | **C** | ↓↓ | Generic wedge occupied; ERP agent platforms shipped; differentiation now depends on vertical + data moat that exists mostly as intention |
| Product completeness | B- | **C+** | ↓ | Real O2C schema and DB-backed logic (better than the March review believed) — but the AI layer runs on 47 demo SKUs, and the audit found demo theater presented as live capability |
| Team/velocity signal | A- | **F → incomplete** | ↓↓↓ | Five months, zero commits, unmerged branch, no human contributor visible, no customer evidence. This is the first question any investor asks now |
| Capital strategy | B+ | **B** | ↓ | Bootstrap-optionality is a 2026-credible posture, but the memo's "profitable month 2" math would fail diligence; pilots-first is the only credible path either way |
| **Fundability today** | Pre-seed pitchable | **Not fundable as-is** | | See verdict |

### 3.2 The verdict

**Would I fund this today? No.** Not because the thesis is wrong — because there is no evidence anyone is executing it. A five-month-dormant repo, zero design partners, zero LOIs, and a demo layer that fabricates inventory answers is, bluntly, a pass in any partnership meeting in 2026. The Forbes-flagged "pilot revenue dressed as ARR" skepticism cuts the other way too: investors have also gotten better at detecting *demos dressed as products*.

**Would I fund this in 6–9 months? Yes, conditionally**, at **$2.5–4M on $15–20M post** (base case; $5–9M on $25–40M with a distribution-insider founder story and 5+ converting pilots), if:
1. **3–5 named chemical-distributor design partners** run ≥100 real documents/week through the system with instrumented before/after metrics and ≥1 signed conversion to paid;
2. The **cross-reference flywheel is measurable** (corrections captured per week, quote-win-rate delta at pilot accounts) — a data-moat *chart*, not a data-moat *slide*;
3. **One maintained ERP connector is live in production** at a design partner (Datacor or P21);
4. **Inference economics are engineered**: cost per processed order published internally, prompt caching in place, a credible bridge to 60–65%+ gross margin;
5. There is a **team answer** — who, human, full-time, with distribution access; the all-AI-authored commit history makes this question unusually pointed here.

### 3.3 The five questions this company must have answers to (verbatim, from the funding-environment research)

1. Why doesn't the pilot's ERP vendor — or Proton/Endeavor/Faction, who already ship this — win before you reach $1M ARR? *(Answer must be: chemical compliance depth + cross-reference data they don't accumulate + channel trust they haven't bought.)*
2. What converts pilots into contracted, recurring, usage-durable revenue rather than the "pilot ARR" the market now discounts?
3. What compounds after 12 months that a model-provider feature release doesn't erase? *(Answer: the correction-trained cross-reference graph and the workflow position — and it must be measured, not asserted.)*
4. What is fully-loaded inference cost per processed order, and why believe 65% margins rather than the ~52% AI-app average?
5. What is the evidence on sales-cycle length and ACV in this buyer, and how does a sub-10-person team reach $3.5M ARR in 24–30 months? *(Answer: buying-group GTM math, 60–120-day referred cycles, $25–75K land with module expansion.)*

### 3.4 Exit realism

Proton's ~$21.5M M&A offer at ~2x revenue is the comp to internalize: distributor-SaaS without breakout growth exits small. The acquirers that make this venture-scale-or-nothing calculus survivable are visible now — **Datacor** (acquiring quarterly, owns the chemical install base), **Epicor** (buying its agent roadmap), Proton-class consolidators, and the O2C incumbents. Building toward the chemical-vertical data moat keeps both branches alive: venture scale if the flywheel compounds, a strategic home at a real multiple if it doesn't.

---

## 4. CTO Assessment (August 2026)

*Grounded in a full claim-by-claim audit of this repository at HEAD `b3cce4c` (last commit 2026-03-14).*

### 4.1 Reality vs. narrative — the honest ledger

**Real and defensible:**
- The back-office is not vapor: 11 platform services, 25 tables (28 with chat), 88 route decorators, a state-machine workflow engine, parameterized asyncpg throughout (~16,000 backend lines).
- `business_logic.py` **was rewritten to hit real services the same day the March review called it mock** — order status, product inquiry, pricing, and returns handlers all query the database. The review's loudest complaint was obsolete at publication.
- Security hardening from March is real: required 32-char secret, Meta-webhook HMAC, security headers, rate limiting, log redaction.
- The **regex part parsers** (bearings, metric/imperial fasteners, V-belts, CAS) are domain-competent, cheap, hallucination-free — the most defensible IP in the repo and directly reusable in the recalibrated wedge.
- GraphRAG code genuinely exists: Neo4j client, 399-line graph service, 330-line query engine, Voyage embedding client, vector index at 1024-dim.

**Narrative (must stop being shown or said until fixed):**
- The knowledge graph contains **47 hand-written demo SKUs, seeded only when `DEBUG=true`**. The claimed "25+ node types" is actually 15; the 18-industry taxonomy is a Python dict never written to Neo4j.
- The **entire ingestion tier (~3,300 lines — ChemPoint scraper, SKF/NSK/FAG scrapers, TDS/SDS extractor) is orphaned**: imported by nothing but one CLI script, with four dependencies (`bs4`, `pdfplumber`, `openpyxl`, `rich`) missing from `requirements.txt` and `scripts/` not even copied into the Docker image. It cannot run as shipped.
- **Six of the last eight commits made the product look more finished without making it more finished** — demo pages, synthetic fallback data that renders fabricated metrics when the API is unreachable, and a hardcoded-keyword **Twilio WhatsApp "live demo" that returns invented stock and pricing with no signature validation**. Showing that simulator to prospects as a live AI system is a demo-integrity and misrepresentation exposure. Fix or delete before any external conversation.
- Every AI path fails **open and silent**: with no API keys, the app runs looking fully functional with the entire differentiating layer switched off.

### 4.2 Top risks (ranked)

1. **The frontend type-check has been broken since 2026-03-13** (`SigmaGraph.tsx` imports three packages absent from `package.json` and a hooks directory that doesn't exist) — undetected because CI only runs on `main`/`develop` and this branch was never merged. This alone would end a diligence call.
2. **66 of 88 endpoints are completely unauthenticated** — orders, payments, invoices, customer credit, pricing are readable and writable by anyone who can reach the service.
3. **Latent `ModuleNotFoundError` in the GraphRAG hot path** (`query_engine.py:223` imports a `services.intelligence` module that doesn't exist) — the "sourcing options" capability the memo sells crashes the moment it's enabled.
4. **Zero backend tests** against 16,000 lines; `mypy` runs with `continue-on-error`.
5. **No migration mechanism** (`CREATE TABLE IF NOT EXISTS` at startup; no Alembic) — the first production schema change is a manual operation on live customer data.
6. Single-tenant, no RBAC, no CD, no staging, dead-code load (35 unused Radix deps, unreachable graph components, a `/graph/sync/{sku}` endpoint that returns success without syncing).

### 4.3 Engineering plan (repo-truth edition)

**P0 — restore integrity (weeks 1–3):**
1. Merge or re-target the working branch so **CI actually runs**; fix the broken frontend imports; make CI green and keep it green.
2. **Authenticate everything**: API-key or JWT dependency on all `/api/v1` routes; admin JWT stays for admin routes. (RBAC proper can follow; unauthenticated writes cannot.)
3. Delete or clearly quarantine the Twilio simulator and demo-fallback fabrications behind an explicit `DEMO_MODE` banner; fix the missing Twilio signature validation if kept.
4. Fix the `services.intelligence` import; add the four missing dependencies or delete the orphaned ingestion code paths that need them.
5. Backend test harness: pytest + pytest-asyncio, coverage on `business_logic`, `platform` services, and the GraphRAG pipeline happy path. Target 60% on services before any pilot.

**P1 — make the wedge real (weeks 3–10):**
6. **Wire the ingestion tier into the product**: an authenticated endpoint/job that ingests a real catalog (start with one design partner's), seeds the industry taxonomy, and backfills embeddings. The graph must hold thousands of real SKUs, not 47 demo ones.
7. **Email/RFQ intake pipeline** (the actual wedge): inbound mailbox → parse (reuse the part parsers + LLM extraction) → cross-reference → draft quote/order → human approval UI. This is new build; it is the product.
8. **First real ERP connector** (Datacor for the chemical beachhead; P21 next), replacing `MockERPConnector`.
9. Alembic migrations; structured JSON logging; a health check that surfaces whether the AI layer is actually on.
10. **Cost engineering from day one**: per-order token accounting, prompt caching (the 2026 norm is 40–80% API cost reduction), model routing. Margin is a design requirement, not an optimization.

**P2 — before scale (months 3–6):** RBAC, multi-tenancy (`tenant_id` through the 25 tables), CD + staging, E2E tests on the quote flow, correction-capture instrumentation for the cross-reference flywheel (this is the moat metric — build the telemetry before the moat claim).

**Explicitly deprioritized**: WhatsApp US flows (keep the Meta webhook code; stop leading with it), the demo-page arsenal (keep two, delete five), supplier-side features, international.

### 4.4 CTO verdict

> No re-architecture is needed — the March review's judgment that "this is an execution problem, not a design problem" still holds. What has changed is that the execution problem now includes **provenance and integrity**: an unmerged, AI-authored, five-month-dormant branch with red CI and demo fabrications is not a foundation anyone can diligence. Three weeks of P0 work makes the repo honest; ten weeks of P1 work makes the recalibrated wedge demonstrable on real customer data. Nothing about the codebase prevents the mid-market thesis — but nothing about the codebase currently *proves* it, and proof is the entire game in 2026.

---

## 5. The 12-Month Scoreboard

| Month | Milestone | Kill/keep signal |
|---|---|---|
| 1 | CI green, endpoints authenticated, simulator removed, test harness live | — |
| 2–3 | First design partner's real catalog ingested; email→quote pipeline processing their live RFQs in shadow mode | If no distributor will even pilot free via ACD/AD warm paths in 90 days, the GTM assumption is wrong — revisit |
| 4–6 | 3 design partners, ≥100 docs/week, measured deltas; Datacor connector live; first paid conversion ($25–75K) | <2 partners by month 6 = the vertical is harder than researched; consider the PE-platform motion instead |
| 7–9 | 5 customers; cross-reference flywheel chart (corrections/week, win-rate delta); seed conversations from evidence | Flat flywheel = the moat is a feature; plan the strategic-acquirer path deliberately |
| 10–12 | $400–700K ARR run-rate; raise the $2.5–4M seed or consciously seed-strap | — |

**Honest kill criteria**: if by month 9 there are fewer than 3 paying customers *and* the flywheel shows no compounding, the rational move is a strategic conversation with Datacor/Epicor/Proton-class acquirers while the technology is current — Proton's ~2x-revenue offer is what waiting too long looks like.

---

## 6. Sources

**Market**: Grainger FY2025 10-K (sec.gov); Precedence Research MRO; MDM Top Distributors Report 2025 & Economic Outlook (mdm.com); DSG State of AI in Distribution 2026 & State of Distributor Technology 2026 & State of eCommerce 2024 (distributionstrategy.com); NAW AI in Distribution (naw.org); Industrial Distribution Survey of Distributor Operations (inddist.com); PMCF Distribution M&A Pulse Q1 2026; CT Acquisitions multiples & PE roll-up tracker; Business Wire (DSG take-private); Sonepar & Applied Industrial newsrooms; MarketScale & Digital Commerce 360 (Amazon Business $60B, agentic procurement); Investing.com (Fastenal Q2 2026); Industrial Supply Trends (MSC FY2026 Q3); ICIS Top 100 2026; ACD/PCI Magazine; The Business Research Company (specialty chem distribution); Conexiom manual-order-entry cost data; Prokeep 2025 Distribution Report.

**Competition**: Distribution Strategy Group & MDM (Proton platform launch, Epicor agentic AI, Faction raise, MSC/Verint); PitchBook/GetLatka/Tracxn (Proton M&A offer, Panora, Verusen, Knowde); MAinsights (Partium $15M Series A); YC company pages (Comena, Hexa, Whitespace, Distro, Paragon); Industrial Machinery Digest (Endeavor $7M); AIwire/Capital Brief (Kimia $7M); Pactum newsroom ($54M Series C); Epicor/Infor/NetSuite/Datacor newsrooms; HighRadius/Esker/Billtrust newsrooms; Brenntag corporate news (Knowde partnership, Q2 2026); Siemens/arXiv (GraphRAG landscape).

**Funding environment**: Crunchbase News & PitchBook (H1 2026 venture records); New Market Pitch (agentic/vertical AI deal data); Carta via Flowjam/Foundra (seed/Series A benchmarks); Value Add VC (Series A bar, inference costs, multiples); Fortune (Sequoia "Services: The New Software"); BVP State of AI; Forbes (pilot-ARR skepticism); Wildfire Labs (seed-strapping); SaaS Mag/Avante Ventures (AI gross margins); Aventis/L40/Livmo (SaaS multiples); WePitched (2026 agentic seed requirements).

**Buyers/GTM**: Avasant/Computer Economics (distribution IT spend); DCKAP/B2Sell/Greywolf (P21 integration reality); 6sense/Top10ERP/Scaled Solutions (ERP share); Proton customer pages (MSC, Aquifer); Conexiom/Esker/checkthat.ai (pricing benchmarks); DataToolIndex (Zilliant); AD HQ & NetPlus Alliance & ISA & Datacor-NACD (channel programs); Aurora Inbox/Wapikit (WhatsApp B2B geography); Optifai/HumanR (sales-cycle benchmarks).

**Technical**: full repository audit at HEAD `b3cce4c`, August 20, 2026 (claim-by-claim verification against `docs/investor_memo.md` and `LEADERSHIP_REVIEW_MARCH_2026.md`).

---

*Next review: November 2026, or upon signing the first design partner — whichever comes first.*
