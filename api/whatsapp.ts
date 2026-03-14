import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilio from "twilio";

// ---------------------------------------------------------------------------
// Simulated IndusAI responses — mirrors Demo.tsx logic
// ---------------------------------------------------------------------------

interface SimResponse {
  response: string;
  pipeline: string;
}

const RESPONSES: Record<string, SimResponse> = {
  product_inquiry: {
    pipeline: "Intent: PRODUCT_INQUIRY (0.96) → Graph: 3 parts found → Vector: top 3, sim > 0.92 → Response: 412 tokens",
    response: `🔍 *IndusAI Product Search*

I found 3 matching bearings:

*1. SKF 6204-2RS* — Deep Groove Ball Bearing
• 20mm bore | 47mm OD | 14mm width
• Dynamic load: 13.5 kN | Max RPM: 12,000
• *In stock* — 48 units @ Warehouse A
• $18.50/ea (qty 1-9) | $15.75/ea (qty 10+)

*2. NSK 6204DDU* — Equivalent
• Same dimensions (20x47x14mm)
• Dynamic load: 12.7 kN
• *In stock* — 24 units
• $16.90/ea

*3. FAG 6204-2RSR* — Alternative
• Slightly higher static load
• *Low stock* — 6 units
• $17.25/ea

All three exceed 10,000 RPM. The SKF 6204-2RS is most popular for sealed pump applications.

Reply: *QUOTE* to get pricing, *COMPARE* for specs, or ask another question.`,
  },
  cross_reference: {
    pipeline: "Intent: CROSS_REF (0.94) → Graph: direct match SKF→NSK → Response: 380 tokens",
    response: `🔄 *IndusAI Cross-Reference*

The NSK equivalent of *SKF 6204-2RS* is the *NSK 6204DDU*.

*Comparison:*
┌─────────────┬──────────────┬──────────────┐
│ Spec        │ SKF 6204-2RS │ NSK 6204DDU  │
├─────────────┼──────────────┼──────────────┤
│ Bore        │ 20mm         │ 20mm         │
│ OD          │ 47mm         │ 47mm         │
│ Dyn. Load   │ *13.5 kN*    │ 12.7 kN      │
│ Max RPM     │ 12,000       │ 12,000       │
│ Seal        │ 2RS (rubber) │ DDU (rubber) │
│ Price       │ $18.50/ea    │ $16.90/ea    │
└─────────────┴──────────────┴──────────────┘

SKF has ~6% higher load rating. Both in stock, ship same-day.

Reply: *QUOTE* for pricing or ask about another part.`,
  },
  order_status: {
    pipeline: "Intent: ORDER_STATUS (0.99) → DB lookup → Response: 185 tokens",
    response: `📦 *IndusAI Order Status*

Order *ORD-2024-0042* — *SHIPPED* ✅

• Customer: Acme Manufacturing
• Order date: Feb 28, 2026
• Items:
  1. SKF 6204-2RS x 24 — $378.00
  2. Gates B68 V-Belt x 6 — $83.70
  3. M10x30 Hex Bolt x 100 — $67.00
• *Total: $528.70*
• Tracking: UPS Ground, est. Mar 14

Reply: *TRACK* for live tracking or ask about another order.`,
  },
  technical_support: {
    pipeline: "Intent: BOM_REQUEST (0.93) → Graph: 6 components resolved → Response: 520 tokens",
    response: `🔧 *IndusAI BOM Lookup*

*ASM-GEARBOX-001 (Right-Angle Gearbox)*

| # | Part                  | Stock  | Price     |
|---|-----------------------|--------|-----------|
| 1 | Bevel Gear Set        | 12     | $245.00   |
| 2 | Spherical Bearing x2  | 8      | $89.50/ea |
| 3 | Angular Bearing x2    | 15     | $42.00/ea |
| 4 | Shaft Seal x2         | 32     | $8.75/ea  |
| 5 | Housing Gasket        | 3      | $12.50    |
| 6 | Gear Oil 1L           | ⚠️ *2* | $28.00    |

*Total BOM: $615.50* per assembly
5/6 in stock. Gear oil low — 3-day lead time.

Reply: *QUOTE* for full assembly or *PO* to reorder gear oil.`,
  },
  regulatory: {
    pipeline: "Intent: REGULATORY (0.95) → Graph: compatibility + certs → Vector: 5 TDS docs → Response: 485 tokens",
    response: `🛡️ *IndusAI Regulatory Search*

FDA-compliant solvents for polypropylene:

*1. Chemours Vertrel MCA*
• PP compatible ✅ | FDA 21 CFR 177.1520 ✅
• *In stock* — 12 cases
• $285.00/case

*2. 3M Novec 7200*
• PP compatible ✅ | FDA 21 CFR 175.105 ✅
• *In stock* — 8 cases
• $342.00/case

*3. DuPont Opteon SF-80*
• PP compatible ✅ | FDA 21 CFR 177.1520 ✅
• GWP < 1 (most eco-friendly)
• *Low stock* — 3 cases
• $310.00/case

All non-flammable, zero ODP. Vertrel MCA is our best seller for PP food-contact.

Reply: *QUOTE* or *TDS* for technical data sheets.`,
  },
  inventory_alert: {
    pipeline: "Intent: INVENTORY_ALERT (0.97) → Graph+DB: 5 parts below reorder → Response: 390 tokens",
    response: `⚠️ *IndusAI Inventory Alert*

*5 parts below reorder point:*

| SKU             | On Hand | Reorder | Status     |
|-----------------|---------|---------|------------|
| BRG-SKF-6206    | 4       | 20      | 🔴 CRITICAL |
| SGO-220-1L      | 2       | 10      | 🔴 CRITICAL |
| BLT-GATES-B68   | 7       | 15      | 🟡 Low      |
| SEAL-NOK-TC35   | 3       | 12      | 🔴 CRITICAL |
| FST-M10-HEX     | 45      | 100     | 🟡 Low      |

*3 have pending customer orders:*
• SKF 6206: need 12, have 4 → shortfall 8
• Mobil SHC 220: need 5, have 2 → shortfall 3
• NOK Seal: need 8, have 3 → shortfall 5

Reply: *PO* to auto-generate purchase orders or *NOTIFY* to alert customers.`,
  },
  welcome: {
    pipeline: "",
    response: `👋 *Welcome to IndusAI*
Your AI-powered MRO distribution assistant.

I can help with:
🔍 *Product search* — "Do you have a 20mm sealed bearing?"
🔄 *Cross-references* — "NSK equivalent of SKF 6204-2RS?"
📦 *Order status* — "Status of ORD-2024-0042"
🔧 *BOM lookups* — "Pull BOM for ASM-GEARBOX-001"
🛡️ *Regulatory* — "FDA-compliant solvent for polypropylene?"
⚠️ *Inventory alerts* — "What's below reorder point?"

Just type your question and I'll search across 250K+ documents, cross-references, and inventory data.

_Powered by GraphRAG + Claude AI_`,
  },
};

