/**
 * Engineering Decision Collector.
 * Aggregates decisions from physical media, topology, VLAN, VLSM,
 * routing, and configuration generator engines into an immutable audit trail.
 */
import type { ExplainRecord, ExplainLog } from "../contracts/explain.js";
import type { EngineeringDecision, DecisionModule } from "./model.js";
import { fromExplainRecord, toExplainRecord } from "./model.js";

export class DecisionCollector {
  private readonly _decisions: EngineeringDecision[] = [];

  /**
   * Records a structured engineering decision directly.
   */
  public recordDecision(decision: EngineeringDecision): void {
    this._decisions.push({
      ...decision,
      inputs: { ...decision.inputs },
      rationale: [...decision.rationale],
      warnings: [...decision.warnings],
      assumptions: [...decision.assumptions],
      references: [...decision.references],
    });
  }

  /**
   * Ingests an array of ExplainRecord objects emitted by any engine.
   */
  public ingestExplainRecords(records: ExplainRecord[]): void {
    for (const rec of records) {
      this.recordDecision(fromExplainRecord(rec, this._decisions.length + 1));
    }
  }

  /**
   * Ingests an entire ExplainLog envelope.
   */
  public ingestExplainLog(log: ExplainLog): void {
    if (log && Array.isArray(log.records)) {
      this.ingestExplainRecords(log.records);
    }
  }

  /**
   * Returns a copy of all recorded decisions.
   */
  public getDecisions(): EngineeringDecision[] {
    return this._decisions.map((d) => ({
      ...d,
      inputs: { ...d.inputs },
      rationale: [...d.rationale],
      warnings: [...d.warnings],
      assumptions: [...d.assumptions],
      references: [...d.references],
    }));
  }

  /**
   * Filters decisions by functional engine module.
   */
  public getDecisionsByModule(module: DecisionModule): EngineeringDecision[] {
    return this.getDecisions().filter((d) => d.module === module);
  }

  /**
   * Retrieves all non-fatal engineering warnings across all recorded decisions.
   */
  public getWarnings(): Array<{ decisionId: string; warning: string }> {
    const warnings: Array<{ decisionId: string; warning: string }> = [];
    for (const d of this._decisions) {
      for (const w of d.warnings) {
        warnings.push({ decisionId: d.decisionId, warning: w });
      }
    }
    return warnings;
  }

  /**
   * Exports all decisions to a formatted JSON string.
   */
  public exportJson(): string {
    return JSON.stringify(this._decisions, null, 2);
  }

  /**
   * Converts the collected decisions back into the canonical ExplainLog format.
   */
  public toExplainLog(): ExplainLog {
    return {
      records: this._decisions.map(toExplainRecord),
    };
  }
}

export function createDecisionCollector(): DecisionCollector {
  return new DecisionCollector();
}
