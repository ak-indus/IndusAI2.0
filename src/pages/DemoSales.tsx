import { useState } from "react";
import { Link } from "react-router-dom";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  DollarSign,
  FileText,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Send,
  ShieldCheck,
  ShoppingCart,
  CalendarDays,
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

type QuoteStage = "Draft" | "Sent" | "Reviewed" | "Accepted" | "Converted to Order";

interface Quote {
  id: string;
  customer: string;
  description: string;
  amount: number;
  stage: QuoteStage;
  date: string;
  priority?: "urgent";
}

interface LineItem {
  sku: string;
  product: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  available: "in_stock" | "low_stock";
}

interface RecentOrder {
  orderNumber: string;
  customer: string;
  amount: number;
  date: string;
  quoteRef: string;
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: Record<string, unknown> }>;
  label?: string;
  isCurrency?: boolean;
}

function ChartTooltip({ active, payload, label, isCurrency = true }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-slate-800">
          {isCurrency ? formatCurrency(entry.value) : formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo Data                                                          */
/* ------------------------------------------------------------------ */

const QUOTES: Quote[] = [
  { id: "QT-2026-0091", customer: "Acme Manufacturing", description: "24x SKF 6204-2RS + 12x Gates B68", amount: 2845, stage: "Sent", date: "2026-03-11" },
  { id: "QT-2026-0092", customer: "Midwest Industrial", description: "BOM: Centrifugal Pump Assembly (ASM-PUMP-001) x 3", amount: 14200, stage: "Reviewed", date: "2026-03-10" },
  { id: "QT-2026-0093", customer: "Pacific Equipment", description: "100x M10x30 Hex Bolts + 50x M10 Flat Washers", amount: 890, stage: "Accepted", date: "2026-03-09" },
  { id: "QT-2026-0094", customer: "Southern Machine Works", description: "Emergency: 6x 22210-E1-K Spherical Roller Bearings", amount: 4150, stage: "Draft", date: "2026-03-12", priority: "urgent" },
  { id: "QT-2026-0095", customer: "Delta Processing", description: "Gearbox Rebuild Kit (ASM-GEARBOX-001)", amount: 615, stage: "Sent", date: "2026-03-11" },
  { id: "QT-2026-0096", customer: "Apex Industrial", description: "Annual bearing supply contract \u2014 500 units/quarter", amount: 89000, stage: "Reviewed", date: "2026-03-08" },
  { id: "QT-2026-0097", customer: "Great Lakes MRO", description: "Gates PowerGrip HTD 5M belt assortment", amount: 3420, stage: "Sent", date: "2026-03-10" },
  { id: "QT-2026-0098", customer: "Coastal Fabricators", description: "NSK 6205ZZ bulk order \u2014 200 units", amount: 6800, stage: "Accepted", date: "2026-03-07" },
  { id: "QT-2026-0099", customer: "Mountain States Supply", description: "Full P2P setup: 12 SKUs, quarterly POs", amount: 42000, stage: "Draft", date: "2026-03-12" },
  { id: "QT-2026-0100", customer: "Tri-County Distributors", description: "Cross-reference package: SKF\u2192NSK migration", amount: 18500, stage: "Reviewed", date: "2026-03-09" },
];

const STAGES: QuoteStage[] = ["Draft", "Sent", "Reviewed", "Accepted", "Converted to Order"];

const STAGE_COLORS: Record<QuoteStage, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Sent: "bg-blue-100 text-blue-700",
  Reviewed: "bg-indigo-100 text-indigo-700",
  Accepted: "bg-green-100 text-green-700",
  "Converted to Order": "bg-emerald-100 text-emerald-800",
};

const DETAIL_LINE_ITEMS: LineItem[] = [
  { sku: "BRG-SKF-6204-2RS", product: "SKF 6204-2RS Deep Groove Ball Bearing", qty: 24, unitCost: 11.20, unitPrice: 18.50, available: "in_stock" },
  { sku: "BLT-GATES-B68", product: "Gates B68 Hi-Power V-Belt", qty: 12, unitCost: 28.40, unitPrice: 42.75, available: "in_stock" },
  { sku: "BRG-SKF-6205-2RS", product: "SKF 6205-2RS Deep Groove Ball Bearing", qty: 6, unitCost: 14.50, unitPrice: 22.00, available: "low_stock" },
  { sku: "SEAL-CR-12345", product: "CR 12345 Oil Seal, Nitrile", qty: 12, unitCost: 6.80, unitPrice: 11.25, available: "in_stock" },
];

const REVENUE_BY_CUSTOMER = [
  { name: "Apex Industrial", revenue: 89000 },
  { name: "Mountain States Supply", revenue: 42000 },
  { name: "Tri-County Distributors", revenue: 18500 },
  { name: "Midwest Industrial", revenue: 14200 },
  { name: "Coastal Fabricators", revenue: 6800 },
].reverse();

const FUNNEL_DATA = [
  { stage: "Sent", count: 42, fill: "#3b82f6" },
  { stage: "Reviewed", count: 28, fill: "#6366f1" },
  { stage: "Accepted", count: 19, fill: "#8b5cf6" },
  { stage: "Converted", count: 13, fill: "#10b981" },
];

const RECENT_ORDERS: RecentOrder[] = [
  { orderNumber: "ORD-2026-0187", customer: "Pacific Equipment", amount: 890, date: "2026-03-09", quoteRef: "QT-2026-0093" },
  { orderNumber: "ORD-2026-0186", customer: "Coastal Fabricators", amount: 6800, date: "2026-03-08", quoteRef: "QT-2026-0098" },
  { orderNumber: "ORD-2026-0185", customer: "Heartland Motors", amount: 3250, date: "2026-03-07", quoteRef: "QT-2026-0084" },
  { orderNumber: "ORD-2026-0184", customer: "Summit MRO", amount: 11400, date: "2026-03-06", quoteRef: "QT-2026-0079" },
  { orderNumber: "ORD-2026-0183", customer: "Valley Industrial", amount: 7650, date: "2026-03-05", quoteRef: "QT-2026-0076" },
];

const CHART_BLUE = "#4f46e5";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoSales() {
  const [expandedQuote, setExpandedQuote] = useState<string | null>("QT-2026-0091");
  const [activeStageFilter, setActiveStageFilter] = useState<QuoteStage | "All">("All");

  /* ---------- KPI cards ---------- */

  const kpiCards: KpiCard[] = [
    {
      label: "Pipeline Value",
      value: formatCurrency(284500),
      icon: DollarSign,
      border: "border-l-indigo-500",
      bg: "bg-indigo-50/60",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Quotes Sent Today",
      value: "8",
      icon: FileText,
      border: "border-l-blue-500",
      bg: "bg-blue-50/60",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Quote-to-Order Rate",
      value: "68%",
      icon: Target,
      border: "border-l-emerald-500",
      bg: "bg-emerald-50/60",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Avg Deal Size",
      value: formatCurrency(12400),
      icon: TrendingUp,
      border: "border-l-violet-500",
      bg: "bg-violet-50/60",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  /* ---------- Filtered quotes ---------- */

  const filteredQuotes =
    activeStageFilter === "All"
      ? QUOTES
      : QUOTES.filter((q) => q.stage === activeStageFilter);

  /* ---------- Detail quote ---------- */

  const detailTotals = DETAIL_LINE_ITEMS.reduce(
    (acc, li) => {
      const ext = li.qty * li.unitPrice;
      const cost = li.qty * li.unitCost;
      return { revenue: acc.revenue + ext, cost: acc.cost + cost };
    },
    { revenue: 0, cost: 0 },
  );
  const detailMarginPct = ((detailTotals.revenue - detailTotals.cost) / detailTotals.revenue) * 100;

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Link to="/demo" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">&larr; Back to Demo Hub</Link>
        <h1 className="font-montserrat text-2xl font-bold text-slate-900">
          Inbound Sales &mdash; Demand Rep View
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Quotes, pipeline, and ordering workflow &mdash; demo data
        </p>
      </div>

      {/* ---- Row 1: KPI Cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
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
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
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

      {/* ---- Row 2: Active Pipeline / Quote Board ---- */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Active Pipeline</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveStageFilter("All")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeStageFilter === "All"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              All ({QUOTES.length})
            </button>
            {STAGES.filter((s) => s !== "Converted to Order").map((stage) => {
              const count = QUOTES.filter((q) => q.stage === stage).length;
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStageFilter(stage)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    activeStageFilter === stage
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {stage} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage progress bar */}
        <div className="flex border-b border-slate-100">
          {STAGES.map((stage, i) => {
            const count = QUOTES.filter((q) => q.stage === stage).length;
            return (
              <div
                key={stage}
                className={cn(
                  "flex flex-1 flex-col items-center py-3 text-center text-xs",
                  i < STAGES.length - 1 && "border-r border-slate-100",
                )}
              >
                <span className="font-semibold text-slate-700">{stage}</span>
                <span className="mt-0.5 text-lg font-bold text-indigo-600">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Quote rows */}
        <div className="divide-y divide-slate-100">
          {filteredQuotes.map((q) => (
            <div key={q.id}>
              <button
                onClick={() => setExpandedQuote(expandedQuote === q.id ? null : q.id)}
                className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="min-w-[120px] font-mono text-sm font-medium text-indigo-600">
                  {q.id}
                </span>
                <span className="min-w-[180px] text-sm font-medium text-slate-800">
                  {q.customer}
                </span>
                <span className="flex-1 truncate text-sm text-slate-500">{q.description}</span>
                {q.priority === "urgent" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    URGENT
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    STAGE_COLORS[q.stage],
                  )}
                >
                  {q.stage}
                </span>
                <span className="min-w-[100px] text-right text-sm font-semibold text-slate-800">
                  {formatCurrency(q.amount)}
                </span>
                <span className="text-xs text-slate-400">{q.date}</span>
                {expandedQuote === q.id ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {/* Expanded detail (only for QT-2026-0091 with full data) */}
              {expandedQuote === q.id && q.id === "QT-2026-0091" && (
                <div className="border-t border-indigo-100 bg-indigo-50/30 px-6 py-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        {q.id} &mdash; {q.customer}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Pricing Tier: <span className="font-medium text-indigo-600">B2B Preferred (Tier 2)</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Convert to Order
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50">
                        <Send className="h-3.5 w-3.5" />
                        Send to Customer
                      </button>
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Request Approval
                      </button>
                    </div>
                  </div>

                  {/* Line items table */}
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-2.5">SKU</th>
                          <th className="px-4 py-2.5">Product</th>
                          <th className="px-4 py-2.5 text-center">Qty</th>
                          <th className="px-4 py-2.5 text-right">Unit Cost</th>
                          <th className="px-4 py-2.5 text-right">Unit Price</th>
                          <th className="px-4 py-2.5 text-right">Ext. Price</th>
                          <th className="px-4 py-2.5 text-center">Margin</th>
                          <th className="px-4 py-2.5 text-center">Availability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {DETAIL_LINE_ITEMS.map((li) => {
                          const ext = li.qty * li.unitPrice;
                          const margin = ((li.unitPrice - li.unitCost) / li.unitPrice) * 100;
                          return (
                            <tr key={li.sku} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                                {li.sku}
                              </td>
                              <td className="px-4 py-2.5 text-slate-800">{li.product}</td>
                              <td className="px-4 py-2.5 text-center font-medium">{li.qty}</td>
                              <td className="px-4 py-2.5 text-right text-slate-500">
                                {formatCurrency(li.unitCost)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                                {formatCurrency(li.unitPrice)}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                {formatCurrency(ext)}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                                    margin >= 35
                                      ? "bg-green-100 text-green-700"
                                      : margin >= 25
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700",
                                  )}
                                >
                                  {margin.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {li.available === "in_stock" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    In Stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Low Stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td colSpan={5} className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">
                            Quote Total
                          </td>
                          <td className="px-4 py-2.5 text-right text-base font-bold text-indigo-700">
                            {formatCurrency(detailTotals.revenue)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              {detailMarginPct.toFixed(1)}% avg
                            </span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Collapsed summary for other quotes */}
              {expandedQuote === q.id && q.id !== "QT-2026-0091" && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">{q.customer}</span> &mdash; {q.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Expand QT-2026-0091 for full line-item detail preview.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Convert to Order
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                      <Send className="h-3.5 w-3.5" />
                      Send to Customer
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Request Approval
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Row 3: Charts ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Customer */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Revenue by Customer</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={REVENUE_BY_CUSTOMER}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={28}>
                  {REVENUE_BY_CUSTOMER.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === REVENUE_BY_CUSTOMER.length - 1 ? CHART_BLUE : `${CHART_BLUE}${(60 + i * 10).toString(16)}`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quote Conversion Funnel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Quote Conversion Funnel</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FUNNEL_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip isCurrency={false} />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={56}>
                  {FUNNEL_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ---- Row 4: Recent Orders ---- */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Recent Orders from Quotes</h2>
          <p className="mt-0.5 text-xs text-slate-500">Orders converted from accepted quotes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Order #</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Quote Ref</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RECENT_ORDERS.map((order) => (
                <tr key={order.orderNumber} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-sm font-medium text-indigo-600">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">{order.customer}</td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{order.quoteRef}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(order.amount)}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {order.date}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      Confirmed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
