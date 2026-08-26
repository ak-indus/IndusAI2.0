# Who To Target & What To Build — The Operating Plan

**Date**: August 26, 2026
**Classification**: Confidential — Internal / Execution
**Purpose**: Convert the validated verdict (`docs/sustainable_business.md` §6 — the division-order transfer & suspense desk, minimum viable form) into names, scripts, and a build list. This is the execution document; strategy questions are settled upstream.

---

## 1. WHO — Targets

*(Compiled from named-target research, August 26, 2026 — see §1.1–1.4 below.)*

<!-- TARGET LIST INSERTED FROM RESEARCH -->

---

## 2. THE OFFER — What you sell (in the buyer's words)

Two products, sold in sequence. Language matters: never "AI platform"; always the outcome.

### 2.1 The wedge: the Suspense Ledger Risk Review (paid diagnostic, $7.5–15K, 2–3 weeks)
"Send us your suspense ledger export and owner master. We return: (a) an aging analysis with **escheat-deadline flags by state** (what must move before it's remitted or penalized), (b) a root-cause breakdown (deceased owners, bad addresses, unexecuted transfers, title disputes), (c) your **wrongful-suspense interest exposure** (Oklahoma's 15% statute makes this a real number), and (d) a prioritized cleanup plan priced per file." This is the validated compliance framing — *audit-proof your ledger, stop the interest clock* — never "we find money" (the contingency framing is legally dead per validation). It's cheap enough for a Land Manager's signature, produces the data that prices engagement two, and is deliverable by two people in weeks.

### 2.2 The engagement: the Transfer Desk (per-file + retainer)
"We process your ownership transfers end-to-end — death, divorce, sale, trust — from document intake through requirement letters, curative packet assembly, W-9 collection, and a ready-to-post DOI deck change, each file closed with an audit-ready evidence folder. **$150–400 per resolved owner file** by complexity tier, or a monthly retainer for all inbound transfers. Attorney review on heirship determinations included." Post-acquisition variant (the trigger-event pitch): "You just closed on [asset]. That's [N] owners to re-deck and a transfer wave your two-person land team can't absorb — we're the surge desk."

**Guardrails from validation (non-negotiable):** operator pays, never the owner; no percentage of released funds; attorney-in-the-loop on heirship; Texas PI license obtained early as cheap insurance; every heirship output framed as "curative documentation for your review," not legal determination.

---

## 3. WHAT TO BUILD — By phase, with explicit not-builds

### Phase 0 (weeks 1–3): Build nothing. Assemble.
- **Hire the fractional CDOA** (retired/semi-retired, NADOA network) — 10–15 hrs/week, hourly + per-file bonus. This person is credibility, QA, and the door-opener. This is the single most important "build."
- **Materials, not software**: a 2-page service sheet for the Risk Review; the discovery-call script (§4); a sample Risk Review report built on synthetic data (10 pages, looks like the real deliverable); engagement-letter template with the liability guardrails; a Drive/Dropbox intake structure per client.
- Working tools: a shared inbox, a spreadsheet tracker, Claude with careful prompts operated by you. That is the entire phase-0 stack.

