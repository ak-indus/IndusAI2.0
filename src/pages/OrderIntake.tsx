import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Gauge } from "lucide-react";
import { toast } from "sonner";
import { api, type IntakeRun, type TouchlessSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  buildCommitLines,
  committableCount,
  dispositionColor,
  dispositionLabel,
  formatPercent,
  type ReviewSelections,
} from "@/lib/intake";

const SAMPLE_ORDER = `Hi team, please ship the following to our Houston plant:

10x BRG-6205-2RS
qty 5 of Deep Groove Ball Bearing 6206
2 ea centrifugal pump 2 inch
need 100 of part XYZ-0000-UNKNOWN

Thanks,
Procurement`;

interface SummaryChipProps {
  icon: typeof CheckCircle2;
  label: string;
  count: number;
  className: string;
}

function SummaryChip({ icon: Icon, label, count, className }: SummaryChipProps) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${className}`}>
      <Icon className="h-4 w-4" />
      <span>{count}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}

export default function OrderIntake() {
  const [rawText, setRawText] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [run, setRun] = useState<IntakeRun | null>(null);
  const [selections, setSelections] = useState<ReviewSelections>({});
  const [committedOrderId, setCommittedOrderId] = useState<string | null>(null);
  const [summary, setSummary] = useState<TouchlessSummary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await api.getTouchlessSummary());
    } catch {
      /* KPI band is best-effort; never block the workflow on it */
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const parse = async () => {
    if (!rawText.trim()) {
      toast.error("Paste an order first.");
      return;
    }
    setParsing(true);
    setRun(null);
    setSelections({});
    setCommittedOrderId(null);
    try {
      const result = await api.parseIntake(rawText, customerId.trim() || undefined);
      setRun(result);
      loadSummary();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to parse order");
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!run) return;
    const lines = buildCommitLines(run, selections);
    if (lines.length === 0) {
      toast.error("No lines selected to commit.");
      return;
    }
    setCommitting(true);
    try {
      const order = await api.commitIntake(run.id, lines);
      setCommittedOrderId(order.id);
      loadSummary();
      toast.success(`Draft order ${order.order_number} created (${lines.length} lines).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setCommitting(false);
    }
  };

  const willCommit = useMemo(
    () => (run ? committableCount(run, selections) : 0),
    [run, selections]
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <Inbox className="h-6 w-6 text-blue-600" />
          AI Order Intake
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste an order exactly as a customer sent it — email body, PDF text, or WhatsApp message.
          IndusAI resolves each line against your catalog, commits the confident ones touchlessly,
          and routes only the ambiguous lines to you.
        </p>
      </div>

      {/* Lifetime touchless KPI — the pilot instrument: what a pilot is sold and renewed on. */}
      {summary && summary.total_lines > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Gauge className="h-3.5 w-3.5" /> Touchless rate
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatPercent(summary.touchless_rate)}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Lines processed</div>
            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.total_lines}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Touchless lines</div>
            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.touchless_lines}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Orders created</div>
            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.committed_orders}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Inbound order</h2>
            <button
              onClick={() => setRawText(SAMPLE_ORDER)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the customer's order here…"
            rows={12}
            className="w-full resize-none rounded-lg border border-slate-200 p-3 font-mono text-sm focus:border-blue-400 focus:outline-none"
          />
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Customer external ID (optional — enables contract pricing)"
            className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={parse}
            disabled={parsing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {parsing ? "Parsing…" : "Parse order"}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!run && (
            <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
              Parsed lines and the touchless split will appear here.
            </div>
          )}

          {run && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Touchless rate
                  </span>
                  <span className="text-3xl font-bold text-emerald-600">
                    {formatPercent(run.touchless_rate)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SummaryChip icon={CheckCircle2} label="touchless" count={run.touchless_count}
                    className="border-emerald-200 bg-emerald-50 text-emerald-700" />
                  <SummaryChip icon={AlertTriangle} label="needs review" count={run.review_count}
                    className="border-amber-200 bg-amber-50 text-amber-700" />
                  <SummaryChip icon={XCircle} label="unresolved" count={run.unresolved_count}
                    className="border-rose-200 bg-rose-50 text-rose-700" />
                </div>
              </div>

              {committedOrderId ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  <p className="font-semibold text-slate-800">Draft order created</p>
                  <Link
                    to={`/orders/${committedOrderId}`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View order <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <button
                  onClick={commit}
                  disabled={committing || willCommit === 0 || !run.customer_id}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!run.customer_id ? "Provide a known customer ID to commit an order" : undefined}
                >
                  Create draft order ({willCommit} {willCommit === 1 ? "line" : "lines"})
                </button>
              )}
              {!run.customer_id && (
                <p className="text-xs text-amber-600">
                  Enter a known customer external ID and re-parse to enable order creation.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Line-by-line review */}
      {run && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Line</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Resolved / candidates</th>
                <th className="px-4 py-3 font-medium">Unit price</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {run.lines.map((line) => (
                <tr key={line.line_number} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-600">{line.raw_text}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{line.extracted_quantity}</td>
                  <td className="px-4 py-3">
                    {line.disposition === "touchless" && (
                      <span className="font-medium text-slate-800">
                        {line.resolved_sku} — {line.resolved_name}
                      </span>
                    )}
                    {line.disposition === "needs_review" && (
                      <select
                        value={selections[line.line_number] ?? ""}
                        onChange={(e) =>
                          setSelections((s) => ({ ...s, [line.line_number]: e.target.value || null }))
                        }
                        className="w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
                      >
                        <option value="">Select a match…</option>
                        {line.candidates.map((c) => (
                          <option key={c.product_id} value={c.product_id}>
                            {c.sku} — {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {line.disposition === "unresolved" && (
                      <span className="text-slate-400">No catalog match</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {line.unit_price != null ? formatCurrency(line.unit_price) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${dispositionColor(line.disposition)}`}>
                      {dispositionLabel(line.disposition)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
