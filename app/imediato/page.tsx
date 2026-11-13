"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { ImmediateTable } from "@/components/immediate/ImmediateTable";
import { withBasePath } from "@/lib/basePath";
import { formatCents } from "@/lib/immediateDomain";
import type { ImmediateRequestRow } from "@/types/immediate";

async function fetchImmediateRequests(): Promise<ImmediateRequestRow[]> {
  const response = await fetch(withBasePath("/api/admin/immediate?limit=200"), { cache: "no-store" });
  const body = (await response.json()) as { requests?: ImmediateRequestRow[]; error?: string };
  if (!response.ok || !body.requests) {
    throw new Error(body.error || "Não foi possível carregar os atendimentos imediatos.");
  }
  return body.requests;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-subtle">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function ImmediatePage() {
  const query = useQuery({
    queryKey: ["immediate"],
    queryFn: fetchImmediateRequests,
    refetchInterval: 10_000
  });

  const summary = useMemo(() => {
    const requests = query.data ?? [];
    const count = (status: ImmediateRequestRow["status"]) => requests.filter((request) => request.status === status).length;
    const paidCents = requests
      .filter((request) => request.status === "accepted")
      .reduce((total, request) => total + request.amountCents, 0);
    return {
      waiting: count("awaiting_payment") + count("queued"),
      accepted: count("accepted"),
      refunded: requests.filter((request) => request.refundedAt).length,
      paid: formatCents(paidCents)
    };
  }, [query.data]);

  return (
    <div className="flex h-full min-h-screen flex-col bg-mist">
      <AdminHeader
        title="Acolhimento imediato"
        description="Pedidos pagos por Pix, oferta aos psicólogos disponíveis e salas de vídeo."
        actions={
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium text-ink/70 hover:bg-mist"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Atualizar
          </button>
        }
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Summary label="Aguardando" value={String(summary.waiting)} />
          <Summary label="Aceitos" value={String(summary.accepted)} />
          <Summary label="Estornados" value={String(summary.refunded)} />
          <Summary label="Recebido (aceitos)" value={summary.paid} />
        </div>
        {query.isLoading ? (
          <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-ink/55">Carregando atendimentos...</div>
        ) : query.isError ? (
          <div className="rounded-2xl border border-coral/25 bg-coral/10 p-6 text-sm text-coral">
            {query.error instanceof Error ? query.error.message : "Não foi possível carregar os atendimentos imediatos."}
          </div>
        ) : (
          <ImmediateTable requests={query.data ?? []} />
        )}
        <p className="text-xs text-ink/45">
          Os psicólogos ligam e desligam a disponibilidade mandando DISPONÍVEL ou INDISPONÍVEL no WhatsApp, ou pela página do profissional.
        </p>
      </main>
    </div>
  );
}
