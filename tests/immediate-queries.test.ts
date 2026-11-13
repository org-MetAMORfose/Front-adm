import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    immediate_request: { findMany: mocks.findMany }
  }
}));

import { formatCents, immediateStatusLabel } from "@/lib/immediateDomain";
import { getImmediateRequests, mapImmediateRequest } from "@/lib/immediateQueries";

const row = {
  id: 42,
  status: "accepted",
  duration_minutes: 30,
  amount_cents: 6000,
  pix_txid: "a".repeat(32),
  pix_refund_id: null,
  room_url: "https://exemplo.daily.co/sala",
  paid_at: new Date("2026-11-12T20:00:00.000Z"),
  accepted_at: new Date("2026-11-12T20:01:00.000Z"),
  refunded_at: null,
  expires_at: new Date("2026-11-12T20:05:00.000Z"),
  created_at: new Date("2026-11-12T19:59:00.000Z"),
  patient: { name: " Maria Silva ", phone_number: "5511999999999" },
  professional: { name: "Dra. Ana", phone_number: "5511977776666" }
};

describe("immediate queries", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
  });

  it("maps a row to the panel shape", () => {
    expect(mapImmediateRequest(row)).toEqual({
      id: 42,
      status: "accepted",
      durationMinutes: 30,
      amountCents: 6000,
      patientName: "Maria Silva",
      patientPhone: "5511999999999",
      professionalName: "Dra. Ana",
      professionalPhone: "5511977776666",
      pixTxid: "a".repeat(32),
      pixRefundId: null,
      roomUrl: "https://exemplo.daily.co/sala",
      createdAt: "2026-11-12T19:59:00.000Z",
      paidAt: "2026-11-12T20:00:00.000Z",
      acceptedAt: "2026-11-12T20:01:00.000Z",
      refundedAt: null,
      expiresAt: "2026-11-12T20:05:00.000Z"
    });
  });

  it("handles a missing professional and an empty name", () => {
    const mapped = mapImmediateRequest({ ...row, professional: null, patient: { name: null, phone_number: "5511999999999" } });
    expect(mapped.patientName).toBeNull();
    expect(mapped.professionalName).toBeNull();
    expect(mapped.professionalPhone).toBeNull();
  });

  it("queries newest first with the limit and the person relations", async () => {
    mocks.findMany.mockResolvedValue([row]);
    const rows = await getImmediateRequests(5);
    expect(mocks.findMany).toHaveBeenCalledWith({
      include: { patient: true, professional: true },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: 5
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(42);
  });
});

describe("immediate domain", () => {
  it("formats cents in reais", () => {
    expect(formatCents(6000)).toBe("R$ 60,00");
    expect(formatCents(9050)).toBe("R$ 90,50");
    expect(formatCents(123456)).toBe("R$ 1.234,56");
  });

  it("labels every status, with the refund overriding an expired request", () => {
    expect(immediateStatusLabel("awaiting_payment", null)).toBe("Aguardando Pix");
    expect(immediateStatusLabel("queued", null)).toBe("Na fila");
    expect(immediateStatusLabel("accepted", null)).toBe("Aceito");
    expect(immediateStatusLabel("expired", null)).toBe("Expirado");
    expect(immediateStatusLabel("expired", "2026-11-12T20:06:00.000Z")).toBe("Estornado");
    expect(immediateStatusLabel("cancelled", null)).toBe("Cancelado");
  });
});
