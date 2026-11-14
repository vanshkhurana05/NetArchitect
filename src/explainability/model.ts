/**
 * Engineering Decision Model.
 * Provides a structured schema for explainability metadata, algorithmic rule IDs,
 * rationales, assumptions, and warnings across all engines.
 */
import type { ExplainRecord, ExplainModule } from "../contracts/explain.js";

export type DecisionModule = ExplainModule | "configuration" | "architecture";

export interface EngineeringDecision {
  decisionId: string;
  ruleId: string;
  module: DecisionModule;
  selected: string;
  inputs: Record<string, unknown>;
  result?: Record<string, unknown> | string;
  rationale: string[];
  warnings: string[];
  assumptions: string[];
  references: string[];
}

/**
 * Converts a legacy ExplainRecord from any engine into the enriched EngineeringDecision model.
 */
export function fromExplainRecord(
  rec: ExplainRecord,
  index?: number,
): EngineeringDecision {
  const decisionId = rec.id || `DEC-${String(index ?? 1).padStart(3, "0")}`;
  const rationaleLines = Array.isArray(rec.rationale)
    ? rec.rationale
    : [rec.rationale];

  return {
    decisionId,
    ruleId: rec.rule,
    module: rec.module,
    selected: rec.decision,
    inputs: { ...rec.inputs },
    rationale: rationaleLines,
    warnings: [],
    assumptions: [],
    references: [...rec.references],
  };
}

/**
 * Converts an EngineeringDecision back into an ExplainRecord for contract compatibility.
 */
export function toExplainRecord(dec: EngineeringDecision): ExplainRecord {
  return {
    id: dec.decisionId,
    module: (dec.module === "configuration" || dec.module === "architecture"
      ? "verification"
      : dec.module) as ExplainModule,
    rule: dec.ruleId,
    decision: dec.selected,
    rationale: dec.rationale.join(" "),
    inputs: dec.inputs,
    references: dec.references,
  };
}
