/**
 * Explainability collector implementation — thread-safe in-memory log collector.
 * Implements src/contracts/explain.ts.
 * OWNER: Lead Architect / Explainability Engine.
 */
import type { ExplainCollector, ExplainLog, ExplainRecord } from "../contracts/explain.js";

export class InMemoryExplainCollector implements ExplainCollector {
  private readonly _records: ExplainRecord[] = [];

  public get log(): ExplainLog {
    return { records: [...this._records] };
  }

  public push(record: ExplainRecord): void {
    this._records.push({ ...record });
  }

  public merge(other: ExplainLog): void {
    if (other && Array.isArray(other.records)) {
      for (const rec of other.records) {
        this.push(rec);
      }
    }
  }

  public renderMarkdown(): string {
    if (this._records.length === 0) {
      return "## Architectural Decisions & Rationales\n\n_No decisions recorded._\n";
    }

    const lines: string[] = [];
    lines.push("## Architectural Decisions & Rationales\n");
    lines.push("This log records algorithmic rationales, governing boundaries, and normative RFC/IEEE references.\n");

    // Group by module for readable report generation
    const moduleMap = new Map<string, ExplainRecord[]>();
    for (const record of this._records) {
      const list = moduleMap.get(record.module) ?? [];
      list.push(record);
      moduleMap.set(record.module, list);
    }

    for (const [moduleName, records] of moduleMap.entries()) {
      lines.push(`### Module: ${moduleName.toUpperCase()}\n`);
      for (const r of records) {
        lines.push(`#### [${r.rule}] ${r.decision}`);
        lines.push(`- **Record ID:** \`${r.id}\``);
        lines.push(`- **Rationale:** ${r.rationale}`);
        if (r.references.length > 0) {
          lines.push(`- **Normative References:** ${r.references.join(", ")}`);
        }
        if (r.inputs && Object.keys(r.inputs).length > 0) {
          lines.push(`- **Governing Inputs:** \`${JSON.stringify(r.inputs)}\``);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}

export function createExplainCollector(): ExplainCollector {
  return new InMemoryExplainCollector();
}
