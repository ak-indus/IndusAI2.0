# IndusAI 2.0 — Platform Architecture Plan

## Three Pillars Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                     INBOUND CHANNELS                             │
│  Email (SendGrid)  │  WhatsApp (Meta)  │  Web Portal  │  Fax    │
└──────────┬───────────────────┬──────────────────┬────────────────┘
           │                   │                  │
           ▼                   ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   UNIFIED INGESTION LAYER                        │
│  Channel adapters normalize all inbound into a common            │
│  InboundMessage envelope (sender, channel, body, attachments)    │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PARSING ENGINE (Claude-Powered)                │
│                                                                  │
│  1. Document Extraction (PDF/email body → raw text)              │
│  2. Structured Extraction (Claude → JSON: line items, dates,     │
│     addresses, PO numbers, quantities, SKUs)                     │
│  3. Entity Resolution (fuzzy match SKUs → catalog, resolve       │
│     customer by email/phone/name)                                │
│  4. Confidence Scoring (per-field + overall)                     │
│                                                                  │
│  Output: ParsedDocument { fields, line_items, confidence,        │
│          needs_review: bool, review_reasons[] }                  │
└──────────┬───────────────────────────────┬───────────────────────┘
           │                               │
     confidence ≥ 0.9               confidence < 0.9
     all fields resolved            or unresolved fields
           │                               │
           ▼                               ▼
┌─────────────────────┐     ┌──────────────────────────────┐
│   AUTO-PROCESSING   │     │   HUMAN REVIEW QUEUE         │
│                     │     │                              │
│  Create order/quote │     │  CSR sees parsed data with   │
│  directly in system │     │  highlighted low-confidence  │
│  Send confirmation  │     │  fields. Edit, confirm, or   │
│  to customer        │     │  reject.                     │
└─────────┬───────────┘     └──────────────┬───────────────┘
          │                                │
          └──────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                   PLATFORM SERVICES (existing)                   │
│  OrderService │ QuoteService │ InventoryService │ PricingService │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SYSTEMS OF RECORD                              │
│  PostgreSQL (primary)  │  ERP Connector (SAP/Oracle — future)    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Pillar 1: Integrations — Channel & System Adapters

### 1.1 Unified Channel Architecture

Replace the single-method `CommunicationManager` with a pluggable channel system:

```
services/
  channels/
    __init__.py
    base.py            # BaseChannel abstract class
    whatsapp.py        # WhatsAppChannel (migrate existing code)
    email.py           # EmailChannel (SendGrid inbound/outbound)
    sms.py             # SMSChannel (Twilio)
    web_portal.py      # WebPortalChannel (REST API for portal UI)
    fax.py             # FaxChannel (eFax API — Phase 2)
    channel_router.py  # Routes inbound messages to parsing engine
```

**BaseChannel interface:**
```python
class BaseChannel(ABC):
    @abstractmethod
    async def send(self, to: str, content: str, attachments: list = None) -> bool

    @abstractmethod
    async def receive_webhook(self, request: Request) -> InboundMessage

    @abstractmethod
    async def verify_webhook(self, request: Request) -> Response
```

**InboundMessage envelope (common across all channels):**
```python
@dataclass
class InboundMessage:
    channel: ChannelType           # email, whatsapp, sms, web, fax
    sender_id: str                 # phone number, email address, user ID
    sender_name: Optional[str]
    subject: Optional[str]         # email subject line
    body: str                      # plain text content
    html_body: Optional[str]       # email HTML (if applicable)
    attachments: List[Attachment]  # PDFs, images, docs
    metadata: Dict[str, Any]       # channel-specific extras
    received_at: datetime
    raw_payload: Dict              # original webhook payload for debugging
```

### 1.2 Email Integration (SendGrid Inbound Parse)

**Inbound flow:**
- SendGrid Inbound Parse webhook → `POST /webhook/email`
- Parses sender, subject, body, attachments (base64)
- Creates `InboundMessage` → routes to parsing engine

**Outbound flow:**
- SendGrid Web API v3 for transactional emails
- Templates: order confirmation, quote, invoice, shipping notification, RMA status

**Why SendGrid:** Most MRO distributors already use it or similar. Inbound Parse handles the hard part (MX records, spam filtering). Alternative: Mailgun (same pattern).

### 1.3 SMS Integration (Twilio)

**Inbound:** Twilio webhook → `POST /webhook/sms`
**Outbound:** Twilio REST API for notifications (order status, shipping alerts)
**Scope:** Notifications only — not a primary order channel (too short for POs)