function classifyIntent(message: string): string {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|start|menu|help)\b/.test(lower)) return "welcome";

  // Order status
  if (lower.includes("order") && (lower.includes("status") || lower.includes("ord-")))
    return "order_status";
  if (/ord-\d+/i.test(lower)) return "order_status";

  // Cross reference
  if (lower.includes("equivalent") || lower.includes("cross") || lower.includes("nsk") || lower.includes("alternative"))
    return "cross_reference";

  // BOM / technical
  if (lower.includes("bom") || lower.includes("assembly") || lower.includes("gearbox") || lower.includes("technical"))
    return "technical_support";

  // Regulatory
  if (lower.includes("fda") || lower.includes("regulat") || lower.includes("compliance") || lower.includes("food contact"))
    return "regulatory";

  // Inventory
  if (lower.includes("reorder") || lower.includes("below") || lower.includes("inventory") || lower.includes("low stock") || lower.includes("alert"))
    return "inventory_alert";

  // Default to product inquiry
  return "product_inquiry";
}

// ---------------------------------------------------------------------------
// Twilio webhook handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "IndusAI WhatsApp" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const incomingMessage: string = body.Body || "";
    const from: string = body.From || "";

    console.log(`[WhatsApp] From: ${from} | Message: ${incomingMessage}`);

    // Classify and get response
    const intent = classifyIntent(incomingMessage);
    const simResponse = RESPONSES[intent] || RESPONSES.product_inquiry;

    // Build TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(simResponse.response)}</Message>
</Response>`;

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twiml);
  } catch (err) {
    console.error("[WhatsApp] Error:", err);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, something went wrong. Please try again or contact support.</Message>
</Response>`;
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(errorTwiml);
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
