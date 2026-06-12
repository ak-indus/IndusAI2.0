import { describe, it, expect } from "vitest";
import { AUTOMATION_RATE, ERROR_REDUCTION_RATE, calculateRoi } from "@/lib/roi";

describe("calculateRoi", () => {
  // Reference scenario: mid-market distributor, 3,000 lines/month,
  // 4 min/line, $38/hr fully loaded, 3% error rate, $45/error.
  const inputs = {
    monthlyOrderLines: 3000,
    minutesPerLine: 4,
    hourlyCost: 38,
    errorRatePercent: 3,
    costPerError: 45,
  };

  it("computes annual processing hours before automation", () => {
    // 36,000 lines * 4 min / 60 = 2,400 hours
    expect(calculateRoi(inputs).annualHoursBefore).toBe(2400);
  });

  it("applies the automation rate to hours saved", () => {
    expect(calculateRoi(inputs).annualHoursSaved).toBe(2400 * AUTOMATION_RATE);
  });

  it("computes labor savings from saved hours", () => {
    expect(calculateRoi(inputs).annualLaborSavings).toBe(2400 * AUTOMATION_RATE * 38);
  });

  it("computes error savings from prevented errors", () => {
    // 36,000 lines * 3% = 1,080 errors; 80% prevented * $45
    expect(calculateRoi(inputs).annualErrorSavings).toBe(1080 * ERROR_REDUCTION_RATE * 45);
  });

  it("totals labor and error savings", () => {
    const r = calculateRoi(inputs);
    expect(r.annualTotalSavings).toBe(r.annualLaborSavings + r.annualErrorSavings);
  });

  it("expresses saved hours as FTE capacity", () => {
    const r = calculateRoi(inputs);
    expect(r.fteFreed).toBe(Math.round((r.annualHoursSaved / 2080) * 100) / 100);
  });

  it("returns zeros for an idle operation", () => {
    const r = calculateRoi({
      monthlyOrderLines: 0,
      minutesPerLine: 4,
      hourlyCost: 38,
      errorRatePercent: 3,
      costPerError: 45,
    });
    expect(r.annualTotalSavings).toBe(0);
    expect(r.fteFreed).toBe(0);
  });

  it("clamps negative and out-of-range inputs", () => {
    const r = calculateRoi({
      monthlyOrderLines: -100,
      minutesPerLine: -5,
      hourlyCost: -1,
      errorRatePercent: 250,
      costPerError: -10,
    });
    expect(r.annualHoursBefore).toBe(0);
    expect(r.annualLaborSavings).toBe(0);
    expect(r.annualErrorSavings).toBe(0);
  });
});
