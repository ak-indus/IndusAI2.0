// Pure helpers for the Order Intake UI. Kept separate from the React page so
// the commit-payload logic — which decides exactly what becomes a draft order —
// is unit-testable without rendering.

import type { IntakeCommitLine, IntakeLine, IntakeRun } from "@/lib/api";

/** A human's choice for a needs_review line: a chosen product_id, or null to skip. */
export type ReviewSelections = Record<number, string | null>;

/**
 * Build the commit payload. Touchless lines are auto-included at their resolved
 * product. needs_review lines are included only if the human picked a candidate
 * (via `selections[line_number]`). Unresolved lines are never committed.
 */
export function buildCommitLines(run: IntakeRun, selections: ReviewSelections): IntakeCommitLine[] {
  const out: IntakeCommitLine[] = [];
  for (const line of run.lines) {
    if (line.disposition === "touchless" && line.resolved_product_id) {
      out.push(lineToCommit(line, line.resolved_product_id));
    } else if (line.disposition === "needs_review") {
      const chosen = selections[line.line_number];
      if (chosen) out.push(lineToCommit(line, chosen));
    }
  }
  return out;
}

function lineToCommit(line: IntakeLine, productId: string): IntakeCommitLine {
  const commit: IntakeCommitLine = { product_id: productId, quantity: line.extracted_quantity };
  // Only carry the resolved unit price when committing the originally resolved
  // product; a different candidate must be re-priced server-side.
  if (productId === line.resolved_product_id && line.unit_price != null) {
    commit.unit_price = line.unit_price;
  }
  return commit;
}

/** How many lines would be committed given the current review selections. */
export function committableCount(run: IntakeRun, selections: ReviewSelections): number {
  return buildCommitLines(run, selections).length;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function dispositionColor(disposition: IntakeLine["disposition"]): string {
  switch (disposition) {
    case "touchless":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "needs_review":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-rose-100 text-rose-700 border-rose-200";
  }
}

export function dispositionLabel(disposition: IntakeLine["disposition"]): string {
  switch (disposition) {
    case "touchless":
      return "Touchless";
    case "needs_review":
      return "Needs review";
    default:
      return "Unresolved";
  }
}
