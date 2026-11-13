export type ImmediateStatus = "awaiting_payment" | "queued" | "accepted" | "expired" | "cancelled";

export type ImmediateRequestRow = {
  id: number;
  status: ImmediateStatus;
  durationMinutes: number;
  amountCents: number;
  patientName: string | null;
  patientPhone: string;
  professionalName: string | null;
  professionalPhone: string | null;
  pixTxid: string | null;
  pixRefundId: string | null;
  roomUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  acceptedAt: string | null;
  refundedAt: string | null;
  refundFailedAt: string | null;
  expiresAt: string;
};
