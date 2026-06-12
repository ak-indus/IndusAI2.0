// ROI model for MRO distributor back-office automation.
// Used by the ROI Calculator page and embedded in pilot leads so sales
// follow-up starts from the prospect's own numbers.

export interface RoiInputs {
  /** Order lines processed per month across all channels */
  monthlyOrderLines: number;
  /** Average manual handling time per order line, in minutes */
  minutesPerLine: number;
  /** Fully-loaded hourly cost of CSR / inside-sales staff, USD */
  hourlyCost: number;
  /** Percentage of order lines with an entry error (0-100) */
  errorRatePercent: number;
  /** Average fully-loaded cost to remediate one error, USD */
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

// Conservative defaults validated against early demo conversations:
// agentic intake automates ~70% of line handling and prevents ~80% of
// keying errors. Both are tunable as pilot data comes in.
export const AUTOMATION_RATE = 0.7;
export const ERROR_REDUCTION_RATE = 0.8;

const WORK_HOURS_PER_YEAR = 2080;

export function calculateRoi(inputs: RoiInputs): RoiResult {
  const monthlyOrderLines = Math.max(0, inputs.monthlyOrderLines);
  const minutesPerLine = Math.max(0, inputs.minutesPerLine);
  const hourlyCost = Math.max(0, inputs.hourlyCost);
  const errorRate = Math.min(100, Math.max(0, inputs.errorRatePercent)) / 100;
  const costPerError = Math.max(0, inputs.costPerError);

  const annualLines = monthlyOrderLines * 12;
  const annualHoursBefore = (annualLines * minutesPerLine) / 60;
  const annualHoursSaved = annualHoursBefore * AUTOMATION_RATE;
  const annualLaborSavings = annualHoursSaved * hourlyCost;

  const annualErrors = annualLines * errorRate;
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