### 1.4 Web Portal (Customer Self-Service)

Not a separate app — a persona-specific view in the existing React frontend:
- Customers can submit orders, check status, request quotes
- Forms that generate structured data directly (no parsing needed)
- This is the "clean input" channel vs email/WhatsApp which need parsing

### 1.5 ERP Connector (Phase 2)

The `BaseERPConnector` abstract class is already well-designed. Implementation order:
1. **PostgreSQL as primary SoR** (current — keep this working)
2. **CSV/Excel import/export** (bridge for customers not on API-enabled ERPs)
3. **REST API connectors** (SAP Business One Service Layer, Oracle REST, Epicor)

> **Decision: PostgreSQL stays as the system of record for MVP.** ERP sync is a future integration layer, not a blocker.

---

## Pillar 2: Parsing Engine — Unstructured → Structured

### 2.1 Architecture

```
services/
  parsing/
    __init__.py
    document_parser.py     # Orchestrates the full parsing pipeline
    extractors/
      __init__.py
      pdf_extractor.py     # pdfplumber for PDF → text
      email_extractor.py   # HTML/plain email → clean text
      image_extractor.py   # OCR via pytesseract (scanned POs)
    structured_extractor.py # Claude-powered JSON extraction
    entity_resolver.py     # Match extracted entities to DB records
    confidence_scorer.py   # Score each field and overall document
```

### 2.2 Extraction Pipeline

```
InboundMessage
    │
    ▼
┌─ Document Extraction ─────────────────────────────┐
│  PDF → pdfplumber → text                           │
│  Email HTML → BeautifulSoup → text                 │
│  Scanned image → pytesseract → text                │
│  Plain text → pass through                         │
│  Output: raw_text: str                             │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌─ Claude Structured Extraction ─────────────────────┐
│                                                     │
│  Prompt: "Extract structured data from this MRO     │
│  purchase order / RFQ / inquiry. Return JSON."      │
│                                                     │
│  Output schema:                                     │
│  {                                                  │
│    "document_type": "purchase_order|rfq|inquiry|    │
│                      return_request|general",       │
│    "po_number": "ABC-12345",                        │
│    "customer_name": "Acme Industrial",              │
│    "customer_email": "buyer@acme.com",              │
│    "required_date": "2026-04-15",                   │
│    "shipping_address": { ... },                     │
│    "line_items": [                                  │
│      {                                              │
│        "description": "SKF 6205-2RS bearing",       │
│        "part_number": "6205-2RS",                   │
│        "manufacturer": "SKF",                       │
│        "quantity": 50,                              │
│        "unit": "EA",                                │
│        "requested_price": 12.50                     │
│      }                                              │
│    ],                                               │
│    "special_instructions": "Ship via FedEx Ground", │
│    "payment_terms": "NET30"                         │
│  }                                                  │
│                                                     │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌─ Entity Resolution ────────────────────────────────┐
│                                                     │
│  For each line item:                                │
│    1. Match part_number → products table            │
│       (exact match, then fuzzy, then cross-refs)    │
│    2. Match manufacturer → known manufacturers      │
│    3. Check inventory availability                  │
│    4. Look up pricing for resolved customer         │
│                                                     │
│  For customer:                                      │
│    1. Match email → customers table                 │
│    2. Match name (fuzzy) → customers table          │
│    3. Flag if new customer (needs onboarding)       │
│                                                     │
│  Output: resolved entities with match_confidence    │
│                                                     │
└────────────────────────┬───────────────────────────┘
                         │
                         ▼
┌─ Confidence Scoring ───────────────────────────────┐
│                                                     │
│  Per-field confidence:                              │
│    - customer_resolved: 0.95 (exact email match)    │
│    - line_item[0].product_resolved: 0.80 (fuzzy)    │
│    - line_item[1].product_resolved: 0.40 (no match) │
│    - required_date: 1.0 (clearly parsed)            │
│                                                     │
│  Overall confidence = min(critical_fields)           │
│                                                     │
│  Routing decision:                                  │
│    ≥ 0.9 all fields → auto_process                  │
│    < 0.9 any field  → needs_review                  │
│    < 0.5 overall    → needs_manual_entry             │
│                                                     │
│  Output: ParsedDocument with review flags           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.3 ParsedDocument Model

```python
@dataclass
class ParsedField:
    value: Any
    confidence: float            # 0.0 - 1.0
    source: str                  # "extracted" | "resolved" | "manual"
    alternatives: List[Any]      # other possible values
    review_reason: Optional[str] # why this needs review

