import { Link } from "react-router-dom";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Send,
  PenLine,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KpiCard {
  label: string;
  value: string;
  sublabel: string;
  icon: LucideIcon;
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
}

interface AgingBucket {
  label: string;
  amount: number;
  invoices: number;
  color: string;
  bgColor: string;
}

interface Invoice {
  number: string;
  customer: string;
  amount: number;
  status: string;
  statusDetail?: string;
  date: string;
}

interface CategoryMargin {
  category: string;
  margin: number;
}

interface CustomerProfit {
  customer: string;
  revenue: number;
  cogs: number;
  marginDollar: number;
  marginPct: number;
}

interface RebateProgram {
  supplier: string;
  program: string;
  earned: number;
  target: number;
  pct: number;
}

interface RevenueTrend {
  month: string;
  revenue: number;
}

/* ------------------------------------------------------------------ */
/*  Hardcoded Demo Data                                                */
/* ------------------------------------------------------------------ */

const KPI_CARDS: KpiCard[] = [
  {
    label: "Revenue MTD",
    value: "$342,800",
    sublabel: "+12.4% vs last month",
    icon: DollarSign,
    border: "border-l-amber-500",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    label: "Outstanding AR",
    value: "$128,400",
    sublabel: "30 open invoices",
    icon: Receipt,
    border: "border-l-orange-500",
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    label: "Gross Margin",
    value: "34.2%",
    sublabel: "+1.8pp vs prior quarter",
    icon: TrendingUp,
    border: "border-l-emerald-500",
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "DSO",
    value: "38 days",
    sublabel: "Target: 35 days",
    icon: Clock,
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
];

const AGING_BUCKETS: AgingBucket[] = [
  { label: "Current", amount: 68200, invoices: 14, color: "#22c55e", bgColor: "bg-green-50" },
  { label: "1–30 Days", amount: 32100, invoices: 8, color: "#eab308", bgColor: "bg-yellow-50" },
  { label: "31–60 Days", amount: 18400, invoices: 5, color: "#f97316", bgColor: "bg-orange-50" },
  { label: "61–90 Days", amount: 6200, invoices: 2, color: "#ef4444", bgColor: "bg-red-50" },
  { label: "90+ Days", amount: 3500, invoices: 1, color: "#b91c1c", bgColor: "bg-red-100" },
];

const INVOICES: Invoice[] = [
  { number: "INV-2026-0201", customer: "Acme Manufacturing", amount: 12450, status: "Paid", date: "Feb 28" },
  { number: "INV-2026-0202", customer: "Midwest Industrial", amount: 8920, status: "Sent", date: "Mar 2" },
  { number: "INV-2026-0203", customer: "Pacific Equipment", amount: 3180, status: "Overdue", statusDetail: "42 days", date: "Jan 28" },
  { number: "INV-2026-0204", customer: "Southern Machine Works", amount: 24600, status: "Paid", date: "Mar 5" },
  { number: "INV-2026-0205", customer: "Delta Processing", amount: 6750, status: "Sent", date: "Mar 8" },
  { number: "INV-2026-0206", customer: "Apex Industrial", amount: 45200, status: "Partial", statusDetail: "$22,600 received", date: "Feb 15" },
  { number: "INV-2026-0207", customer: "Great Lakes MRO", amount: 1890, status: "Draft", date: "Mar 11" },
  { number: "INV-2026-0208", customer: "Coastal Fabricators", amount: 15400, status: "Overdue", statusDetail: "68 days", date: "Jan 2" },
];

const CATEGORY_MARGINS: CategoryMargin[] = [
  { category: "Fasteners", margin: 42 },
  { category: "Bearings", margin: 38 },
  { category: "Seals & Gaskets", margin: 35 },
  { category: "Belts & Power Trans.", margin: 32 },
  { category: "Lubricants", margin: 28 },
];

const CUSTOMER_PROFITABILITY: CustomerProfit[] = [
  { customer: "Acme Manufacturing", revenue: 186400, cogs: 119300, marginDollar: 67100, marginPct: 36.0 },
  { customer: "Southern Machine Works", revenue: 142800, cogs: 95700, marginDollar: 47100, marginPct: 33.0 },
  { customer: "Apex Industrial", revenue: 128600, cogs: 82300, marginDollar: 46300, marginPct: 36.0 },
  { customer: "Delta Processing", revenue: 94200, cogs: 65200, marginDollar: 29000, marginPct: 30.8 },
  { customer: "Midwest Industrial", revenue: 78500, cogs: 50600, marginDollar: 27900, marginPct: 35.5 },
];

const REBATE_PROGRAMS: RebateProgram[] = [
  { supplier: "SKF", program: "Q1 Volume Rebate", earned: 12400, target: 18000, pct: 69 },
  { supplier: "NSK", program: "Annual Growth", earned: 8200, target: 15000, pct: 55 },
  { supplier: "Gates", program: "Stocking Rebate", earned: 3100, target: 5000, pct: 62 },
  { supplier: "Timken", program: "Preferred Partner", earned: 6800, target: 8000, pct: 85 },
];

const REVENUE_TREND: RevenueTrend[] = [
  { month: "Apr '25", revenue: 182000 },
  { month: "May '25", revenue: 196500 },
  { month: "Jun '25", revenue: 210800 },
  { month: "Jul '25", revenue: 198200 },
  { month: "Aug '25", revenue: 224600 },
  { month: "Sep '25", revenue: 238400 },
  { month: "Oct '25", revenue: 256100 },
  { month: "Nov '25", revenue: 271800 },
  { month: "Dec '25", revenue: 248900 },
  { month: "Jan '26", revenue: 289400 },
  { month: "Feb '26", revenue: 318200 },
  { month: "Mar '26", revenue: 342800 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const INVOICE_STATUS_STYLES: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Sent: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
  Partial: "bg-teal-100 text-teal-700",
  Draft: "bg-slate-100 text-slate-600",
};

function statusIcon(status: string) {
  switch (status) {
    case "Paid":
      return <CheckCircle2 className="mr-1 h-3.5 w-3.5" />;
    case "Sent":
      return <Send className="mr-1 h-3.5 w-3.5" />;
    case "Overdue":
      return <AlertTriangle className="mr-1 h-3.5 w-3.5" />;
    case "Partial":
      return <DollarSign className="mr-1 h-3.5 w-3.5" />;
    case "Draft":
      return <PenLine className="mr-1 h-3.5 w-3.5" />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Chart Tooltip                                                      */
/* ------------------------------------------------------------------ */

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: Record<string, unknown> }>;
  label?: string;
  isCurrency?: boolean;
  suffix?: string;
}

function ChartTooltip({ active, payload, label, isCurrency = true, suffix }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold text-slate-800">
          {isCurrency ? formatCurrency(entry.value) : `${formatNumber(entry.value)}${suffix ?? ""}`}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function DemoFinance() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <Link to="/demo" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700">&larr; Back to Demo Hub</Link>
        <h1 className="text-2xl font-bold text-slate-800">Finance Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Invoicing, receivables, margin analysis, and rebate tracking
        </p>
      </div>

      {/* ---- 1. KPI Cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                "rounded-xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm",
                card.border,
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-800">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.sublabel}</p>
                </div>
                <div className={cn("rounded-lg p-2.5", card.iconBg)}>
                  <Icon className={cn("h-5 w-5", card.iconColor)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- 2. AR Aging Summary ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">AR Aging Summary</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={AGING_BUCKETS}
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
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#334155" }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
                  {AGING_BUCKETS.map((bucket, idx) => (
                    <Cell key={idx} fill={bucket.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aging Cards */}
          <div className="space-y-3">
            {AGING_BUCKETS.map((bucket) => (
              <div
                key={bucket.label}
                className={cn(
                  "flex items-center justify-between rounded-lg px-4 py-3",
                  bucket.bgColor,
                )}
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{bucket.label}</p>
                  <p className="text-xs text-slate-500">
                    {bucket.invoices} invoice{bucket.invoices !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {formatCurrency(bucket.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- 3. Invoice Table ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Recent Invoices</h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            {INVOICES.length} invoices
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoice #
                </th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </th>
                <th className="pb-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr
                  key={inv.number}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="py-3 pr-4 font-medium text-slate-800">{inv.number}</td>
                  <td className="py-3 pr-4 text-slate-600">{inv.customer}</td>
                  <td className="py-3 pr-4 text-right font-medium text-slate-800">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        INVOICE_STATUS_STYLES[inv.status] ?? "bg-slate-100 text-slate-600",
                      )}
                    >
                      {statusIcon(inv.status)}
                      {inv.status}
                      {inv.statusDetail ? ` (${inv.statusDetail})` : ""}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- 4. Margin Analysis (two-column) ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Product Category Margins */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Product Category Margins</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={CATEGORY_MARGINS}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 50]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 12, fill: "#334155" }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <Tooltip content={<ChartTooltip isCurrency={false} suffix="%" />} />
              <Bar dataKey="margin" radius={[0, 6, 6, 0]} barSize={24}>
                {CATEGORY_MARGINS.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      ["#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"][idx]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Customer Profitability */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Customer Profitability</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Revenue
                  </th>
                  <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    COGS
                  </th>
                  <th className="pb-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Margin $
                  </th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMER_PROFITABILITY.map((row) => (
                  <tr
                    key={row.customer}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-3 pr-3 font-medium text-slate-700">{row.customer}</td>
                    <td className="py-3 pr-3 text-right text-slate-600">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="py-3 pr-3 text-right text-slate-500">
                      {formatCurrency(row.cogs)}
                    </td>
                    <td className="py-3 pr-3 text-right font-medium text-emerald-600">
                      {formatCurrency(row.marginDollar)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                          row.marginPct >= 35
                            ? "bg-emerald-100 text-emerald-700"
                            : row.marginPct >= 32
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700",
                        )}
                      >
                        {row.marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- 5. Supplier Rebate Tracker ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Supplier Rebate Tracker</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {REBATE_PROGRAMS.map((rebate) => (
            <div
              key={rebate.supplier}
              className="rounded-lg border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {rebate.supplier} — {rebate.program}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatCurrency(rebate.earned)} earned of {formatCurrency(rebate.target)} target
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    rebate.pct >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : rebate.pct >= 60
                        ? "bg-amber-100 text-amber-700"
                        : "bg-orange-100 text-orange-700",
                  )}
                >
                  {rebate.pct}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    rebate.pct >= 80
                      ? "bg-emerald-500"
                      : rebate.pct >= 60
                        ? "bg-amber-500"
                        : "bg-orange-500",
                  )}
                  style={{ width: `${rebate.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- 6. Revenue Trend ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Revenue Trend — 12 Months
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={REVENUE_TREND} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#d97706"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#d97706", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#f59e0b" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
