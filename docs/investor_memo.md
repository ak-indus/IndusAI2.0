# IndusAI — Investor Memo
### The AI Operating System for Industrial & Chemical Distribution
**March 2026 | Confidential**

---

## Executive Summary

IndusAI is building the AI-native operating system for the $200B+ industrial and chemical distribution market — a sector that still runs on phone, fax, email, and legacy ERPs built in the 2000s.

The platform combines three capabilities that no competitor offers together:

1. **GraphRAG Product Discovery** — A knowledge graph + vector search hybrid that resolves natural language queries ("do you have a silicone defoamer for pulp & paper compatible with X?") in seconds, replacing 20+ minutes of manual TDS/SDS cross-referencing
2. **WhatsApp B2B Commerce** — The first purpose-built industrial ordering channel on WhatsApp, meeting buyers where they already communicate (98% open rates vs. 20% for email)
3. **Full Back-Office** — Complete O2C, P2P, quoting, invoicing, and RMA workflows in one stack, eliminating the 5-7 system integration tax distributors pay today

The result: a distributor's entire customer-facing stack — from product discovery through invoice payment — in a single AI-native platform.

---

## The Problem

### Industrial distribution is a $200B+ market stuck in 1995

- **15,000+ MRO distributors** and **500+ specialty chemical distributors** in North America alone
- The typical distributor runs Epicor/SAP + Salesforce + spreadsheets + phone/fax + a static eCommerce site
- **The customer experience**: Email or call, wait for a human to cross-reference catalogs and TDS/SDS PDFs, get a quote 4-24 hours later, place the order by phone
- **The distributor's pain**: Sales reps spend 60%+ of their time on non-selling activities (lookups, data entry, quote prep)
- **The technology gap**: ERPs manage operations but can't help a customer find the right product. AI chatbots can search but can't transact

### The specific workflows that are broken

| Workflow | Today | With IndusAI |
|----------|-------|-------------|
| Customer asks about a product | Rep spends 20 min cross-referencing TDS/SDS docs | GraphRAG answers in 3 seconds with sourcing options |
| Customer needs a cross-reference | Rep searches spreadsheets or calls manufacturer | Confidence-scored equivalencies returned instantly |
| Customer wants to order | Phone call → manual entry into ERP → confirmation email | WhatsApp message → auto-processed → confirmation in thread |
| Customer needs TDS/SDS | Rep searches file cabinets or supplier portals | Graph-linked, versioned documents served automatically |
| Assembly/rebuild kit request | Rep manually builds BOM from memory/catalogs | Graph traversal returns full BOM + alternatives |

---

## The Solution

### A 5-stage AI pipeline purpose-built for industrial commerce

```
Customer Message (WhatsApp / Web / Email)
    |
    v
[Stage 1] Intent Classification + Entity Extraction
    - 9 supplier-sales intents (order, quote, TDS request, returns, etc.)
    - Regex-based part number parsing (<1ms, $0 cost, no hallucination)
    - Supports bearings, fasteners, V-belts, CAS numbers, PO numbers
    |
    v
[Stage 2] Graph Resolution (Neo4j)
    - Exact SKU → cross-reference → fulltext → spec-based search
    - Traverses equivalencies, BOMs, compatibility chains
    - 25+ node types, 15+ relationship types
    |
    v
[Stage 3] Vector Fallback (Voyage AI, 1024-dim)
    - Semantic similarity when graph returns no exact match
    - Cosine similarity on product embeddings
    |
    v
[Stage 4] Context Assembly
    - Merges graph results + PostgreSQL inventory/pricing
    - Seller matching with composite ranking (price x reliability x distance)
    |
    v
[Stage 5] LLM Response Generation (Claude)
    - Task-routed: Haiku (intent) → Sonnet (response) → Opus (complex)
    - Returns formatted response with sourcing options, TDS links, alternatives
```

### What makes this different from "just another RAG chatbot"