@dataclass
class ParsedLineItem:
    description: ParsedField
    part_number: ParsedField
    manufacturer: ParsedField
    quantity: ParsedField
    unit: ParsedField
    requested_price: ParsedField
    resolved_product_id: Optional[str]   # matched product in catalog
    resolved_unit_price: Optional[float] # our price for this customer
    in_stock: Optional[bool]

@dataclass
class ParsedDocument:
    id: str                          # unique parsing job ID
    source_message_id: str           # link to InboundMessage
    document_type: ParsedField       # PO, RFQ, inquiry, return
    customer: ParsedField            # resolved customer
    po_number: ParsedField
    required_date: ParsedField
    shipping_address: ParsedField
    line_items: List[ParsedLineItem]
    special_instructions: ParsedField
    payment_terms: ParsedField
    overall_confidence: float
    needs_review: bool
    review_reasons: List[str]
    status: str                      # "parsed" | "in_review" | "approved" | "rejected" | "processed"
    raw_text: str                    # original document text
    created_at: datetime
    reviewed_by: Optional[str]       # persona who reviewed
    reviewed_at: Optional[datetime]
```

### 2.4 Database Tables (new)

```sql
-- Inbound messages from all channels (normalized)
CREATE TABLE inbound_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(20) NOT NULL,          -- email, whatsapp, sms, web, fax
    sender_id VARCHAR(255) NOT NULL,       -- email address, phone number
    sender_name VARCHAR(255),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INT DEFAULT 0,
    resolved_customer_id UUID REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'received', -- received, parsing, parsed, processed, failed
    received_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parsed documents (output of parsing engine)
CREATE TABLE parsed_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbound_message_id UUID REFERENCES inbound_messages(id),
    document_type VARCHAR(30) NOT NULL,     -- purchase_order, rfq, inquiry, return_request
    parsed_data JSONB NOT NULL,             -- full ParsedDocument as JSON
    overall_confidence FLOAT NOT NULL,
    needs_review BOOLEAN NOT NULL,
    review_reasons TEXT[],
    status VARCHAR(20) DEFAULT 'parsed',    -- parsed, in_review, approved, rejected, processed
    assigned_to UUID,                       -- CSR assigned for review
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_edits JSONB,                     -- what the reviewer changed
    result_order_id UUID REFERENCES orders(id),
    result_quote_id UUID,
    raw_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachment storage metadata
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inbound_message_id UUID REFERENCES inbound_messages(id),
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes INT,
    storage_path VARCHAR(500),             -- local path or S3 key
    extracted_text TEXT,                    -- text extracted from PDF/image
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Pillar 3: Persona-Based UIs — Review & Action Portals

### 3.1 Persona Definitions

| Persona | Role | Primary Actions | Key Screens |
|---------|------|-----------------|-------------|
| **Customer Service Rep (CSR)** | Front-line triage | Review parsed documents, edit/approve/reject, respond to customers, escalate | Review Queue, Customer Timeline, Response Composer |
| **Warehouse / Operations** | Fulfillment | Confirm picks, process shipments, receive goods, cycle counts | Fulfillment Queue, Shipping Dashboard, Receiving |
| **Procurement** | Buying | Approve POs, manage suppliers, handle reorder alerts | PO Approval Queue, Supplier Portal, Reorder Dashboard |
| **Sales / Account Manager** | Revenue | Create/manage quotes, pricing overrides, customer relationships | Quote Builder, Customer Accounts, Pipeline |
| **Manager / Admin** | Oversight | Approve exceptions, view analytics, manage users/roles | Approval Queue, Analytics, User Management |

### 3.2 Role-Based Access

```typescript
// Frontend role system
type PersonaRole = 'csr' | 'warehouse' | 'procurement' | 'sales' | 'manager' | 'admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: PersonaRole;
  permissions: string[];      // granular: 'orders.approve', 'pricing.override', etc.
}

// Route guards
const roleRoutes: Record<PersonaRole, string[]> = {
  csr:         ['/review-queue', '/customers', '/channels', '/chat', '/orders', '/rma'],
  warehouse:   ['/fulfillment', '/inventory', '/orders', '/receiving'],
  procurement: ['/procurement', '/suppliers', '/inventory', '/po-approvals'],
  sales:       ['/quotes', '/customers', '/products', '/pricing', '/orders'],
  manager:     ['*'],  // access to everything
  admin:       ['*'],
};
```

