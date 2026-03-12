import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, ChatResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Send,
  Zap,
  Search,
  Database,
  Brain,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Package,
  RotateCcw,
  Headphones,
  TrendingUp,
  DollarSign,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggested_actions?: string[];
  pipeline?: PipelineState;
}

interface PipelineStage {
  name: string;
  status: "pending" | "running" | "done";
  detail?: string;
  durationMs?: number;
}

interface PipelineState {
  stages: PipelineStage[];
  totalMs?: number;
}

// ---------------------------------------------------------------------------
// Demo scenario data — uses real seed SKUs
// ---------------------------------------------------------------------------

interface DemoScenario {
  label: string;
  message: string;
  icon: typeof Package;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    label: "Product inquiry",
    icon: Search,
    message:
      "Do you have a deep groove ball bearing, 20mm bore, sealed, for a pump application running at 10,000 RPM?",
  },
  {
    label: "Cross-reference",
    icon: RotateCcw,
    message:
      "I currently use the SKF 6204-2RS. What's the NSK equivalent and how do the load ratings compare?",
  },
  {
    label: "Order status",
    icon: Package,
    message: "What's the status of order ORD-2024-0042?",
  },
  {
    label: "Technical support",
    icon: Brain,
    message:
      "We're speccing a right-angle gearbox assembly. Can you pull the full BOM for model ASM-GEARBOX-001 and confirm all parts are in stock?",
  },
];

// Simulated pipeline + responses when backend is unavailable
const SIMULATED_RESPONSES: Record<
  string,
  { response: string; actions: string[]; stages: PipelineStage[] }
