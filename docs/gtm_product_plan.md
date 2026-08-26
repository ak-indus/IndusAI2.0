# GTM & Product Plan — The Operated Quote Desk

**Date**: August 26, 2026
**Classification**: Confidential — Internal Strategy / Board Use
**Builds on**: `docs/niche_validation.md` (niche verdict), `docs/technical_validation.md` (architecture), `FUTURE.md` §6 (operate model). Every claim below carries either a validation verdict or a named, sourced customer anecdote — assertions without evidence were cut.
**Structure**: modeled on the motion-screening discipline of an internal framework document reviewed August 2026 (each motion = quantified value pool → production reference scoped to a *confirmed outcome* → candidate customers by three criteria → honest product-readiness flags). That framework's core diagnosis — the unresolved gap in operations is *end-to-end resolution*, not steps — was independently validated (MIT NANDA 95%-of-pilots-fail; Forrester "few are catching"; Gartner >40% agentic failure by 2027).

---

## 1. Thesis

> **IndusAI operates complex-quote and order-exception desks for mid-market industrial distributors — starting with PVF and fastener/bearing houses — resolving each document end-to-end: received → parsed → cross-referenced → priced → compliance-complete → posted in the ERP → acknowledged, under SLA, priced per resolved document.** The copilot incumbents (Canals $35M, Faction, Conexiom, Esker) automate the clean 80% and hand the exception tail back to the customer's shrinking desk staff. We take accountable ownership of the whole outcome — the one slot in this market no funded competitor occupies — and every human correction compounds into the cross-reference asset that makes the desk smarter than any tool the customer could buy.

Why the *outcome* framing is the wedge, in the market's own numbers: Conexiom's best case is ~87% touchless — the residual 13–17% is definitionally the hardest, highest-value documents. Esker's benchmark average is 67%. The industry's most senior estimators are retiring ("if the most senior estimator left, BOM quoting capability may not survive" — Intuilize). And speed is revenue: buyers form supplier preference within 4 hours of an RFQ, first responders win at disproportionate rates (HBR: responding within an hour = 7x more likely to reach the decision-maker), while the industry averages 24–72 hours to quote.

---

## 2. Motion 1 — PVF Operated Quote Desk (primary)

**[Customer Value & Buyer].** PVF quote desks carry the highest labor density documented in industrial distribution: Faction's $1B PVF customer ran **300+ reps manually quoting and entering orders** (~30 desk FTEs per $100M revenue) with hiring unable to keep pace. A 100+ line BOM quote turns around in **days**; three distributors quoting the same BOM return different products, partials, and substitutions; manual keying runs 60–90 minutes per 100-line document at a 1–4% line error rate costing $50–150 per error. **Buyer: the VP of Sales or owner** needs quote turnaround in hours not days (the win-rate lever — see Turtle & Hughes below), desk capacity without hiring against a labor market that isn't supplying estimators, and error containment. Value per $100M distributor: $250–400K of desk labor on quoting/keying plus the win-rate swing — 2 points of win rate on a $30–60M quoted book is $120–300K of margin.

**[Production Reference].** One exception type, end-to-end: **an emailed 100+ line BOM RFQ containing customer part numbers and spec callouts, resolved to a sent, ERP-registered quote within a 4-hour SLA** — parse (including Excel attachments, photos, non-standard formats — the Puget Sound scope), cross-reference every line to stocked SKUs with substitutions flagged, price per the customer's matrix, assemble the submittal/MTR documentation where required, register in Eclipse, send, and confirm receipt. Exceptions (unmatchable lines, price overrides) route to our named exception team, whose corrections write to the crosswalk.

