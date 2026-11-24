import type { ImmediateStatus } from "@/types/immediate";

export const IMMEDIATE_STATUSES: readonly ImmediateStatus[] = ["awaiting_payment", "queued", "accepted", "expired", "cancelled"];

const labels: Record<ImmediateStatus, string> = {
  awaiting_payment: "Aguardando Pix",
  queued: "Na fila",
  accepted: "Aceito",
  expired: "Expirado",
  cancelled: "Cancelado"
};

const styles: Record<ImmediateStatus | "refunded" | "refund_failed" | "refund_pending", string> = {
  awaiting_payment: "border-amber-200 bg-amber-50 text-amber-700",
  queued: "border-sky-200 bg-sky-50 text-sky-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-coral/25 bg-coral/10 text-coral",
  cancelled: "border-black/10 bg-mist text-ink/55",
  refunded: "border-sage/25 bg-sage/10 text-sage",
  refund_failed: "border-coral/40 bg-coral/15 text-coral",
  refund_pending: "border-amber-200 bg-amber-50 text-amber-700"
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

type RefundState = { refundedAt: string | null; refundFailedAt?: string | null; pixRefundId?: string | null };

/** An expired request is really about its refund: done, failed (someone must refund by hand) or still with the bank. */
function refundKey(status: ImmediateStatus, refund: RefundState): ImmediateStatus | "refunded" | "refund_failed" | "refund_pending" {
  if (status !== "expired") return status;
  if (refund.refundedAt) return "refunded";
  if (refund.refundFailedAt) return "refund_failed";
  if (refund.pixRefundId) return "refund_pending";
  return status;
}

const refundLabels = { refunded: "Estornado", refund_failed: "Estorno falhou", refund_pending: "Estorno pendente" } as const;

export function immediateStatusLabel(
  status: ImmediateStatus,
  refundedAt: string | null,
  refundFailedAt: string | null = null,
  pixRefundId: string | null = null
): string {
  const key = refundKey(status, { refundedAt, refundFailedAt, pixRefundId });
  return key in refundLabels ? refundLabels[key as keyof typeof refundLabels] : labels[key as ImmediateStatus];
}

export function immediateStatusStyle(
  status: ImmediateStatus,
  refundedAt: string | null,
  refundFailedAt: string | null = null,
  pixRefundId: string | null = null
): string {
  return styles[refundKey(status, { refundedAt, refundFailedAt, pixRefundId })];
}
