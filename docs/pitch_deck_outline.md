# IndusAI — Pitch Deck Slide Outline
### 12-Slide Seed Deck

---

## Slide 1: Title
**IndusAI — The AI Operating System for Industrial & Chemical Distribution**
- Tagline: "From product discovery to invoice — in one AI-native platform"
- Seed Round | March 2026

---

## Slide 2: The Problem
**$200B+ market still runs on phone, fax, and 20-year-old ERPs**

Split screen visual:
- LEFT: Customer emails "Do you have a defoamer for pulp & paper compatible with Dow?"
- RIGHT: Sales rep opens 4 tabs (TDS PDFs, SDS folder, ERP inventory screen, pricing spreadsheet), spends 20 minutes, types a reply

Key stats:
- 15,000+ MRO distributors, 500+ chemical distributors in NA — most run Epicor + Salesforce + spreadsheets
- Sales reps spend 60%+ of time on non-selling activities (lookups, data entry, quote prep)
- ERPs manage operations but can't help customers find the right product
- AI chatbots can search but can't transact

---

## Slide 3: The Solution
**GraphRAG-powered product discovery + WhatsApp commerce + full back-office**

Demo screenshot flow (3-panel):
1. Customer message arrives (WhatsApp or email)
2. AI resolves: extracts entities → graph traversal → finds 3 products with specs, pricing, inventory, TDS links
3. Rep reviews and sends — 30 seconds total

Before/After:
- Before: 20 minutes, 4 systems, manual cross-referencing
- After: 30 seconds, 1 platform, AI-automated

---

## Slide 4: How It Works
**5-stage AI pipeline built for industrial commerce**

Visual pipeline diagram:

```
Message → Intent + Entity Extraction (regex, <1ms, $0)
       → Graph Resolution (Neo4j: SKU → cross-ref → fulltext → spec search)
       → Vector Fallback (Voyage AI embeddings, cosine similarity)
       → Context Assembly (merge graph + inventory + pricing)
       → LLM Response (Claude, task-routed by complexity)
```

Callout boxes:
- "Part numbers parsed by regex — zero hallucination, zero LLM cost"
- "Knowledge graph captures relationships vector stores can't: equivalencies, BOMs, compatibility"
- "Cost per query: $0.012 | Value per query: $5-15 | ROI: 400-1,250x"

---

## Slide 5: Why GraphRAG > Generic RAG
**Relationships are the product in distribution**

Two-column comparison:

| Generic RAG | IndusAI GraphRAG |
|-------------|-----------------|
| Flat vector store | Knowledge graph with 25+ node types, typed relationships |
| "Find a product matching this description" | "Find all alternatives to this part stocked within 50 miles with compatible specs" |
| Hallucinates part numbers | Regex parser, zero hallucination |
| Search only | Discover → quote → order → invoice |
| 1 channel | WhatsApp + Web + Email |

Graph visualization: Part → EQUIVALENT_TO → Part → COMPONENT_OF → Assembly → HAS_SPEC → Specification

---

## Slide 6: Product — Full Stack
**Discovery + Commerce + Operations in one platform**

Three columns:

**DISCOVER**
- GraphRAG product search
- Cross-reference engine (confidence-scored)
- TDS/SDS document retrieval
- Assembly/BOM resolution
- 18-industry chemical taxonomy + 8 MRO categories

**TRANSACT**
- WhatsApp commerce (interactive buttons)
- Quoting with lead times
- Order-to-Cash (credit check → approval → ship → deliver)
- Procure-to-Pay (PO → goods receipt → inventory)

**OPERATE**
- Invoicing & AR aging (current/30/60/90+)
- RMA / returns processing
- Inventory management with audit trail
- Dynamic pricing (quantity-based tiers)
- Workflow state machines (configurable per customer)

---

## Slide 7: Market Opportunity
**$5.4B SAM in NA alone — before international expansion**

Concentric circles:
- TAM: $10B+ (global industrial/chemical distribution SaaS)
- SAM: $5.4B (NA distributors + suppliers in target segments)
- SOM (Year 3): $50-100M (500-1000 customers)

| Segment | # Companies | ACV | SAM |
|---------|------------|-----|-----|
| Specialty Chemical Distributors | 500 | $50-60K | $300M |
| Mid-Market MRO Distributors | 15,000 | $30-50K | $4.5B |
| Chemical Supplier Sales Teams | 200 | $120-300K | $600M |

WhatsApp-first international (India, LATAM, ME, SEA): $5B+ additional TAM

---

## Slide 8: Competitive Landscape
**Every competitor covers 1-2 pieces. We cover all of them.**

Feature matrix (visual checkmarks):

| | Proton ($24M) | Partium ($26M) | Epicor | Datacor | **IndusAI** |
|---|---|---|---|---|---|
| AI Discovery | | | | | **GraphRAG** |
| Cross-Refs | | | | | **Yes** |
| WhatsApp | | | | | **Yes** |
| Back-Office | | | ERP | ERP | **Yes** |
| Chemical+MRO | | | | Chem | **Both** |