| Generic RAG | IndusAI GraphRAG |
|-------------|-----------------|
| Flat vector store — no relationships | Knowledge graph with typed edges (EQUIVALENT_TO, COMPONENT_OF, REPLACES) |
| Can find a product by description | Can traverse "find all alternatives to this part that are stocked within 50 miles" |
| Hallucinates part numbers | Regex parser extracts part numbers with zero LLM cost, zero hallucination |
| Search only | Full commerce: discover → quote → order → invoice → deliver |
| Single channel | WhatsApp + Web + Email with session persistence |

---

## Market Opportunity

### Total Addressable Market

| Segment | # of Companies | Revenue Range | TAM (SaaS) |
|---------|---------------|---------------|------------|
| Specialty Chemical Distributors (NA) | ~500 | $10M-$500M | $300M |
| Mid-Market MRO Distributors (NA) | ~15,000 | $5M-$200M | $4.5B |
| Chemical Suppliers (Sales Teams) | ~200 | $1B+ | $600M |
| International (WhatsApp-first markets) | ~50,000+ | Varies | $5B+ |
| **Total SAM (Year 1-3 focus)** | | | **$5.4B** |

### Why now

1. **LLM cost collapse**: Claude Haiku intent classification costs $0.001/query — makes per-query economics viable at scale
2. **WhatsApp Business API maturation**: $45B WhatsApp economy in 2026, but 99% B2C — B2B is wide open
3. **Graph technology inflection**: >$5B market, GraphRAG delivers 60-90% accuracy improvement over vector-only RAG
4. **Distributor consolidation pressure**: Brenntag ($17.3B), Univar ($8.1B) building proprietary digital tools — independents need a platform to compete
5. **VC thesis alignment**: Vertical AI attracted $132.7B across 158 deals in 2025; manufacturing vertical saw 2.08x median valuation step-ups

---

## Competitive Landscape

### No competitor combines all three capabilities

| Capability | Proton.ai ($24M) | ChatMRO | Verusen ($38M) | Epicor | Datacor | Partium ($26M) | Paragon (YC) | **IndusAI** |
|---|---|---|---|---|---|---|---|---|
| AI Product Discovery | No | Partial | No | No | No | Visual | No | **GraphRAG** |
| Cross-Reference Engine | No | No | No | No | No | No | No | **Yes** |
| WhatsApp Commerce | No | No | No | No | No | No | No | **Yes** |
| Back-Office (O2C/P2P) | No | No | No | ERP | ERP | No | Partial | **Yes** |
| Chemical + MRO | No | MRO only | MRO only | Partial | Chem only | MRO only | MRO only | **Both** |
| Conversational Interface | No | Chat | No | No | No | No | No | **WhatsApp+Chat** |

### Competitor deep dive

**Proton.ai** (Cambridge, MA) — $24M raised, $7.2M revenue (2025), 65 employees
- AI-powered CRM for distributor sales reps. Identifies upsell/cross-sell opportunities
- **Gap**: Sales-side only. No buyer-facing discovery, no ordering, no WhatsApp. CRM add-on, not a platform
- **Our advantage**: Full buyer journey vs. sales rep productivity tool

**Partium** (Graz, Austria) — $25.8M raised, Series A (Sep 2024)
- Visual part recognition + text search across 350M+ OEM parts. Serves Caterpillar, Parker, Home Depot
- **Gap**: Search/identification only. No ordering, no commerce, no back-office, no chemicals
- **Our advantage**: We identify, quote, order, AND invoice. Graph captures relationships visual search can't

**Verusen** (Atlanta, GA) — $33-38M raised, 2025 Gartner Cool Vendor
- MRO inventory optimization for manufacturers. Materials harmonization, spend analysis
- **Gap**: Internal optimization for manufacturers, not distribution commerce. No customer-facing capability
- **Our advantage**: Different market — they optimize what you have, we help you sell

**Epicor/Infor/SAP** — Incumbent ERPs
- $150-500/user/month. 6-18 month implementations. AI features limited to back-office automation
- **Gap**: No AI product discovery, no conversational commerce, no WhatsApp. Legacy architectures
- **Our advantage**: AI-native platform that layers on top or replaces the customer-facing stack

**Datacor** — Leading chemical distribution ERP
- Winter 2026 added AI for financial workflows. Back-office focused
- **Gap**: No AI buyer experience, no conversational commerce, no knowledge graph
- **Our advantage**: AI-first for the buyer experience; Datacor manages operations, we transform how chemicals are discovered and ordered

