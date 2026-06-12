import { useMemo, useState } from "react";
import { Calculator, Clock, DollarSign, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  AUTOMATION_RATE,
  DEFAULT_INPUTS,
  ERROR_REDUCTION_RATE,
  calculateRoi,
  monthlyOrderLines,
} from "@/lib/roi";

interface NumberFieldProps {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function NumberField({ label, hint, value, onChange, min = 0, max, step = 1 }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none"
      />
      <span className="mt-1 block text-xs text-slate-400">{hint}</span>
    </label>
  );
}

interface StatProps {
  icon: typeof Clock;
  label: string;
  value: string;
  accent?: boolean;
}

function Stat({ icon: Icon, label, value, accent }: StatProps) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-blue-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

export default function ROICalculator() {
  const [monthlyOrders, setMonthlyOrders] = useState(DEFAULT_INPUTS.monthlyOrders);
  const [avgLinesPerOrder, setAvgLinesPerOrder] = useState(DEFAULT_INPUTS.avgLinesPerOrder);
  const [minutesPerOrder, setMinutesPerOrder] = useState(DEFAULT_INPUTS.minutesPerOrder);
  const [hourlyCost, setHourlyCost] = useState(DEFAULT_INPUTS.hourlyCost);
  const [errorRatePercent, setErrorRatePercent] = useState(DEFAULT_INPUTS.errorRatePercent);
  const [costPerError, setCostPerError] = useState(DEFAULT_INPUTS.costPerError);

  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const inputs = useMemo(
    () => ({ monthlyOrders, avgLinesPerOrder, minutesPerOrder, hourlyCost, errorRatePercent, costPerError }),
    [monthlyOrders, avgLinesPerOrder, minutesPerOrder, hourlyCost, errorRatePercent, costPerError]
  );
  const roi = useMemo(() => calculateRoi(inputs), [inputs]);

  const requestPilot = async () => {
    if (!company.trim() || !email.trim()) {
      toast.error("Company and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitLead({
        company: company.trim(),
        email: email.trim(),
        monthly_order_lines: monthlyOrderLines(inputs),
        estimated_annual_savings: roi.annualTotalSavings,
        source: "roi_calculator",
      });
      setRequested(true);
      toast.success("Pilot request received — we'll reach out within one business day.");
    } catch {
      toast.error("Could not submit the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <Calculator className="h-6 w-6 text-blue-600" />
          ROI Calculator
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Estimate what agentic order intake saves your operation. Assumes {AUTOMATION_RATE * 100}% of
          manual order handling is automated at steady state and {ERROR_REDUCTION_RATE * 100}% of entry
          errors are prevented — benchmarked against published industry data, not best cases.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your operation today</h2>
          <NumberField
            label="Manually handled orders per month"
            hint="Orders arriving by email, PDF, phone, WhatsApp, or fax — not EDI or web cart"
            value={monthlyOrders}
            onChange={setMonthlyOrders}
            step={50}
          />
          <NumberField
            label="Average line items per order"
            hint="Typical industrial POs run 3–8 lines"
            value={avgLinesPerOrder}
            onChange={setAvgLinesPerOrder}
            step={1}
          />
          <NumberField
            label="Minutes per order (manual entry)"
            hint="Industry telemetry median: 11 min manual vs 3 min automated (Esker, 2025)"
            value={minutesPerOrder}
            onChange={setMinutesPerOrder}
            step={1}
          />
          <NumberField
            label="Fully-loaded hourly cost ($)"
            hint="CSR median ≈ $29/hr loaded (BLS 2024); use ~$42 if inside-sales reps key orders"
            value={hourlyCost}
            onChange={setHourlyCost}
          />
          <NumberField
            label="Orders with entry errors (%)"
            hint="Benchmark: ~9% of manually keyed orders contain an error"
            value={errorRatePercent}
            onChange={setErrorRatePercent}
            max={100}
            step={0.5}
          />
          <NumberField
            label="Cost per order error ($)"
            hint="Returns, freight, credit memos, time to fix — trade estimates run $25–$75"
            value={costPerError}
            onChange={setCostPerError}
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Clock} label="Hours saved / year" value={formatNumber(roi.annualHoursSaved)} />
            <Stat icon={Users} label="FTE capacity freed" value={roi.fteFreed.toFixed(1)} />
            <Stat icon={DollarSign} label="Labor savings / year" value={formatCurrency(roi.annualLaborSavings)} />
            <Stat icon={DollarSign} label="Error savings / year" value={formatCurrency(roi.annualErrorSavings)} />
          </div>
          <Stat icon={DollarSign} label="Total estimated savings / year" value={formatCurrency(roi.annualTotalSavings)} accent />

          <p className="text-xs leading-relaxed text-slate-400">
            Assumptions: {minutesPerOrder} min/order manual handling; {AUTOMATION_RATE * 100}% steady-state
            automation (Esker customer average is 67% touchless, top performers 90%+);
            {" "}{ERROR_REDUCTION_RATE * 100}% error prevention (manual error rates of 3–9% fall below 1%
            when automated). Sources and methodology: docs/MARKET_VALIDATION_RESEARCH.md.
          </p>

          {/* Pilot CTA */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            {requested ? (
              <div className="py-4 text-center">
                <p className="text-lg font-semibold text-slate-800">Request received 🎉</p>
                <p className="mt-1 text-sm text-slate-500">
                  We'll reach out to scope a pilot against your real order flow.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  See these numbers on your own orders
                </h2>
                <p className="mb-3 mt-1 text-xs text-slate-400">
                  Request a pilot — we'll run IndusAI against a sample of your actual order traffic.
                </p>
                <div className="space-y-2.5">
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="Work email"
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none"
                  />
                  <button
                    onClick={requestPilot}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Submitting…" : "Request a pilot"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
