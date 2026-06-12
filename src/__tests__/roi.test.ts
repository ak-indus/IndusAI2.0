import { describe, it, expect } from "vitest";
import {
  AUTOMATION_RATE,
  DEFAULT_INPUTS,
  ERROR_REDUCTION_RATE,
  calculateRoi,
  monthlyOrderLines,
} from "@/lib/roi";

describe("calculateRoi", () => {
  // Reference scenario: mid-market distributor, 1,500 manual orders/month,
  // 11 min/order (Esker telemetry median), $29/hr loaded CSR (BLS 2024),
  // 9% per-order error rate, $45/error.
  const inputs = {
    monthlyOrders: 1500,
    avgLinesPerOrder: 5,
    minutesPerOrder: 11,
    hourlyCost: 29,
    errorRatePercent: 9,
    costPerError: 45,
  };

  it("matches the benchmarked defaults", () => {
    expect(DEFAULT_INPUTS).toEqual(inputs);
  });

  it("computes annual processing hours before automation", () => {
    // 18,000 orders * 11 min / 60 = 3,300 hours
    expect(calculateRoi(inputs).annualHoursBefore).toBe(3300);
  });

  it("applies the automation rate to hours saved", () => {
    expect(calculateRoi(inputs).annualHoursSaved).toBe(3300 * AUTOMATION_RATE);
  });

  it("computes labor savings from saved hours", () => {
    expect(calculateRoi(inputs).annualLaborSavings).toBe(3300 * AUTOMATION_RATE * 29);
  });

  it("computes error savings from prevented errors", () => {
    // 18,000 orders * 9% = 1,620 errors; 80% prevented * $45
    expect(calculateRoi(inputs).annualErrorSavings).toBe(1620 * ERROR_REDUCTION_RATE * 45);
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
    const r = calculateRoi({ ...inputs, monthlyOrders: 0 });
    expect(r.annualTotalSavings).toBe(0);
    expect(r.fteFreed).toBe(0);
  });

  it("clamps negative and out-of-range inputs", () => {
    const r = calculateRoi({
      monthlyOrders: -100,
      avgLinesPerOrder: -2,
      minutesPerOrder: -5,
      hourlyCost: -1,
      errorRatePercent: 250,
      costPerError: -10,
    });
    expect(r.annualHoursBefore).toBe(0);
    expect(r.annualLaborSavings).toBe(0);
    expect(r.annualErrorSavings).toBe(0);
  });
});

describe("monthlyOrderLines", () => {
  it("derives lines from orders for pilot-lead context", () => {
    expect(monthlyOrderLines({ ...DEFAULT_INPUTS, monthlyOrders: 1500, avgLinesPerOrder: 5 })).toBe(7500);
  });

  it("clamps negatives to zero", () => {
    expect(monthlyOrderLines({ ...DEFAULT_INPUTS, monthlyOrders: -10 })).toBe(0);
  });
});
