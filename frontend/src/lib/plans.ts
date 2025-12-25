export type PlanOption = {
  value: string;
  label: string;
  description: string;
  code: PlanCode;
};

export type PlanCode = "BASIC" | "PRO" | "ENTERPRISE";

export const PLAN_OPTIONS: PlanOption[] = [
  { value: "BASIC", label: "Silver", description: "Basico", code: "BASIC" },
  { value: "PRO", label: "Gold", description: "Avanzado", code: "PRO" },
  { value: "ENTERPRISE", label: "Diamante", description: "Full", code: "ENTERPRISE" }
];

export const PLAN_TIERS: Record<PlanCode, number> = {
  BASIC: 1,
  PRO: 2,
  ENTERPRISE: 3
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: "Silver",
  PRO: "Gold",
  ENTERPRISE: "Diamante",
  SILVER: "Silver",
  GOLD: "Gold",
  DIAMANTE: "Diamante",
  DIAMOND: "Diamante"
};

export function formatPlanLabel(plan?: string | null) {
  if (!plan) return "Sin plan";
  const normalized = plan.trim().toUpperCase();
  return PLAN_LABELS[normalized] ?? plan;
}

export function resolvePlanCode(plan?: string | null): PlanCode {
  if (!plan) return "BASIC";
  const normalized = plan.trim().toUpperCase();
  if (normalized in PLAN_LABELS) {
    if (normalized === "SILVER" || normalized === "BASIC") return "BASIC";
    if (normalized === "GOLD" || normalized === "PRO") return "PRO";
    return "ENTERPRISE";
  }
  return "BASIC";
}

export function resolvePlanTier(plan?: string | null) {
  return PLAN_TIERS[resolvePlanCode(plan)];
}
