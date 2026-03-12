import { Link } from "react-router-dom";
import { cn, formatNumber } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ShoppingCart,
  Target,
  Clock,
  Boxes,
  Database,
  HardDrive,
  Cpu,
  Brain,
  MessageSquare,
  Sparkles,
  Package,
  CheckCircle2,
  Truck,
  PackageCheck,
  ClipboardList,
  AlertTriangle,
  Activity,
  Mail,
  Smartphone,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KpiCard {
  label: string;
  value: string;
  icon: LucideIcon;
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
}

interface ServiceStatus {
  name: string;
  status: "online" | "degraded" | "offline";
  latency: string;
  details: string[];
}

interface PipelineStage {
  label: string;
  count: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface InventoryAlert {
  sku: string;
  remaining: string;
  reorderPoint: string;
  status: "CRITICAL" | "LOW" | "OK";
  note?: string;
}

interface ChannelData {
  name: string;
  value: number;
  pct: string;
  color: string;
}

interface TimelineEvent {
  time: string;
  description: string;
  type: "auto-po" | "shipping" | "conversion" | "alert" | "ai" | "invoice" | "system" | "startup";
}

/* ------------------------------------------------------------------ */
/*  Hardcoded demo data                                                */
/* ------------------------------------------------------------------ */

const KPI_CARDS: KpiCard[] = [
  {
    label: "Orders Today",
    value: "23",
    icon: ShoppingCart,
    border: "border-l-blue-600",
    bg: "bg-blue-50/60",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    label: "Fill Rate",
    value: "96.8%",
    icon: Target,
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/60",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "Avg Fulfillment Time",
    value: "1.4 days",
    icon: Clock,
    border: "border-l-indigo-500",
    bg: "bg-indigo-50/60",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    label: "Active SKUs",
    value: "847",
    icon: Boxes,
    border: "border-l-slate-500",
    bg: "bg-slate-50/60",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

const SERVICES: ServiceStatus[] = [
  {
    name: "PostgreSQL",
    status: "online",
    latency: "23ms",
    details: ["2.1GB / 4GB used"],
  },
  {
    name: "Neo4j Graph",
    status: "online",
    latency: "15ms",
    details: ["48K nodes", "124K edges"],
  },
  {
    name: "Redis Cache",
    status: "online",
    latency: "1ms",
    details: ["89% hit rate"],
  },
  {
    name: "Claude API",
    status: "online",
    latency: "890ms avg",
    details: ["$12.40 today"],
  },
  {
    name: "WhatsApp API",
    status: "online",
    latency: "245ms avg",
    details: ["142 msgs today"],
  },
  {
    name: "Voyage AI",
    status: "online",
    latency: "85ms avg",
    details: ["1.2K embeddings"],
  },
];

const SERVICE_ICONS: Record<string, LucideIcon> = {
  PostgreSQL: Database,
  "Neo4j Graph": HardDrive,
  "Redis Cache": Cpu,
  "Claude API": Brain,
  "WhatsApp API": MessageSquare,
  "Voyage AI": Sparkles,
};

const PIPELINE_STAGES: PipelineStage[] = [
  { label: "New", count: 8, icon: ClipboardList, color: "text-blue-700", bgColor: "bg-blue-100" },
  { label: "Confirmed", count: 12, icon: CheckCircle2, color: "text-indigo-700", bgColor: "bg-indigo-100" },
  { label: "Picking", count: 5, icon: Package, color: "text-amber-700", bgColor: "bg-amber-100" },
  { label: "Packed", count: 3, icon: PackageCheck, color: "text-orange-700", bgColor: "bg-orange-100" },
  { label: "Shipped", count: 18, icon: Truck, color: "text-purple-700", bgColor: "bg-purple-100" },
  { label: "Delivered", count: 142, icon: CheckCircle2, color: "text-emerald-700", bgColor: "bg-emerald-100" },
];

const INVENTORY_ALERTS: InventoryAlert[] = [
  { sku: "SKF 6204-2RS", remaining: "6", reorderPoint: "24", status: "CRITICAL", note: "Auto-PO triggered" },
  { sku: "Gates B68 V-Belt", remaining: "12", reorderPoint: "20", status: "LOW" },
  { sku: "M10x30 Hex Bolt Gr8.8", remaining: "450", reorderPoint: "500", status: "LOW" },
  { sku: "Mobil SGO-220 Gear Oil", remaining: "2L", reorderPoint: "10L", status: "CRITICAL" },
  { sku: "NSK 6204DDU", remaining: "24", reorderPoint: "20", status: "OK" },
  { sku: "Garlock HG-90-001 Gasket", remaining: "3", reorderPoint: "10", status: "LOW", note: "PO pending" },
];

const CHANNEL_DATA: ChannelData[] = [
  { name: "WhatsApp", value: 142, pct: "58%", color: "#25D366" },
  { name: "Email", value: 64, pct: "26%", color: "#3b82f6" },
  { name: "Web Chat", value: 28, pct: "11%", color: "#8b5cf6" },
  { name: "SMS", value: 12, pct: "5%", color: "#f59e0b" },
];

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  WhatsApp: MessageSquare,
  Email: Mail,
  "Web Chat": Globe,
  SMS: Smartphone,
};

const AI_METRICS = [
  { label: "Queries handled autonomously", value: "89%" },
  { label: "Escalated to human", value: "11%" },
  { label: "Avg confidence score", value: "0.91" },
  { label: "Avg response time", value: "2.8s" },
  { label: "Cost per query", value: "$0.009" },
];

const TIMELINE_EVENTS: TimelineEvent[] = [
  { time: "10:42 AM", type: "auto-po", description: "Auto-PO generated: SKF 6204-2RS x 48 units \u2192 Supplier SKF Direct" },
  { time: "10:38 AM", type: "shipping", description: "Order ORD-2026-0187 shipped via UPS Ground" },
  { time: "10:15 AM", type: "conversion", description: "Quote QT-2026-0095 converted to order by Midwest Industrial" },
  { time: "9:52 AM", type: "alert", description: "Low stock alert: Mobil SGO-220 Gear Oil (2L remaining)" },
  { time: "9:30 AM", type: "ai", description: "WhatsApp: Acme Mfg inquiry auto-resolved (bearing cross-ref)" },
  { time: "9:12 AM", type: "invoice", description: "Invoice INV-2026-0205 sent to Delta Processing ($6,750)" },
  { time: "8:45 AM", type: "system", description: "Neo4j graph sync: 12 new cross-references added" },
  { time: "8:00 AM", type: "startup", description: "System startup: all services healthy" },
];

const TIMELINE_TYPE_STYLES: Record<string, { dot: string; icon: LucideIcon }> = {
  "auto-po": { dot: "bg-blue-500", icon: Package },
  shipping: { dot: "bg-purple-500", icon: Truck },
  conversion: { dot: "bg-emerald-500", icon: ShoppingCart },
  alert: { dot: "bg-red-500", icon: AlertTriangle },
  ai: { dot: "bg-green-500", icon: Brain },
  invoice: { dot: "bg-indigo-500", icon: ClipboardList },
  system: { dot: "bg-slate-500", icon: Database },
  startup: { dot: "bg-emerald-500", icon: Activity },
};

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

interface DonutTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChannelData }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-500">{d.name}</p>
      <p className="text-sm font-semibold text-slate-800">
        {formatNumber(d.value)} messages ({d.pct})
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status dot helper                                                  */
/* ------------------------------------------------------------------ */

function StatusDot({ status }: { status: "online" | "degraded" | "offline" }) {
  const colors = {
    online: "bg-emerald-500",
    degraded: "bg-yellow-500",
    offline: "bg-red-500",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "online" && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", colors[status])} />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", colors[status])} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function DemoOps() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Link to="/demo" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">&larr; Back to Demo Hub</Link>
        <h1 className="font-montserrat text-2xl font-bold text-slate-900">
          Operations Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Real-time overview of your MRO distribution operations &mdash; demo mode
        </p>
      </div>