Three moats:
1. WhatsApp B2B Industrial Commerce (zero competition)
2. GraphRAG for Product Discovery (first mover)
3. Full-Stack Vertical Integration (only platform)

---

## Slide 9: Go-To-Market
**Land with email auto-response → expand to WhatsApp → expand to full back-office**

Timeline visual:

**Phase 1 (Mo 1-3): Chemical Distributors** — The Beachhead
- Wedge: "20 minutes → 30 seconds" email auto-response
- 5-10 customers, $3-5K/mo each → $200K ARR

**Phase 2 (Mo 3-6): Chemical Suppliers** — Flip the Model
- Sell to BASF/Dow/Evonik sales teams ($10-25K/mo)
- 3-5 suppliers → $800K cumulative ARR

**Phase 3 (Mo 6-9): MRO Distributors** — Scale
- Cross-manufacturer resolution (SKF→NSK→FAG)
- 10-20 customers → $1.2M ARR

**Phase 4 (Mo 9-12): International** — WhatsApp-First Markets
- India, LATAM, ME, SEA — zero competition
- → $1.5-2M ARR

---

## Slide 10: Business Model & Unit Economics
**Profitable from customer #1. 96% gross margins. Self-funding by month 3.**

| Component | Model |
|-----------|-------|
| Platform fee | $1-2K/month |
| Per-query | $0.10-0.50/GraphRAG query |
| Per-seat | $50-100/user/month |
| Data ingestion | $500-2K one-time |

**Blended ACV: $50-100K | Gross margin: 96%**

The math that makes bootstrapping work:
- Total infrastructure: $425/mo (VPS + Claude API + WhatsApp)
- Revenue from 1 customer: $5K/mo
- **Customer #1 = profitable**

| Customers | MRR | API Costs | Gross Profit | Margin |
|-----------|-----|-----------|-------------|--------|
| 1 | $5K | $200 | $4,800 | 96% |
| 5 | $25K | $1,000 | $24,000 | 96% |
| 20 | $100K | $3,000 | $97,000 | 97% |

Expansion levers: seats, product lines, channels, modules, data flywheel

---

## Slide 11: Why Now
**Five forces converging simultaneously**

1. **LLM cost collapse** — $0.012/query makes per-query economics viable (impossible 18 months ago)
2. **WhatsApp Business API maturity** — $45B economy, but B2B industrial is untouched
3. **GraphRAG is production-ready** — 60-90% accuracy gains, but no one applies it to distribution
4. **Consolidation pressure** — Brenntag ($17.3B) and Univar ($8.1B) building proprietary digital moats. Independents need a platform NOW
5. **VC thesis alignment** — Vertical AI: $132.7B invested in 2025. Industrial is the largest underserved vertical

---

## Slide 12: Bootstrap Path to $1M ARR
**No VC required. Profitable from day one. Raise only to compress time.**

Bootstrap timeline:
```
Month 1:   $425/mo burn. Land first pilot.
Month 2:   Convert to $5K/mo paid. Profitable.
Month 3:   3 customers. $15K MRR. $14K/mo gross profit.
Month 6:   10 customers. $50K MRR. Hire first engineer from cash flow.
Month 9:   15 customers. $75K MRR. International pilot.
Month 12:  20+ customers. $100K+ MRR. Fully self-funding.
```

If/when to raise (optional — from a position of strength):
- **$0**: Works if founders cover 2-3 months personal runway
- **$100-200K angel**: 12+ months runway, zero revenue pressure, max optionality
- **$500K**: Junior engineer + aggressive GTM (events, per-prospect demos)
- **Series A at $1M+ ARR**: Profitable, growing, with leverage in negotiation

12-month targets (bootstrap or funded):
- 20+ paying customers across chemical + MRO distribution
- $100K+ MRR, 96% gross margins
- Net dollar retention >120%
- 1-2 WhatsApp-first international markets validated

---

## Appendix Slides (Optional)

### A1: Technical Architecture Deep Dive
- Neo4j knowledge graph schema (25+ node types)
- LLM task routing (Haiku/Sonnet/Opus cost optimization)
- 4-stage ingestion pipeline
- Circuit breaker + fallback architecture

### A2: Product Screenshots / Demo Flow
- WhatsApp conversation showing order flow
- GraphRAG query results with cross-references
- Back-office dashboard (orders, invoicing, AR aging)

### A3: Detailed Competitive Profiles
- Proton.ai, Partium, Verusen, ChatMRO, Paragon
- Epicor, Infor, SAP B1, Datacor
- Brenntag, Univar/ChemPoint, IMCD

### A4: Market Data Sources
- ISA distributor count data
- WhatsApp Business economy projections
- Vertical AI investment data (Euclid Ventures)
- GraphRAG accuracy benchmarks
- Chemical distributor revenue rankings

### A5: Customer Journey Map
- Day 1: Email auto-response pilot (1 product line)
- Week 2: Expand to full catalog
- Month 2: Add WhatsApp channel
- Month 3: Enable quoting
- Month 4: Full O2C
- Month 6: Add P2P/invoicing
- Result: 6x seat expansion, 3x ACV expansion
