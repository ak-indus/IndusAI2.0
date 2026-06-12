// ROI model for MRO distributor back-office automation.
// Used by the ROI Calculator page and embedded in pilot leads so sales
// follow-up starts from the prospect's own numbers.
//
// All defaults and rates are benchmarked in docs/MARKET_VALIDATION_RESEARCH.md.
// The model is PER ORDER, not per order line: published benchmarks measure
// whole orders (Esker customer telemetry: median 11 min manual vs 3 min
// automated; ~9% of manually entered orders contain an error).

export interface RoiInputs {
  /** Manually handled orders per month (email, PDF, phone, WhatsApp, fax) */
  monthlyOrders: number;
  /** Average line items per order — used for lead context, not the math */
  avgLinesPerOrder: number;
  /** Average manual handling time per order, in minutes */
  minutesPerOrder: number;
  /** Fully-loaded hourly cost of order-entry staff, USD */
  hourlyCost: number;
  /** Percentage of manually entered orders containing an error (0-100) */
  errorRatePercent: number;
  /** Average fully-loaded cost to remediate one order error, USD */
  costPerError: number;
}

export interface RoiResult {
  /** Hours of manual processing per year, before automation */
  annualHoursBefore: number;
  /** Labor hours saved per year */
  annualHoursSaved: number;
  /** Labor savings per year, USD */
  annualLaborSavings: number;
  /** Error-remediation savings per year, USD */
  annualErrorSavings: number;
  /** Total savings per year, USD */
  annualTotalSavings: number;
  /** Full-time-equivalent headcount freed up */
  fteFreed: number;
}

// Steady-state automation share of manual order handling. Esker's customer
// average touchless rate is 67% (top performers 90%+); Conexiom benchmarks
// 80%+ at maturity. 70% is the realistic mid-range — expect a ramp toward it,
// not day-one delivery.
export const AUTOMATION_RATE = 0.7;
// Manual order error rates of 3-9% fall below 1% when automated, implying
// 67-89% prevention; 80% sits inside that published band.
export const ERROR_REDUCTION_RATE = 0.8;

// Benchmarked defaults (see docs/MARKET_VALIDATION_RESEARCH.md §2):
// 11 min/order — Esker telemetry median for manual entry.
// 9% error rate — Esker per-order manual benchmark.
// $29/hr — BLS May 2024 CSR median $20.59 × ~1.4 benefits load; use ~$42
//          if inside-sales reps (BLS median $32.10/hr) handle order entry.
// $45/error — inside the $25-$75 trade-estimate range (no primary study exists).
export const DEFAULT_INPUTS: RoiInputs = {
  monthlyOrders: 1500,
  avgLinesPerOrder: 5,
  minutesPerOrder: 11,
  hourlyCost: 29,
  errorRatePercent: 9,
  costPerError: 45,
};

const WORK_HOURS_PER_YEAR = 2080;

export function calculateRoi(inputs: RoiInputs): RoiResult {
  const monthlyOrders = Math.max(0, inputs.monthlyOrders);
  const minutesPerOrder = Math.max(0, inputs.minutesPerOrder);
  const hourlyCost = Math.max(0, inputs.hourlyCost);
  const errorRate = Math.min(100, Math.max(0, inputs.errorRatePercent)) / 100;
  const costPerError = Math.max(0, inputs.costPerError);

  const annualOrders = monthlyOrders * 12;
  const annualHoursBefore = (annualOrders * minutesPerOrder) / 60;
  const annualHoursSaved = annualHoursBefore * AUTOMATION_RATE;
  const annualLaborSavings = annualHoursSaved * hourlyCost;

  const annualErrors = annualOrders * errorRate;
  const annualErrorSavings = annualErrors * ERROR_REDUCTION_RATE * costPerError;

  const annualTotalSavings = annualLaborSavings + annualErrorSavings;
  const fteFreed = annualHoursSaved / WORK_HOURS_PER_YEAR;

  return {
    annualHoursBefore: round2(annualHoursBefore),
    annualHoursSaved: round2(annualHoursSaved),
    annualLaborSavings: round2(annualLaborSavings),
    annualErrorSavings: round2(annualErrorSavings),
    annualTotalSavings: round2(annualTotalSavings),
    fteFreed: round2(fteFreed),
  };
}

/** Monthly order lines implied by the inputs — stored on pilot leads. */
export function monthlyOrderLines(inputs: RoiInputs): number {
  return Math.round(Math.max(0, inputs.monthlyOrders) * Math.max(0, inputs.avgLinesPerOrder));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