### 3.3 New Screens by Persona

#### CSR Portal — "Review Queue" (highest priority)

The centerpiece of the platform. This is where AI-parsed documents land for human review.

```
┌─────────────────────────────────────────────────────────────────┐
│  Review Queue                                    [3 pending]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ PO from buyer@acme.com ─────────── Confidence: 87% ──────┐ │
│  │  Channel: Email  │  Received: 2 min ago  │  Type: PO       │ │
│  │  Customer: Acme Industrial (matched ✓)                      │ │
│  │  PO#: ACM-2026-0451                                         │ │
│  │                                                              │ │
│  │  Line Items:                                                 │ │
│  │  ┌──────┬──────────────────┬─────┬───┬────────┬───────────┐ │ │
│  │  │ SKU  │ Description      │ Qty │ UM│ Price  │ Status    │ │ │
│  │  ├──────┼──────────────────┼─────┼───┼────────┼───────────┤ │ │
│  │  │MRO-  │ SKF 6205-2RS     │ 50  │EA │ $12.50 │ ✓ Matched │ │ │
│  │  │BRG001│ Deep groove      │     │   │        │ In stock  │ │ │
│  │  ├──────┼──────────────────┼─────┼───┼────────┼───────────┤ │ │
│  │  │ ???  │ Filter cartridge  │ 100 │EA │ $8.00  │ ⚠ No match│ │ │
│  │  │      │ 10 micron         │     │   │        │ [Select ▼]│ │ │
│  │  └──────┴──────────────────┴─────┴───┴────────┴───────────┘ │ │
│  │                                                              │ │
│  │  ⚠ Review needed: 1 line item could not be matched          │ │
│  │                                                              │ │
│  │  [View Original Email]  [Approve & Create Order]  [Reject]  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ WhatsApp from +1-555-0123 ──────── Confidence: 94% ──────┐ │
│  │  "Need 20 units of that same bearing we ordered last month" │ │
│  │  Customer: Johnson Controls (matched ✓)                      │ │
│  │  Inferred: 20x MRO-BRG001 (from order history)              │ │
│  │  [Auto-Create Quote]  [Review]  [Dismiss]                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key interactions:**
- Edit any parsed field inline (click to edit)
- Product picker dropdown for unmatched line items
- Side-by-side view: original document | parsed data
- Approve → creates order/quote in system + sends confirmation to customer
- Reject → sends "sorry, please clarify" response
- Escalate → routes to sales/manager

#### Warehouse Portal — "Fulfillment Queue"

```
┌─────────────────────────────────────────────────────────────────┐
│  Fulfillment Queue                          [5 to pick today]   │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [To Pick] [Packing] [Ready to Ship] [Shipped Today]   │
│                                                                 │
│  ┌─ ORD-000142 ── Acme Industrial ── Priority: HIGH ─────────┐ │
│  │  Required: Today  │  Ship via: FedEx Ground                 │ │
│  │                                                              │ │
│  │  □ MRO-BRG001  SKF 6205-2RS     50 EA   Bin: A-12-03  ✓   │ │
│  │  □ MRO-FLT005  Filter 10μm     100 EA   Bin: C-04-01  ✓   │ │
│  │                                                              │ │
│  │  [Start Pick]  [Mark Packed]  [Print Shipping Label]        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Procurement Portal — "PO Approval Queue"