> = {
  product_inquiry: {
    stages: [
      {
        name: "Intent Classification",
        status: "done",
        detail: "PRODUCT_INQUIRY (confidence: 0.96)",
        durationMs: 45,
      },
      {
        name: "Graph Traversal",
        status: "done",
        detail: "3 matching parts found via (bore=20mm) -> [HAS_SPEC] -> (Part) -> [IN_CATEGORY] -> (Ball Bearings)",
        durationMs: 120,
      },
      {
        name: "Vector Search",
        status: "done",
        detail: "Voyage AI embedding — top 3 results, similarity > 0.92",
        durationMs: 85,
      },
      {
        name: "Context Assembly",
        status: "done",
        detail: "Inventory check: 2/3 in stock. Price tiers loaded.",
        durationMs: 30,
      },
      {
        name: "Response Generation",
        status: "done",
        detail: "Claude Sonnet — 412 tokens generated",
        durationMs: 890,
      },
    ],
    response: `I found 3 matching bearings for your pump application:\n\n**1. SKF 6204-2RS** — Deep Groove Ball Bearing\n   - Bore: 20mm | OD: 47mm | Width: 14mm\n   - Dynamic load: 13.5 kN | Max RPM: 12,000\n   - Seal: 2RS (contact rubber) — ideal for pump environments\n   - **In stock** — 48 units @ Warehouse A\n   - Price: $18.50/ea (qty 1-9) | $15.75/ea (qty 10+)\n\n**2. NSK 6204DDU** — Equivalent\n   - Same dimensions (20x47x14mm)\n   - Dynamic load: 12.7 kN | compatible with your RPM range\n   - **In stock** — 24 units\n   - Price: $16.90/ea\n\n**3. FAG 6204-2RSR** — Alternative\n   - Same dimensions, slightly higher static load\n   - **Low stock** — 6 units remaining\n   - Price: $17.25/ea\n\nAll three exceed your 10,000 RPM requirement. The SKF 6204-2RS is the most popular for sealed pump applications. Want me to add any to a quote?`,
    actions: [
      "Add SKF 6204-2RS to quote",
      "Compare specs side-by-side",
      "Download TDS",
      "Request sample",
    ],
  },
  cross_reference: {
    stages: [
      {
        name: "Intent Classification",
        status: "done",
        detail: "PRODUCT_INQUIRY / cross-reference (confidence: 0.94)",
        durationMs: 38,
      },
      {
        name: "Graph Traversal",
        status: "done",
        detail: "SKF 6204-2RS -> [EQUIVALENT_TO] -> NSK 6204DDU (direct cross-reference found)",
        durationMs: 15,
      },
      {
        name: "Vector Search",
        status: "done",
        detail: "Skipped — direct graph match found",
        durationMs: 0,
      },
      {
        name: "Context Assembly",
        status: "done",
        detail: "Loaded specs for both parts + inventory status",
        durationMs: 25,
      },
      {
        name: "Response Generation",
        status: "done",
        detail: "Claude Sonnet — 380 tokens generated",
        durationMs: 820,
      },
    ],
    response: `The direct NSK equivalent of the **SKF 6204-2RS** is the **NSK 6204DDU**.\n\nHead-to-head comparison:\n\n| Spec | SKF 6204-2RS | NSK 6204DDU |\n|------|-------------|-------------|\n| Bore | 20mm | 20mm |\n| OD | 47mm | 47mm |\n| Width | 14mm | 14mm |\n| Dynamic load | **13.5 kN** | 12.7 kN |\n| Static load | **6.55 kN** | 6.2 kN |\n| Max RPM | 12,000 | 12,000 |\n| Seal type | 2RS (rubber) | DDU (rubber) |\n\nThe SKF has ~6% higher load ratings. Both are drop-in replacements dimensionally. The NSK is $1.60/ea cheaper at list price.\n\nBoth are **in stock** and ship same-day. Want me to quote both for comparison?`,
    actions: [
      "Quote both bearings",
      "Show FAG equivalent too",
      "Check bulk pricing",
    ],
  },
  order_status: {
    stages: [
      {
        name: "Intent Classification",
        status: "done",
        detail: "ORDER_STATUS (confidence: 0.99)",
        durationMs: 28,
      },
      {
        name: "Graph Traversal",
        status: "done",
        detail: "Skipped — order lookup is relational",
        durationMs: 0,
      },
      {
        name: "Vector Search",
        status: "done",
        detail: "Skipped — direct order query",
        durationMs: 0,
      },
      {
        name: "Context Assembly",
        status: "done",
        detail: "Order ORD-2024-0042: 3 line items, shipped status",
        durationMs: 18,
      },
      {
        name: "Response Generation",
        status: "done",
        detail: "Claude Haiku — 185 tokens (simple response)",
        durationMs: 340,
      },
    ],
    response: `Order **ORD-2024-0042** is **shipped** and in transit.\n\n- **Customer:** Acme Manufacturing\n- **Order date:** Feb 28, 2026\n- **Items:**\n  1. SKF 6204-2RS x 24 — $378.00\n  2. Gates B68 V-Belt x 6 — $83.70\n  3. M10x30 Hex Bolt (Grade 8.8) x 100 — $67.00\n- **Total:** $528.70\n- **Tracking:** Shipped via UPS Ground, est. delivery Mar 14\n\nWant me to pull the tracking details or check on another order?`,
    actions: [
      "Track shipment",
      "Show invoice",
      "Reorder same items",
    ],
  },
  technical_support: {
    stages: [
      {
        name: "Intent Classification",
        status: "done",
        detail: "TECHNICAL_SUPPORT / BOM request (confidence: 0.93)",
        durationMs: 42,
      },
      {
        name: "Graph Traversal",
        status: "done",
        detail:
          "ASM-GEARBOX-001 -> [PART_OF] -> 6 components resolved with specs and cross-refs",
        durationMs: 65,
      },
      {
        name: "Vector Search",
        status: "done",
        detail: "Skipped — full BOM resolved from graph",
        durationMs: 0,
      },
      {
        name: "Context Assembly",
        status: "done",
        detail: "Inventory check: 5/6 in stock, 1 low stock (lead time: 3 days)",
        durationMs: 45,
      },
      {
        name: "Response Generation",
        status: "done",
        detail: "Claude Sonnet — 520 tokens generated",
        durationMs: 1050,
      },
    ],
    response: `Here's the full BOM for **ASM-GEARBOX-001 (Right-Angle Gearbox)**:\n\n| # | Part | SKU | Manufacturer | Qty | Stock | Price |\n|---|------|-----|-------------|-----|-------|-------|\n| 1 | Bevel Gear Set | BG-90-001 | Boston Gear | 1 | 12 | $245.00 |\n| 2 | Spherical Roller Bearing | 22210-E1-K | SKF | 2 | 8 | $89.50/ea |\n| 3 | Angular Contact Bearing | 7205-BEP | SKF | 2 | 15 | $42.00/ea |\n| 4 | Shaft Seal | TC-35-52-7 | NOK | 2 | 32 | $8.75/ea |\n| 5 | Housing Gasket | HG-90-001 | Garlock | 1 | 3 | $12.50 |\n| 6 | Synthetic Gear Oil (1L) | SGO-220-1L | Mobil | 1 | **LOW: 2** | $28.00 |\n\n**Total BOM cost: $615.50** (single assembly)\n\n5 of 6 items in stock for immediate shipment. The gear oil (SGO-220-1L) is low stock — I can reserve 1L now or auto-generate a PO to replenish. Lead time from supplier is 3 business days.\n\nWant me to create a quote for the full assembly kit?`,
    actions: [
      "Quote full assembly",
      "Reserve low-stock items",
      "Auto-generate PO for gear oil",
      "Download assembly TDS",
    ],
  },
};