      {/* ---- Section 1: KPI Cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className={cn(
              "relative overflow-hidden rounded-xl border border-slate-200 border-l-4 p-5 shadow-sm transition-shadow hover:shadow-md",
              card.border,
              card.bg,
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {card.value}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  card.iconBg,
                )}
              >
                <card.icon className={cn("h-5 w-5", card.iconColor)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Section 2: System Health Monitor ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
          System Health Monitor
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {SERVICES.map((svc) => {
            const Icon = SERVICE_ICONS[svc.name] || Activity;
            return (
              <div
                key={svc.name}
                className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={svc.status} />
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {svc.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-600">
                    {svc.latency}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {svc.details.map((d, i) => (
                    <p key={i} className="text-[10px] text-slate-500">{d}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Section 3: Order Fulfillment Pipeline ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
          Order Fulfillment Pipeline
        </h2>
        <div className="flex items-stretch gap-0">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isLast = idx === PIPELINE_STAGES.length - 1;
            return (
              <div key={stage.label} className="flex flex-1 items-stretch">
                <div
                  className={cn(
                    "flex w-full flex-col items-center justify-center rounded-lg border border-slate-100 px-2 py-4 text-center transition-shadow hover:shadow-sm",
                    stage.bgColor,
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm",
                    )}
                  >
                    <stage.icon className={cn("h-4.5 w-4.5", stage.color)} />
                  </div>
                  <p className={cn("mt-2 text-2xl font-bold", stage.color)}>
                    {formatNumber(stage.count)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {stage.label}
                  </p>
                  {idx === 4 && (
                    <p className="mt-0.5 text-[9px] text-slate-400">today</p>
                  )}
                  {idx === 5 && (
                    <p className="mt-0.5 text-[9px] text-slate-400">this week</p>
                  )}
                </div>
                {!isLast && (
                  <div className="flex items-center px-1">
                    <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-slate-300">
                      <path d="M2 2L12 12L2 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Section 4: Inventory Alerts ---- */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Inventory Alerts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SKU / Part
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Remaining
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reorder Point
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INVENTORY_ALERTS.map((item) => (
                <tr
                  key={item.sku}
                  className="transition-colors hover:bg-slate-50/60"
                >
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-sm font-medium text-slate-800">
                    {item.sku}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-slate-700">
                    {item.remaining}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-slate-500">
                    {item.reorderPoint}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.status === "CRITICAL" && "bg-red-100 text-red-700",
                        item.status === "LOW" && "bg-yellow-100 text-yellow-800",
                        item.status === "OK" && "bg-green-100 text-green-700",
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                    {item.note || "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Section 5: Channel Activity + AI Metrics ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Messages by Channel (donut chart) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Messages by Channel
          </h2>
          <div className="flex items-center gap-6">
            <div className="h-[200px] w-[200px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CHANNEL_DATA}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {CHANNEL_DATA.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {CHANNEL_DATA.map((ch) => {
                const Icon = CHANNEL_ICONS[ch.name] || MessageSquare;
                return (
                  <div key={ch.name} className="flex items-center gap-3">
                    <span
                      className="flex h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: ch.color }}
                    />
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="flex-1 text-sm text-slate-700">{ch.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{formatNumber(ch.value)}</span>
                    <span className="text-xs text-slate-400">{ch.pct}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: AI Performance Metrics */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
            AI Performance Metrics
          </h2>
          <div className="space-y-4">
            {AI_METRICS.map((m) => {
              const isPercentage = m.value.endsWith("%");
              const numericVal = parseFloat(m.value);
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{m.label}</span>
                    <span className="text-sm font-bold text-slate-900">{m.value}</span>
                  </div>
                  {isPercentage && (
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          numericVal >= 80 ? "bg-emerald-500" : numericVal >= 50 ? "bg-yellow-500" : "bg-red-500",
                        )}
                        style={{ width: `${numericVal}%` }}
                      />
                    </div>
                  )}
                  {!isPercentage && m.label.includes("confidence") && (
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${numericVal * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Section 6: Daily Operations Timeline ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
          Daily Operations Timeline
        </h2>
        <div className="relative">
          {TIMELINE_EVENTS.map((event, idx) => {
            const style = TIMELINE_TYPE_STYLES[event.type] || TIMELINE_TYPE_STYLES.system;
            const Icon = style.icon;
            const isLast = idx === TIMELINE_EVENTS.length - 1;
            return (
              <div key={idx} className="flex gap-4">
                {/* Timeline rail */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white",
                      style.dot,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div className="h-full w-px bg-slate-200" />
                  )}
                </div>
                {/* Content */}
                <div className={cn("pb-6", isLast && "pb-0")}>
                  <p className="text-xs font-semibold text-slate-400">{event.time}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