**Brenntag/Univar/ChemPoint** — Large chemical distributors ($8-17B revenue)
- Building proprietary digital tools for their own businesses
- **Gap**: Not available to other distributors. No AI discovery or conversational commerce
- **Our advantage**: We empower independent distributors to compete digitally with the giants

### Three strategic moats

1. **WhatsApp B2B Industrial Commerce** — Near-zero competition. $45B WhatsApp economy is 99% B2C. No platform handles B2B industrial complexity (credit terms, SDS compliance, lot tracking, multi-line POs) on messaging channels

2. **GraphRAG for Product Discovery** — First mover. 60-90% accuracy improvement over vector-only RAG. Enables relationship-aware discovery (cross-refs, substitutes, compatibility chains, spec matching) that flat search cannot match. No competitor applies GraphRAG to industrial distribution

3. **Full-Stack Vertical Integration** — Every competitor covers 1-2 pieces. ERPs lack AI discovery. AI tools don't transact. Chat platforms lack domain knowledge. We unify discovery + commerce + operations, eliminating the 5-7 system integration tax

---

## Go-To-Market Strategy

### Phase 1 (Months 1-3): Specialty Chemical Distributors — The Beachhead

**Why start here:**
- The ChemPoint ingestion pipeline, TDS/SDS graph integration, CAS number extraction, and 18-industry taxonomy are already built
- These distributors have the exact pain point: customers email asking "do you have X for Y application?" and a human spends 30 minutes answering
- ~500 specialty chemical distributors in North America, most $10M-$500M revenue, running on Salesforce + spreadsheets
- Short sales cycle (2-4 weeks with warm intro) — they feel the pain daily

**The wedge:**
> "Your customers email you asking about products. Today a human takes 20 minutes to look up the TDS, check inventory, find alternatives, and reply. We make that 30 seconds."

Don't sell the full platform. Sell AI email triage / auto-response. Land with email → expand to WhatsApp → expand to full back-office.

**Target:** 5-10 customers at $3-5K/month = $180-600K ARR

### Phase 2 (Months 3-6): Chemical Supplier Sales Teams — Flip the Model

**Why:**
- Sell to suppliers (BASF, Dow, Evonik, Clariant) whose technical sales reps field the same questions
- Bigger budgets, faster procurement
- The GraphRAG + industry taxonomy answers "which product works for adhesives in automotive?" across their entire portfolio

**Target:** 3-5 suppliers at $10-25K/month = $360K-1.5M ARR

### Phase 3 (Months 6-9): Mid-Market MRO Distributors

**Why:**
- 15,000+ distributors in North America, massively underserved by technology
- Cross-manufacturer part resolution (SKF→NSK→FAG) solves a daily pain
- Full back-office replaces cobbled-together ERP + phone/fax
- Requires multi-tenancy (build in Phase 2)

**Target:** 10-20 customers at $2-4K/month = $240K-960K ARR

### Phase 4 (Months 9-12): WhatsApp-First International Expansion

**Why:**
- India, Latin America, Middle East, Southeast Asia — WhatsApp IS business communication
- Zero competition for B2B industrial WhatsApp commerce in these markets
- The platform is already WhatsApp-native

**Target:** 10-20 international customers = additional $240K-960K ARR

### Year 1 ARR trajectory

```
Month 3:   5 chemical distributors              = ~$200K ARR
Month 6:  +3 chemical suppliers + 5 more dists  = ~$800K ARR
Month 9:  +10 MRO distributors                  = ~$1.2M ARR
Month 12: +international expansion              = ~$1.5-2M ARR
```

---

## Business Model

### Pricing architecture

| Component | Model | Rationale |
|-----------|-------|-----------|
| Platform fee | $1-2K/month | Covers infrastructure, ensures baseline revenue |
| Per-query fee | $0.10-0.50/GraphRAG query | Aligns cost with LLM spend, scales with value |
| Per-seat | $50-100/user/month | Standard SaaS, drives seat expansion |
| Data ingestion | $500-2K one-time per catalog | Covers scraping/normalization effort |
| Knowledge graph tier | 1K / 5K / 25K products | Natural upsell as customers add product lines |