**[Candidate Customers — three criteria: scale ($75M+ for operated tier / $20M+ for license), operating model (project-quote-heavy PVF or industrial pipe), organizational readiness (named VP Sales/Ops, Eclipse or P21)].** The proof this profile buys: **Puget Sound Pipe & Supply** (family-owned since 1917 — hour-plus manual quotes now minutes on Canals, on Eclipse, with no ERP customization) and **Turtle & Hughes** (~$500M, 100 years old: quote win rate through the AI channel hit **57% vs. a ~20% historical average** — the single best revenue proof in the category, in the customer's own words: "customers realize that when they come to you, you're more responsive… you'll see not only top-line growth, but also bottom-line growth"). Target list: ASA members (ASA covers ~90% of the Premier 150 PHCP-PVF wholesalers), AD PVF and Victory PVF (50+ independents) rosters, and the March GTM doc's Tier 2 industrial names (FCX Performance — flow control is PVF-adjacent; DXP; R.S. Hughes for the industrial expansion).

**[Product Readiness — honest flags].** The extraction/validation pipeline is architecture-validated but unbuilt for BOMs specifically (line-item tables are the documented weak spot of every extraction stack; the structure-aware parse layer and per-line routing in `docs/technical_validation.md` §1 exist precisely for this). The Eclipse connector requires the customer's Premium API bundle for order writes — verified, and a discovery-call qualifier. Submittal/MTR document assembly is net-new build. Touchless expectations set per the validated curve: 55–65% blended in months 0–6, 80–88% by month 24, with fax/handwritten volume carved out and priced separately.

---

## 3. Motion 2 — Fastener/Bearing Cross-Reference Desk (co-launch)

**[Customer Value & Buyer].** The highest cross-reference intensity in industrial commerce: customer part numbers, competitor interchanges, print callouts, cert requirements (DFARS, material certs) on high-line-count, low-ticket orders — the exact document flow where AI + exception desk + accumulated crosswalk compounds fastest. The demand signal is distributors resorting to DIY: **Packer Fastener built its own AI quoting tool through Microsoft's AI Co-Innovation Lab, targeting automation of up to 75% of quote transactions** — a mid-market distributor does not do that when a credible vendor exists. Competition is the thinnest of any industrial sub-vertical: BoltWise (unfunded, fastener-only, software-only); **no AI quote/order vendor exists on the bearing/power-transmission side at all**.

**[Production Reference].** An emailed multi-line fastener/bearing order or RFQ with mixed customer part numbers and competitor SKUs, resolved end-to-end: every line cross-referenced (our bearing/metric-fastener/belt parsers run first — zero-cost, zero-hallucination — then crosswalk, then hybrid retrieval + rerank per the validated cascade), certs attached, ERP-posted, acknowledged. Same SLA discipline, same per-clean-document pricing.

**[Candidate Customers].** NFDA (150+ fastener companies), PTDA (bearing/PT channel), Pac-West, STAFDA; the March list's Bossard ("our entity extraction is purpose-built for this" — still true) and Kimball Midwest (scored 23/25 in the March qualifying matrix). Operated tier fits ~$30M+ firms replacing a 3–5-person quote desk; below that, license only.

**[Product Readiness].** Strongest asset transfer in the portfolio — the parsers exist and are the most defensible IP in the repo (audit finding). Niche ERPs (Business Edge, INxSQL) are fragmented: launch email-native with CSV/file hand-off, integrate later — validated as the standard pattern for closed systems.

**Why co-launch**: PVF BOMs carry gaskets, studs, and fasteners — the crosswalk compounds *across* both motions, and the same industrial-MRO buyers overlap.

---

## 4. Motion 3 — Chemical Compliance-Exception Desk (re-entry, month 9+)

Chemicals was the March beachhead; the niche validation demoted it: **Datacor shipped agentic sales-order automation (orders from PDFs) in its Winter 2026 release**, ShelfCycle ($4M) is rebuilding the chemical ERP AI-native, and 47% of chemical companies prefer AI from their existing software vendor. Re-enter where the ERP feature doesn't operate: **the regulated-document exception layer** — CoA lot-mismatch resolution, SDS-revision distribution exceptions (dual-format GHS Rev 3/Rev 7 through the 2027 mixture deadline), DEA listed-chemical order gating (authorized-agent verification, anomaly flags per 21 CFR 1310.07) — sold as an operated service to ACD members (~450 companies, ~85% of US capacity) with audit logs formatted for Responsible Distribution verification. The chemical assets (CAS parser, 18-industry taxonomy, Sea-Land→Evonik wedge, Tier 0/1 target list) stay warm for this. Evidence the appetite exists: Palmer Holland bought O2C automation years ago; Cynamic and Lewis Chemical are on the record adopting Datacor's AI; Trans Western publicly describes applying AI to quoting and TDS/SDS retrieval.

---

## 5. Channel Plan (validated mechanics only)

The buying-group thesis was tested and **partially refuted**: endorsements follow traction on 1–3 year clocks (Proton: 2023 partnership → 2026 AD Service Provider status; Suppli had 4+ AD-member customers *before* selection), and no vendor anywhere has published evidence that endorsement shortens cycles. The validated sequence:

1. **Phase 0 (now–day 90) — media-warm-started direct sales.** Buy the **DSG Applied AI for Distributors presenting slot ($12,500 — includes a 25-minute mainstage talk and the post-event attendee contact list; capped at six sponsors)** and/or the Atlanta forum equivalent; one MDM/DSG webinar. Work the attendee list directly. This is the only channel with published costs, a self-selected AI-buyer audience, and +30%/yr attendance. Simultaneously: founder-led outreach into ASA/NFDA/PTDA member lists with the paid-pilot offer.
2. **Paid pilots only — never free.** $10–25K / 90 days with a forward-deployed engineer, success criteria contracted upfront in cost-out terms (touchless %, quote turnaround, error rate). This is the documented pattern of every winner in the 2024–26 cohort (Comena: six-figure ARR in its first month via paid FDE pilots; Faction: live at a $1B account in 4 weeks). Free pilots have no precedent among winners and invite the pilot fatigue VCs now warn about.
3. **Phase 1 (day 90–month 9) — associations as credibility, not pipeline.** Join NetPlus (free for suppliers), ISA membership + Business Solutions listing (accepting that Endeavor is already there), ASA; exhibit once. Expect these to de-risk deals sourced elsewhere.
4. **Phase 2 (month 9+) — endorsement from installed base.** Pursue AD PVF/Victory PVF service-provider status only with 5+ member customers; budget member rebates into pricing (the observable currency of AD's ecosystem). ACD sponsorship gates the chemical re-entry.
5. **Parallel, uncontested**: the **PE-platform motion** — one operating-partner relationship at a distributor roll-up (Solve/Singer-class), positioning the desk as the post-acquisition standardization layer; unproven as a channel but zero competitors are running it.
6. **Trust ladder on every account** (validated against the category-creation risk): co-pilot (their CSRs approve) → internal exceptions only → **after-hours/overflow customer-facing** (the one slot where distributors already accept third parties — the AnswerNet/Moneypenny precedent) → full desk at renewal. CSRs are "promoted to proactive selling," never replaced — the only framing that survives a family-owned culture (56–75% of the segment) and the finding that the real fear is customer defection, not labor cost.

---

## 6. Pricing (validated bands)

| Tier | Price | Basis |
|---|---|---|
| Paid pilot | $10–25K / 90 days | Inside a VP's discretionary budget; the winners' pattern |
| **License / co-pilot** | **$25–75K/yr** = platform fee + per-document | Squarely in the proven Esker band ($36–120K mid-market); restructured so small desks enter near $25K — a flat $75K at a $30M distributor loses to Proton (~$50–150/user/mo) and ERP-native |
| **Operated desk — entry** | **$8–15K/mo ($96–180K/yr)** scoped to overflow + after-hours + exception desk | Repriced per demand validation: full-desk-as-landing restricted the ICP to the top of the band |
| Operated desk — expansion | $20–25K/mo ($240–300K/yr) full desk | = 1.8–3.5 loaded CSRs ($74–95K each — validated); pencils at $75M+ revenue / 4+ desk FTEs only |
| Unit anchor | $2.50–4.50 per **clean** document, exceptions bounced free; validate the number in discovery (no public Conexiom/Esker per-doc rate exists) | Per-solve logic (Crescendo $1.25–2.25/solve; Sierra ~$1.50/resolution; order lines carry more value) |

Contract mechanics per FUTURE.md §6.5: committed volume, 2–3-year term, planned month-13 step-down, ≥99% line-accuracy SLA audited by sampling (300–800 lines/account/month), no charge for misprocessed documents, 60-day out if SLAs missed twice, liability capped at 12-month fees with AI-affirmative E&O in place before the first paid contract.

---

## 7. The Narrative Assets (anecdotes by slide, all sourced in the research library)

**Pain**: Kalra (2nd-gen distributor founder): "the team didn't have time to go after new accounts; they were too busy processing what was already on their plate." Sonepar's SVP Digital: OCR "is fragile and requires high transaction volumes to justify the cost" — the mid-market wedge argument from a $35B incumbent's own mouth. Rexel Canada: 70% of orders manually keyed before automation. 63% of distributors say CSRs spend half the day on entry/quoting.
**Proof**: Turtle & Hughes 20%→57% quote win rate; Viking Group 91% touchless with corrections 600+/day→<50 in a month; ClarkDietrich 250,000+ AI quotes with a president-level quote; Sonepar 1,000+ hours/month repurposed (republished by NAW); Werner Electric 6,263 hours/year, 96→100% accuracy; MSC call center 20x upsell revenue; R.S. Hughes 3x profit per dollar (trade-press-carried); Faction live at $1B PVF account in 4 weeks.
**Fear**: Amazon Business $60B annualized with agentic ordering ("evolve or die" — K/E Electric GM, on the record); Fastenal at 61.6% digital compounding 14.7% while mid-market volume is flat; DSG's AI 25 leaderboard formalizing the divide; McKinsey's "coming shakeout."
**Expansion (year 2+)**: Coca-Cola FEMSA — 15% of ALL orders via WhatsApp at 80% conversion; India distributors ordering by WhatsApp voice note — the international messaging thesis parked, not dead.
**Usage caution**: anchor decks on the ✅-flagged items (Rexel investor deck, Sonepar/NAW, R.S. Hughes trade press, HBR response-time study); vendor-published numbers (Turtle, Viking, MSC 20x) get cited with attribution, never as our own claims.

---

## 8. Twelve-Month Plan & Targets (honest edition)

| Months | Milestones | Gate (from `docs/niche_validation.md` §3) |
|---|---|---|
| 0–1 | Repo integrity P0s (CI green, auth, simulator deleted); DSG sponsorship booked; 20-target PVF/fastener list built from ASA/NFDA/PTDA | — |
| 1–3 | BOM extraction pipeline + crosswalk seeding live on one design partner's real documents (shadow mode); customs challenger sprint (10 broker conversations) runs in parallel | **G1 (day 90): working pipeline demo. G2: ≥2 paid pilots. G3: challenger comparison** |
| 3–6 | 3–4 paid pilots converting at $25–75K license; first Eclipse write-back in production; exception workbench + reason-coded correction capture live; compliance/security Stage A complete | — |
| 6–9 | First account up the trust ladder to paid overflow/exception operation ($8–15K/mo); SOC 2 Type I in hand; flywheel chart (corrections/week, touchless curve) exists | **G4: operated proof. G5: flywheel compounding** |
| 9–12 | 5–7 total accounts; **$300–500K production revenue run-rate**; chemical re-entry scoped with 2 ACD-member conversations; seed conversations from evidence (curve, cohort margins) — or a deliberate seed-strap decision | — |

Fallback if G2/G3 flip to the challenger: the same engine (extraction, workbench, offshore desk, SLA orchestration) redeploys against customs entry-writing with licensed-broker partners; the prosecution's third option — white-label exception ops for the category winners — remains the strategic floor.

---

## 9. Top Risks (carried forward, ranked)

1. **Execution/dormancy** — the 90-day speed proof is the entire answer; nothing in this plan matters if G1 slips.
2. **Copilot incumbents add an operated tier** (Canals has $35M to do it) — mitigated only by moving first and owning the exception data; watch for a Canals services announcement as a leading indicator.
3. **Category creation on the operate tier** — mitigated by the trust ladder and entry-scoping to overflow (the validated precedent slot).
4. **Pilot purgatory** (93% priority / 16% production) — mitigated by paid-only pilots with contracted success criteria and the DSG-warm-started list.
5. **PE absorption of accounts** — hedged by the PE-platform motion (each acquisition becomes an expansion event if we're the platform's standard).

---

*Evidence base: eight validation workstreams + anecdote library, August 26, 2026 (extraction, ERP, retrieval, HITL/QA, compliance, channel, demand/pricing, niche tournament ×4, customer evidence). Key sources named inline; full URL sets in the underlying reports and in `docs/technical_validation.md` / `docs/niche_validation.md` / `FUTURE.md`.*
