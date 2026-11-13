import "server-only";

import { prisma } from "@/lib/db";
import { isImmediateStatus } from "@/lib/immediateDomain";
import type { ImmediateRequestRow } from "@/types/immediate";

type PersonRecord = { name: string | null; phone_number: string };

export type ImmediateRequestRecord = {
  id: number;
  status: string;
  duration_minutes: number;
  amount_cents: number;
  pix_txid: string | null;
  pix_refund_id: string | null;
  room_url: string | null;
  paid_at: Date | null;
  accepted_at: Date | null;
  refunded_at: Date | null;
  refund_failed_at: Date | null;
  expires_at: Date;
  created_at: Date;
  patient: PersonRecord;
  professional: PersonRecord | null;
};

function trimmedName(name: string | null | undefined): string | null {
  const value = name?.trim();
  return value ? value : null;
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function mapImmediateRequest(row: ImmediateRequestRecord): ImmediateRequestRow {
  if (!isImmediateStatus(row.status)) {
    throw new Error(`Status de atendimento imediato desconhecido: ${row.status}`);
  }
  return {
    id: row.id,
    status: row.status,
    durationMinutes: row.duration_minutes,
    amountCents: row.amount_cents,
    patientName: trimmedName(row.patient.name),
    patientPhone: row.patient.phone_number,
    professionalName: row.professional ? trimmedName(row.professional.name) : null,
    professionalPhone: row.professional ? row.professional.phone_number : null,
    pixTxid: row.pix_txid,
    pixRefundId: row.pix_refund_id,
    roomUrl: row.room_url,
    createdAt: row.created_at.toISOString(),
    paidAt: iso(row.paid_at),
    acceptedAt: iso(row.accepted_at),
    refundedAt: iso(row.refunded_at),
    refundFailedAt: iso(row.refund_failed_at),
    expiresAt: row.expires_at.toISOString()
  };
}

export async function getImmediateRequests(limit = 100): Promise<ImmediateRequestRow[]> {
  const rows = await prisma.immediate_request.findMany({
    include: { patient: true, professional: true },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit
  });
  return rows.map(mapImmediateRequest);
}