**Blended target: $4-8K/month per customer = $50-100K ACV**

### Unit economics

| Metric | Value |
|--------|-------|
| Cost per GraphRAG query | ~$0.012 (Haiku intent $0.001 + Sonnet response $0.01 + Neo4j ~$0.001) |
| Value per query (rep time saved) | $5-15 (15-30 min of technical sales rep time) |
| **Query-level ROI** | **400-1,250x** |
| Gross margin (at scale) | 80-85% |
| CAC (estimated, with warm intros) | $5-10K |
| LTV (3-year, 90% retention) | $150-300K |
| **LTV:CAC** | **15-30x** |

### Expansion mechanics

1. **Seat expansion**: Start with 2-3 sales reps → expand to full team (5-15 seats)
2. **Product line expansion**: Start with one catalog → add supplier catalogs → knowledge graph grows
3. **Channel expansion**: Start with email auto-response → add WhatsApp → add web portal
4. **Module expansion**: Start with discovery → add quoting → add O2C → add P2P/invoicing
5. **Data flywheel**: Each customer's catalog makes the cross-reference engine smarter for everyone

---

## Product Architecture

### Technology stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Knowledge Graph | Neo4j (vector + fulltext + graph indexes) | Relationship-aware queries, embedding storage, multi-hop traversal |
| AI Pipeline | Claude (Haiku/Sonnet/Opus task-routed) | Cost optimization per task complexity |
| Embeddings | Voyage AI (voyage-3-large, 1024-dim) | Best-in-class for technical/scientific text |
| Entity Extraction | Custom regex parsers (zero LLM cost) | Domain-specific, <1ms, no hallucination |
| Backend | FastAPI (async Python) | High concurrency for messaging workloads |
| Database | PostgreSQL (inventory, orders, invoicing) | Transactional integrity for commerce |
| Session/Cache | Redis (24hr TTL) | Conversation state persistence |
| Ingestion | Firecrawl + custom scrapers | Renders JS-heavy supplier sites, handles auth walls |
| Messaging | WhatsApp Business API + SendGrid + Twilio | Multi-channel with circuit breaker fallback |

### Knowledge graph schema (25+ node types)

```
Part ──EQUIVALENT_TO──> Part (confidence: 0.95)
  │──ALTERNATIVE_TO──> Part
  │──COMPONENT_OF──> Assembly (position, quantity)
  │──MANUFACTURED_BY──> Manufacturer
  │──BELONGS_TO──> Category ──SUBCATEGORY_OF──> Category
  │──HAS_SPEC──> Specification (value, unit)
  │──HAS_TDS──> TechnicalDataSheet (revision_date, pdf_url)
  │──HAS_SDS──> SafetyDataSheet (cas_numbers, hazards)
  │──SERVES_INDUSTRY──> Industry (18 chemical industries)
  │──STOCKED_IN──> Warehouse (qty_on_hand, lead_time)
  └──HAS_PRICE──> PricePoint (unit_price, currency, MOQ)
```

### Key technical differentiators

1. **Hybrid retrieval chain**: Graph exact → cross-ref → fulltext → vector fallback (near-zero "I don't know")
2. **Domain-specific parsers**: Bearings (6204-2RS), metric fasteners (M8x1.25x30), CAS numbers (7732-18-5) — regex, not LLM
3. **LLM task routing**: Haiku for intent ($0.001), Sonnet for responses ($0.01), Opus for complex reasoning — 10x cost savings vs. single-model
4. **Circuit breaker on AI**: Graceful fallback to hardcoded responses if LLM service fails
5. **Confidence-scored cross-references**: Every equivalency has provenance (manual/fuzzy/cross_ref) and confidence (0.0-1.0)
6. **4-stage ingestion pipeline**: Parse → Normalize → Resolve (fuzzy dedup) → Build (graph + embeddings) — new catalogs live in 48 hours

---

## Traction & Milestones

### Current state

