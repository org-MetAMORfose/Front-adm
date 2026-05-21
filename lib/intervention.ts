const HUMAN_INTERVENTION_STATES = new Set([
  "human_intervention",
  "needs_human",
  "needs_human_intervention",
  "manual_review",
  "manual_intervention",
  "waiting_human",
  "awaiting_human",
  "admin_required",
  "operator_required"
]);

export function needsHumanIntervention(chatState: string): boolean {
  const normalized = chatState.trim().toLowerCase().replace(/[-\s]+/g, "_");

  return (
    HUMAN_INTERVENTION_STATES.has(normalized) ||
    normalized.includes("human") ||
    normalized.includes("manual") ||
    normalized.includes("intervention")
  );
}
