import { describe, it, expect } from "vitest";
import {
  buildCommitLines,
  committableCount,
  dispositionLabel,
  formatPercent,
  type ReviewSelections,
} from "@/lib/intake";
import type { IntakeLine, IntakeRun } from "@/lib/api";

function line(overrides: Partial<IntakeLine>): IntakeLine {
  return {
    line_number: 1,
    raw_text: "",
    extracted_quantity: 1,
    resolved_product_id: null,
    resolved_sku: null,
    resolved_name: null,
    unit_price: null,
    confidence: 0,
    disposition: "unresolved",
    candidates: [],
    ...overrides,
  };
}

function run(lines: IntakeLine[]): IntakeRun {
  return {
    id: "run-1",
    source_channel: "web",
    raw_text: "",
    customer_id: "cust-1",
    customer_external_id: "CUST-1",
    status: "parsed",
    line_count: lines.length,
    touchless_count: lines.filter((l) => l.disposition === "touchless").length,
    review_count: lines.filter((l) => l.disposition === "needs_review").length,
    unresolved_count: lines.filter((l) => l.disposition === "unresolved").length,
    touchless_rate: 0,
    lines,
  };
}

describe("buildCommitLines", () => {
  it("auto-includes touchless lines with their resolved product and price", () => {
    const r = run([
      line({ line_number: 1, disposition: "touchless", resolved_product_id: "p1", extracted_quantity: 10, unit_price: 12.5 }),
    ]);
    expect(buildCommitLines(r, {})).toEqual([{ product_id: "p1", quantity: 10, unit_price: 12.5 }]);
  });

  it("excludes unresolved lines entirely", () => {
    const r = run([line({ line_number: 1, disposition: "unresolved" })]);
    expect(buildCommitLines(r, {})).toEqual([]);
  });

  it("excludes needs_review lines until a candidate is chosen", () => {
    const r = run([
      line({
        line_number: 1,
        disposition: "needs_review",
        extracted_quantity: 5,
        candidates: [
          { product_id: "p2", sku: "A", name: "A" },
          { product_id: "p3", sku: "B", name: "B" },
        ],
      }),
    ]);
    expect(buildCommitLines(r, {})).toEqual([]);

    const selections: ReviewSelections = { 1: "p3" };
    // Chosen candidate differs from resolved product, so no price is carried.
    expect(buildCommitLines(r, selections)).toEqual([{ product_id: "p3", quantity: 5 }]);
  });

  it("does not carry a price when the chosen candidate differs from the resolved product", () => {
    const r = run([
      line({
        line_number: 1,
        disposition: "needs_review",
        resolved_product_id: "p2",
        unit_price: 9.99,
        extracted_quantity: 2,
        candidates: [{ product_id: "p9", sku: "Z", name: "Z" }],
      }),
    ]);
    expect(buildCommitLines(r, { 1: "p9" })).toEqual([{ product_id: "p9", quantity: 2 }]);
  });

  it("combines touchless and human-confirmed review lines", () => {
    const r = run([
      line({ line_number: 1, disposition: "touchless", resolved_product_id: "p1", extracted_quantity: 1 }),
      line({ line_number: 2, disposition: "needs_review", extracted_quantity: 3, candidates: [{ product_id: "p2", sku: "B", name: "B" }] }),
      line({ line_number: 3, disposition: "unresolved" }),
    ]);
    expect(committableCount(r, {})).toBe(1); // only touchless before selection
    expect(committableCount(r, { 2: "p2" })).toBe(2); // review line now included
  });
});

describe("formatPercent", () => {
  it("rounds a rate to a whole-percent string", () => {
    expect(formatPercent(0.6667)).toBe("67%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("dispositionLabel", () => {
  it("maps dispositions to human labels", () => {
    expect(dispositionLabel("touchless")).toBe("Touchless");
    expect(dispositionLabel("needs_review")).toBe("Needs review");
    expect(dispositionLabel("unresolved")).toBe("Unresolved");
  });
});