### Phase 1 (weeks 3–8, only after the first paid Risk Review): internal tooling behind the curtain
Build in this order — each item exists to make the two of you faster, none is customer-facing:
1. **Suspense ledger analyzer**: ingest CSV exports from PakEnergy/W Energy/Quorum (get real export formats from client #1 — do not guess schemas), compute aging, map state escheat deadlines and interest exposure, cluster by root cause, emit the Risk Review report skeleton. ~1 week of work; it turns a 3-week diagnostic into a 1-week one.
2. **Document intake & extraction**: classify and extract the six document types that dominate transfer files — death certificates, wills/probate orders, affidavits of heirship, deeds/assignments, trust documents, W-9s — using the validated extraction pattern (vision extraction + dual-call verify + field-level confidence; the architecture from `docs/technical_validation.md` §1 applies unchanged, pointed at probate documents instead of POs).
3. **Transfer-file workbench** (internal): one screen per owner file — required-documents checklist by transfer type and state, extracted fields beside source pages, requirement-letter generator (mail-merge grade), status/aging, and **reason-coded corrections** captured from day one (the switching-cost asset, engineered deliberately).
4. **Deliverable generators**: the audit-ready evidence folder (indexed PDF binder per closed file) and the monthly client report (files closed, aging, exposure retired). The *deliverables* are what the client sees — polish these before any UI.

### Phase 2 (month 3+, only after two renewing clients): productize the desk
SLA commitments on intake-to-requirements-letter time; a client-visible status portal (read-only list — nothing more); direct write integration with the client's land/accounting system only when a client asks and pays; the cross-client ownership-genealogy index (families/trusts/addresses recur across operators in a basin — begin linking only when client #3 exists, with clean data-rights language in the engagement letter).

### Explicit NOT-builds (each killed by a validation finding)
- **No ERP/land-system integration in phases 0–1** — CSV in, formatted deck-change sheet out; their team posts it. (Integration gating killed other theses; don't import the problem.)
- **No owner-facing portal or owner outreach automation** — owner contact stays on client letterhead through client-approved templates (finder-fee/PI statutes live here).
- **No Neo4j, no multi-tenant platform, no WhatsApp, no chat UI** — the repo's existing chassis stays parked; only the extraction/eval patterns transfer.
- **No self-serve SaaS tier** — the validated buyer buys outcomes; a tool tier re-enters the commoditized layer where entrants die.
- **No second desk** — someday-list, Series-A-scale decision (validation: zero comparables ran portfolios).

---

## 4. THE MOTION — Scripts and sequence

**Discovery call opener (Land Manager / DO Supervisor):** "We run transfer and suspense files for operators — the death-and-divorce paperwork your analysts are buried under. Two questions and I'll know if we can help: roughly how many owners are in suspense right now, and how long does a deceased-owner transfer sit before it's fully re-decked?" *(Both answers are the qualification and the pricing input. If they say "we're caught up," ask about the last acquisition — re-decking backlog hides there.)*

**Qualification (pursue / park):** pursue if: 300+ owners in suspense OR a 2024–26 acquisition OR an unfilled DO-analyst posting older than 60 days OR a two-person-or-smaller land admin team at 2,000+ owners. Park if: fully outsourced to Valor/PetroLedger already (call back in 12 months with a benchmark), or in an active corporate sale process.

**Sequence (the 60-day gate from `docs/sustainable_business.md` §6.3):**
- Weeks 1–3: CDOA hired; 20–25 discovery calls booked via NADOA chapters + the target list below; sample Risk Review in hand.
- Weeks 3–6: 3–5 Risk Review proposals out; **2 paid** ($7.5–15K) is the gate.
- Weeks 6–10: deliver reviews; convert ≥1 into a per-file cleanup engagement; phase-1 tooling built against real documents.
- Day 60: **two paying engagements or the desk is killed** — and the fallback is not another analysis round; it is the salvage list already validated (white-label exception ops for the distribution-AI vendors; bearings/PT vertical software; MTR/traceability compliance for megaprojects).

**Pricing discipline:** Risk Review $7.5–15K fixed; cleanup files $150–400/file tiered by complexity (simple address/W-9 → full intestate heirship chain); transfer-desk retainer from ~$3K/month + per-file; annual compliance re-review as the renewal anchor. Never free — paid pilots were the one GTM finding that survived every round.

---

## 5. What the repo contributes (and what it doesn't)

Transfers: the extraction architecture (vision + dual-call verify + confidence routing), the eval/golden-set discipline, the exception-workbench pattern with reason-coded corrections, per-file cost accounting, and the entire validation method. Does not transfer: the distribution-domain code (parsers, taxonomy, WhatsApp/chat surface, platform UI) — parked, not deleted. The first repo work happens in phase 1, and it is small: the ledger analyzer and the six-document extractor, built against client #1's real files.
