import type { ImmediateStatus } from "@/types/immediate";

export const IMMEDIATE_STATUSES: readonly ImmediateStatus[] = ["awaiting_payment", "queued", "accepted", "expired", "cancelled"];

const labels: Record<ImmediateStatus, string> = {
  awaiting_payment: "Aguardando Pix",
  queued: "Na fila",
  accepted: "Aceito",
  expired: "Expirado",
  cancelled: "Cancelado"
};

const styles: Record<ImmediateStatus | "refunded", string> = {
  awaiting_payment: "border-amber-200 bg-amber-50 text-amber-700",
  queued: "border-sky-200 bg-sky-50 text-sky-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-coral/25 bg-coral/10 text-coral",
  cancelled: "border-black/10 bg-mist text-ink/55",
  refunded: "border-sage/25 bg-sage/10 text-sage"
};

export function isImmediateStatus(value: string): value is ImmediateStatus {
  return (IMMEDIATE_STATUSES as readonly string[]).includes(value);
}

export function formatCents(cents: number): string {
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const thousands = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${thousands},${centavos.toString().padStart(2, "0")}`;
}

export function immediateStatusLabel(status: ImmediateStatus, refundedAt: string | null): string {
  if (status === "expired" && refundedAt) return "Estornado";
  return labels[status];
}

export function immediateStatusStyle(status: ImmediateStatus, refundedAt: string | null): string {
  if (status === "expired" && refundedAt) return styles.refunded;
  return styles[status];
}