- Full-stack platform built: GraphRAG engine, 5-stage AI pipeline, O2C/P2P/invoicing, WhatsApp integration
- ChemPoint ingestion pipeline operational with 18-industry chemical taxonomy
- MRO taxonomy covering 8 major categories (bearings, fasteners, power transmission, seals, motors, hydraulics, electrical, safety)
- Domain-specific entity extraction for bearings, fasteners, V-belts, CAS numbers
- Cross-reference engine with confidence scoring

### Near-term milestones

| Milestone | Timeline | Impact |
|-----------|----------|--------|
| First paid chemical distributor pilot | Month 1-2 | Product-market fit validation |
| 5 paying customers | Month 3 | Seed-stage proof point |
| Multi-tenancy | Month 3-4 | Unlocks MRO distributor segment |
| First chemical supplier enterprise deal | Month 4-6 | Validates higher ACV motion |
| $500K ARR | Month 6 | Series Seed milestone |
| International pilot (WhatsApp-first market) | Month 8-10 | Geographic expansion proof |
| $1M ARR | Month 10-12 | Series A readiness |

---

## The Ask

### Seed Round: $2-3M

| Use of Funds | Allocation | Purpose |
|--------------|-----------|---------|
| Engineering | 50% | Multi-tenancy, catalog import tooling, enterprise features (SSO, audit logging) |
| GTM | 30% | First 10-20 customers, industry events, demo environment per prospect |
| Operations | 20% | Infrastructure, LLM costs, legal, compliance |

### What this capital buys

- 12 months of runway to reach $1-2M ARR
- 20-30 paying customers across chemical distributors, MRO distributors, and chemical suppliers
- Proof of geographic expansion (1-2 WhatsApp-first international markets)
- Series A readiness with demonstrated product-market fit, repeatable sales motion, and net dollar retention >120%

---

## Why This Team / Why Now

### Why now

1. **LLM economics just crossed the threshold** — per-query costs ($0.012) are now 400-1,250x below the value created ($5-15 of rep time). This was not possible 18 months ago
2. **WhatsApp Business API is mature** — $45B economy, but B2B industrial is untouched
3. **GraphRAG is production-ready** — 60-90% accuracy gains over vector RAG, but no one has applied it to distribution
4. **Consolidation is accelerating** — Brenntag/Univar building proprietary digital moats. Independent distributors need a platform NOW or they get absorbed
5. **VC thesis alignment** — Vertical AI is the dominant investment category ($132.7B in 2025). Industrial is the largest underserved vertical

### The 90-second demo that closes

```
1. Customer email arrives: "Do you have a silicone-based defoamer for pulp & paper,
   viscosity under 500 cSt, that's compatible with our existing Dow system?"

2. GraphRAG resolves in 3 seconds:
   → Extracts: industry=pulp_paper, type=defoamer, spec=viscosity<500, compatible=Dow
   → Graph traversal finds 3 matching products across 2 suppliers
   → Adds inventory status, pricing, TDS links

3. Draft response appears with:
   - 3 product options with specs, pricing, and delivery estimates
   - TDS/SDS download links
   - "Add to Quote" and "Request Sample" buttons
   - Note: "Product B is Dow-compatible per TDS Rev. 2025-11"

4. Rep clicks "Send" → customer receives on WhatsApp

Before: 20 minutes. After: 30 seconds. ROI: immediate.
```

---

## Appendix: Key Market Data

- Industrial distribution market (NA): $200B+ annually
- Number of MRO distributors (NA): ~15,000 (ISA data)
- Number of specialty chemical distributors (NA): ~500
- Brenntag revenue: $17.3B | Univar enterprise value: $8.1B | IMCD revenue: $5.39B
- WhatsApp Business economy: $45B (2026 projected)
- WhatsApp MAU: 3.5B | Message open rate: 98% (vs. email 20%)
- Vertical AI VC investment: $132.7B across 158 deals (2025)
- Manufacturing vertical valuation step-up: 2.08x median
- Graph technology market: >$5B (2026, Gartner)
- GraphRAG accuracy improvement over vector-only: 60-90%+
- Proton.ai (closest comp): $24M raised, $7.2M revenue, 65 employees — CRM only, no discovery
- Partium (part search): $25.8M raised — search only, no commerce

---

*This document is confidential and intended for prospective investors only.*
