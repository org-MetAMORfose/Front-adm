"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { formatDate } from "@/lib/matchingDomain";
import { displayBrazilianPhone } from "@/lib/phone";
import type { MatchingConnectionView } from "@/types/matching";

type Props = {
  connections: MatchingConnectionView[];
  professionalPhone: string;
};

type Feedback = {
  connectionId: number;
  tone: "success" | "error";
  message: string;
};

export function PatientConnectionsTable({ connections, professionalPhone }: Props) {
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function sendReplacementMessage(connection: MatchingConnectionView) {
    setSendingId(connection.id);
    setFeedback(null);

    try {
      const response = await fetch(
        withBasePath("/api/admin/messages/matching-followup"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            patient_phone: connection.patient_phone,
            professional_phone: professionalPhone
          })
        }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Não foi possível enviar a mensagem.");
      }

      setFeedback({
        connectionId: connection.id,
        tone: "success",
        message: "Mensagem enviada."
      });
    } catch (caught) {
      setFeedback({
        connectionId: connection.id,
        tone: "error",
        message: caught instanceof Error ? caught.message : "Erro inesperado."
      });
    } finally {
      setSendingId(null);
    }
  }

  if (connections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 bg-white px-6 py-12 text-center text-sm text-ink/55">
        Nenhum paciente conectado a este profissional.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-subtle">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-mist/80 text-xs uppercase tracking-wide text-ink/45">
            <tr><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Score final</th><th className="px-4 py-3">Algoritmo</th><th className="px-4 py-3">Ação</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {connections.map((connection) => {
              const rowFeedback = feedback?.connectionId === connection.id
                ? feedback
                : null;
              const sending = sendingId === connection.id;

              return (
                <tr key={connection.id}>
                  <td className="px-4 py-3"><div className="font-semibold">{connection.patient_name}</div><div className="text-xs text-ink/45">{displayBrazilianPhone(connection.patient_phone)}</div></td>
                  <td className="px-4 py-3 text-ink/65">{formatDate(connection.created_at, true)}</td>
                  <td className="px-4 py-3">{connection.cycle_type === "REPLACEMENT" ? "Reposição" : "Regular"}</td>
                  <td className="px-4 py-3 font-semibold">{connection.final_score.toFixed(2)}</td>
                  <td className="px-4 py-3 text-ink/60">{connection.algorithm_version}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void sendReplacementMessage(connection)} disabled={sendingId !== null} className="inline-flex items-center gap-2 rounded-lg border border-sage/25 px-3 py-2 text-xs font-semibold text-sage transition hover:bg-sage/5 disabled:cursor-not-allowed disabled:opacity-50">
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
                      {sending ? "Enviando..." : "Enviar mensagem de reposição"}
                    </button>
                    {rowFeedback ? <p role="status" className={`mt-1.5 text-xs ${rowFeedback.tone === "success" ? "text-emerald-700" : "text-coral"}`}>{rowFeedback.message}</p> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