```
┌─────────────────────────────────────────────────────────────────┐
│  Purchase Order Approvals                   [2 pending]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Auto-Generated PO ── Supplier: SKF USA ──────────────────┐ │
│  │  Trigger: MRO-BRG001 below reorder point (qty: 15, min: 50)│ │
│  │  Suggested: 200 EA @ $9.80/ea = $1,960.00                  │ │
│  │  Lead time: 5 business days                                 │ │
│  │  Last order: 30 days ago (180 EA @ $9.80)                   │ │
│  │                                                              │ │
│  │  [Approve]  [Edit Quantity]  [Change Supplier]  [Reject]    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Sales Portal — "Quote Builder"

```
┌─────────────────────────────────────────────────────────────────┐
│  Quote Builder                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Customer: [Search customer...    ▼]                             │
│  Valid for: [30 days ▼]                                          │
│                                                                 │
│  Line Items:                                                     │
│  ┌──────┬──────────────┬─────┬────────┬────────┬───────────────┐│
│  │ SKU  │ Product      │ Qty │ List $ │ Your $ │ Margin        ││
│  ├──────┼──────────────┼─────┼────────┼────────┼───────────────┤│
│  │[🔍] │ SKF 6205-2RS │ 50  │ $15.00 │ $12.50 │ 16.7% ✓      ││
│  │[🔍] │ Filter 10μm  │ 100 │ $11.00 │ $8.00  │ 27.3% ✓      ││
│  │      │              │     │        │        │ [+ Add Line]  ││
│  └──────┴──────────────┴─────┴────────┴────────┴───────────────┘│
│                                                                 │
│  Subtotal: $1,425.00  │  Tax: $114.00  │  Total: $1,539.00     │
│                                                                 │
│  [Save Draft]  [Send to Customer]  [Convert to Order]           │
└─────────────────────────────────────────────────────────────────┘
```

#### Manager Portal — "Approvals & Exceptions"

Unified approval queue across all workflows:
- Credit limit overrides
- Pricing exceptions (below minimum margin)
- Large order approvals (above threshold)
- RMA approvals (above $ amount)
- New customer onboarding

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Goal: Parsing engine + Review Queue = first end-to-end flow**

1. **Parsing Engine core** — `DocumentParser`, `StructuredExtractor` (Claude), `EntityResolver`
2. **New DB tables** — `inbound_messages`, `parsed_documents`, `attachments`
3. **Review Queue API** — list pending, get detail, approve/reject/edit, assign
4. **Review Queue UI** — CSR portal with inline editing, side-by-side view
5. **Role/persona model** — user roles in DB, route guards in frontend
6. **Email channel** — SendGrid inbound parse webhook + outbound templates

### Phase 2: Actions & Workflows (Weeks 4-6)
**Goal: Every persona can take action, not just view**

1. **Order creation from Review Queue** — approve → create order → send confirmation
2. **Quote Builder UI** — product search, line items, pricing, send to customer
3. **Fulfillment Queue** — warehouse pick/pack/ship workflow
4. **PO Approval Queue** — procurement review and approve
5. **Outbound notifications** — email confirmations, status updates, shipping alerts
6. **SMS channel** — Twilio integration for notifications

### Phase 3: Intelligence & Polish (Weeks 7-9)
**Goal: Get smarter over time, reduce human review rate**

1. **Confidence tuning** — track approval/rejection rates, adjust thresholds
2. **Customer context** — order history lookup for "same as last time" requests
3. **Manager approval workflows** — credit overrides, pricing exceptions
4. **Analytics per persona** — review throughput, auto-process rate, response times
5. **Fax channel** — eFax API integration
6. **Advanced parsing** — multi-page POs, tabular data, handwritten notes (OCR)

### Phase 4: Scale & Integrate (Weeks 10-12)
**Goal: Production-ready for pilot customers**

1. **ERP sync layer** — CSV import/export, then REST connectors
2. **Audit trail** — every action logged with who/what/when
3. **Security hardening** — proper secret management, RBAC enforcement
4. **Performance** — background job queue (Celery/ARQ), caching
5. **Testing** — backend test suite, integration tests, E2E tests
6. **Documentation** — API docs, user guides per persona

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Parsing AI** | Claude (existing) | Already integrated, best at structured extraction, tool use for entity resolution |
| **Email provider** | SendGrid Inbound Parse | Handles MX complexity, webhook-based, good Python SDK |
| **SMS provider** | Twilio | Industry standard, good webhook support |
| **PDF extraction** | pdfplumber | Better table extraction than PyPDF2, pure Python |
| **OCR** | pytesseract (optional) | Only needed for scanned/faxed docs |
| **Job queue** | ARQ (async Redis queue) | Already have Redis, stays async, lightweight |
| **File storage** | Local filesystem → S3 | Start simple, migrate to S3 for production |
| **Auth/RBAC** | JWT with role claims | Extend existing JWT system, add role field |
| **State management** | React Query (existing) | Already in use, no need for Redux |
| **Real-time updates** | Polling → SSE → WebSocket | Start with polling (simple), upgrade later |

---

## Success Metrics

| Metric | Target | Measures |
|--------|--------|----------|
| **Auto-process rate** | >60% of inbound POs processed without human review | Parsing quality |
| **Review time** | <2 min average per document in review queue | UI effectiveness |
| **Entity resolution** | >90% SKU match rate | Catalog coverage |
| **Channel coverage** | Email + WhatsApp + Web handling 95% of volume | Integration completeness |
| **Response time** | <5 min from inbound to confirmation (auto) | End-to-end speed |
| **Error rate** | <2% of auto-processed orders need correction | Confidence calibration |
