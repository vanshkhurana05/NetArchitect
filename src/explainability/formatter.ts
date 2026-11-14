/**
 * Rationale Formatter.
 * Formats structured engineering decisions into clean Markdown summaries and detail cards.
 * Enforces deterministic templates with zero LLM hallucinations.
 */
import type { EngineeringDecision } from "./model.js";

/**
 * Formats a collection of decisions into a structured Markdown summary table.
 */
export function formatDecisionSummaryTable(decisions: EngineeringDecision[]): string {
  if (decisions.length === 0) {
    return "_No architectural decisions recorded._\n";
  }

  const lines: string[] = [];
  lines.push("| Decision ID | Module | Rule ID | Selected Recommendation | Technical Rationale | References |");
  lines.push("|---|---|---|---|---|---|");

  for (const d of decisions) {
    const summaryRationale = d.rationale[0] ?? "";
    const cleanRationale = summaryRationale.replace(/\|/g, "\\|").trim();
    const refs = d.references.length > 0 ? d.references.join(", ") : "—";

    lines.push(
      `| \`${d.decisionId}\` | ${d.module.toUpperCase()} | \`${d.ruleId}\` | **${d.selected}** | ${cleanRationale} | ${refs} |`,
    );
  }

  return lines.join("\n") + "\n";
}

/**
 * Formats detailed engineering decision cards with inputs, assumptions, and warnings.
 */
export function formatDetailedDecisionCards(decisions: EngineeringDecision[]): string {
  if (decisions.length === 0) {
    return "_No decisions recorded._\n";
  }

  const lines: string[] = [];

  // Group by module
  const byModule = new Map<string, EngineeringDecision[]>();
  for (const d of decisions) {
    const list = byModule.get(d.module) ?? [];
    list.push(d);
    byModule.set(d.module, list);
  }

  for (const [moduleName, moduleDecisions] of byModule.entries()) {
    lines.push(`#### Domain: ${moduleName.toUpperCase()}\n`);

    for (const d of moduleDecisions) {
      lines.push(`##### [${d.ruleId}] ${d.selected}`);
      lines.push(`- **Decision ID:** \`${d.decisionId}\``);
      lines.push(`- **Governing Rule:** \`${d.ruleId}\``);
      lines.push(`- **Technical Rationale:**`);
      for (const r of d.rationale) {
        lines.push(`  - ${r}`);
      }

      if (Object.keys(d.inputs).length > 0) {
        lines.push(`- **Governing Inputs:** \`${JSON.stringify(d.inputs)}\``);
      }

      if (d.assumptions.length > 0) {
        lines.push(`- **Documented Assumptions:**`);
        for (const a of d.assumptions) {
          lines.push(`  - ${a}`);
        }
      }

      if (d.warnings.length > 0) {
        lines.push(`- **Engineering Warnings:**`);
        for (const w of d.warnings) {
          lines.push(`  - ⚠️ ${w}`);
        }
      }

      if (d.references.length > 0) {
        lines.push(`- **Normative References:** ${d.references.join(", ")}`);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}