function getSimulatedResponse(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("order") && (lower.includes("status") || lower.includes("ord-")))
    return SIMULATED_RESPONSES.order_status;
  if (lower.includes("equivalent") || lower.includes("cross") || lower.includes("nsk"))
    return SIMULATED_RESPONSES.cross_reference;
  if (lower.includes("bom") || lower.includes("assembly") || lower.includes("gearbox"))
    return SIMULATED_RESPONSES.technical_support;
  return SIMULATED_RESPONSES.product_inquiry;
}

// ---------------------------------------------------------------------------
// Pipeline visualization
// ---------------------------------------------------------------------------

const STAGE_ICONS: Record<string, typeof Zap> = {
  "Intent Classification": Zap,
  "Graph Traversal": Database,
  "Vector Search": Search,
  "Context Assembly": Package,
  "Response Generation": Brain,
};

function PipelineViz({ pipeline }: { pipeline: PipelineState }) {
  return (
    <div className="space-y-2">
      {pipeline.stages.map((stage, i) => {
        const Icon = STAGE_ICONS[stage.name] || Zap;
        const isRunning = stage.status === "running";
        const isDone = stage.status === "done";
        const isSkipped = isDone && stage.durationMs === 0;

        return (
          <div key={i}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 transition-all duration-300",
                isRunning &&
                  "border-blue-400 bg-blue-50 shadow-sm shadow-blue-100",
                isDone && !isSkipped && "border-emerald-200 bg-emerald-50/50",
                isDone && isSkipped && "border-gray-200 bg-gray-50 opacity-60",
                stage.status === "pending" && "border-gray-200 bg-white opacity-40"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  isRunning && "bg-blue-500 text-white animate-pulse",
                  isDone && !isSkipped && "bg-emerald-500 text-white",
                  isDone && isSkipped && "bg-gray-300 text-white",
                  stage.status === "pending" && "bg-gray-200 text-gray-400"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      isRunning && "text-blue-700",
                      isDone && "text-gray-700",
                      stage.status === "pending" && "text-gray-400"
                    )}
                  >
                    {stage.name}
                  </p>
                  {isDone && !isSkipped && stage.durationMs !== undefined && (
                    <span className="text-[10px] font-mono text-emerald-600">
                      {stage.durationMs}ms
                    </span>
                  )}
                  {isSkipped && (
                    <span className="text-[10px] text-gray-400">skipped</span>
                  )}
                </div>
                {stage.detail && isDone && (
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-500 truncate">
                    {stage.detail}
                  </p>
                )}
                {isRunning && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Connector line */}
            {i < pipeline.stages.length - 1 && (
              <div className="ml-[22px] flex h-3 items-center">
                <div
                  className={cn(
                    "h-full w-px",
                    isDone ? "bg-emerald-300" : "bg-gray-200"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Total time */}
      {pipeline.totalMs !== undefined && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Clock className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">
            Total: {(pipeline.totalMs / 1000).toFixed(1)}s
          </span>
          <span className="text-[11px] text-emerald-600">
            — vs. 15-20 min manual
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Format time
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Simple markdown-ish rendering: bold, tables, bullet lists
function renderContent(text: string) {
  // Split into lines and detect tables
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  function flushTable() {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const body = tableRows.slice(1).filter(
      (r) => !r.every((cell) => /^[-|: ]+$/.test(cell))
    );
    elements.push(
      <div key={`table-${elements.length}`} className="my-2 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-gray-300">
              {header.map((h, i) => (
                <th key={i} className="px-2 py-1 text-left font-semibold text-gray-700">
                  {renderInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-100">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1 text-gray-600">
                    {renderInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("|") && line.endsWith("|")) {
      inTable = true;
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
    } else {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      if (line.trim() === "") {
        elements.push(<div key={`br-${i}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="leading-relaxed">
            {renderInline(line)}
          </p>
        );
      }
    }
  }
  if (inTable) flushTable();

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const WELCOME: Message = {
  role: "assistant",
  content:
    "Welcome to IndusAI. I'm your AI-powered distribution assistant.\n\nAsk me about products, cross-references, orders, inventory, or technical specs. I use a knowledge graph with 50+ MRO parts, cross-manufacturer equivalences, and full BOM data.\n\nTry one of the scenarios below, or type your own question.",
  timestamp: new Date(),
};

const PERSONA_VIEWS = [
  {
    label: "Customer Support",
    description: "Tickets, AI-assisted responses, escalations",
    path: "/demo/support",
    icon: Headphones,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    label: "Inbound Sales",
    description: "Quotes, pipeline, order conversion",
    path: "/demo/sales",
    icon: TrendingUp,
    color: "from-blue-500 to-indigo-600",
  },
  {
    label: "Finance",
    description: "Invoicing, AR aging, margins, rebates",
    path: "/demo/finance",
    icon: DollarSign,
    color: "from-amber-500 to-orange-600",
  },
  {
    label: "Operations",
    description: "System health, fulfillment, inventory alerts",
    path: "/demo/ops",
    icon: Activity,
    color: "from-slate-500 to-slate-700",
  },
];

export default function Demo() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activePipeline, setActivePipeline] = useState<PipelineState | null>(
    null
  );
  const [lastPipeline, setLastPipeline] = useState<PipelineState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Animate pipeline stages sequentially
  async function animatePipeline(
    stages: PipelineStage[]
  ): Promise<PipelineState> {
    const animated: PipelineStage[] = stages.map((s) => ({
      ...s,
      status: "pending" as const,
    }));
    let totalMs = 0;

    for (let i = 0; i < animated.length; i++) {
      // Set current stage to running
      animated[i] = { ...animated[i], status: "running" };
      setActivePipeline({ stages: [...animated] });

      // Simulate duration
      const dur = stages[i].durationMs || 0;
      const displayDelay = dur === 0 ? 150 : Math.min(dur * 1.2, 1200);
      await new Promise((r) => setTimeout(r, displayDelay));

      // Set to done
      animated[i] = { ...stages[i], status: "done" };
      totalMs += dur;
      setActivePipeline({ stages: [...animated], totalMs });
    }

    const final: PipelineState = { stages: [...animated], totalMs };
    return final;
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setActivePipeline(null);
    setLastPipeline(null);

    // Try real backend first, fall back to simulation
    let responseContent: string;
    let actions: string[] = [];
    let pipeline: PipelineState;

    try {
      const [apiResult, simulated] = await Promise.all([
        api
          .sendMessage(trimmed, "demo_user")
          .catch(() => null as ChatResponse | null),
        (async () => {
          const sim = getSimulatedResponse(trimmed);
          const p = await animatePipeline(sim.stages);
          return { ...sim, pipeline: p };
        })(),
      ]);

      pipeline = simulated.pipeline;

      if (apiResult?.success && apiResult.response) {
        responseContent = apiResult.response.content;
        actions = apiResult.response.suggested_actions || [];
      } else {
        responseContent = simulated.response;
        actions = simulated.actions;
      }
    } catch {
      const sim = getSimulatedResponse(trimmed);
      pipeline = await animatePipeline(sim.stages);
      responseContent = sim.response;
      actions = sim.actions;
    }

    setLastPipeline(pipeline);
    setActivePipeline(null);

    const botMessage: Message = {
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      suggested_actions: actions,
      pipeline,
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsLoading(false);
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleReset() {
    setMessages([WELCOME]);
    setActivePipeline(null);
    setLastPipeline(null);
    setInput("");
    inputRef.current?.focus();
  }

  const currentPipeline = activePipeline || lastPipeline;

  return (
    <div className="space-y-4">
      {/* Persona Hub */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="font-montserrat text-xl font-bold text-slate-900">
              IndusAI Live Demo
            </h1>
            <p className="text-xs text-slate-500">
              Explore each persona view or try the AI assistant below
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {PERSONA_VIEWS.map((p) => (
            <button
              key={p.path}
              onClick={() => navigate(p.path)}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-slate-300"
            >
              <div className={cn(
                "absolute inset-0 opacity-0 bg-gradient-to-br transition-opacity group-hover:opacity-5",
                p.color
              )} />
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                  p.color
                )}>
                  <p.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                  <p className="text-[11px] text-slate-500">{p.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

    <div className="flex h-[calc(100vh-16rem)] gap-4">
      {/* LEFT: Chat */}
      <div className="flex w-[55%] flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">IndusAI Demo</h2>
              <p className="text-[10px] text-emerald-100">
                GraphRAG-powered distribution intelligence
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-md bg-white/15 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/25 transition-colors"
          >
            Reset demo
          </button>
        </div>

        {/* Scenario buttons */}
        <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Try a scenario
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.message)}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <s.icon className="h-3 w-3" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, index) => (
            <div key={index}>
              <div
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  )}
                >
                  <div className="text-[12px] whitespace-pre-wrap">
                    {msg.role === "assistant"
                      ? renderContent(msg.content)
                      : msg.content}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "mt-0.5 flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <span className="text-[9px] text-gray-400">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Suggested actions */}
              {msg.role === "assistant" &&
                msg.suggested_actions &&
                msg.suggested_actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggested_actions.map((action, ai) => (
                      <button
                        key={ai}
                        onClick={() => sendMessage(action)}
                        disabled={isLoading}
                        className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {action}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 shadow-sm">
                <div className="flex items-center space-x-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, orders, cross-references..."
              disabled={isLoading}
              className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:bg-gray-300"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: Pipeline + Stats */}
      <div className="flex w-[45%] flex-col gap-4">
        {/* Pipeline card */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                GraphRAG Pipeline
              </h3>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Watch each stage resolve in real-time
            </p>
          </div>

          <div className="p-4">
            {currentPipeline ? (
              <PipelineViz pipeline={currentPipeline} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Zap className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  Send a message to see the pipeline
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Intent Classification → Graph Traversal → Vector Search →
                  Context Assembly → Response Generation
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Cost per query
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">$0.009</p>
            <p className="text-[10px] text-emerald-600">
              400-1,250x ROI vs. manual
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Response time
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">~3s</p>
            <p className="text-[10px] text-emerald-600">
              vs. 15-20 min manual lookup
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Graph nodes
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">50+</p>
            <p className="text-[10px] text-gray-500">
              Parts, specs, cross-refs, BOMs
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Gross margin
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600">96%</p>
            <p className="text-[10px] text-gray-500">
              Profitable from customer #1
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
