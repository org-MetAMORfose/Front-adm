import { ExternalLink } from "lucide-react";

import { formatCents, immediateStatusLabel, immediateStatusStyle } from "@/lib/immediateDomain";
import { formatDate } from "@/lib/matchingDomain";
import { displayBrazilianPhone } from "@/lib/phone";
import type { ImmediateRequestRow } from "@/types/immediate";

function Person({ name, phone }: { name: string | null; phone: string | null }) {
  if (!phone) return <span className="text-ink/40">--</span>;
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-ink">{name ?? "Sem nome"}</div>
      <div className="text-xs text-ink/55">{displayBrazilianPhone(phone)}</div>
    </div>
  );
}

export function ImmediateStatusBadge({ request }: { request: ImmediateRequestRow }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${immediateStatusStyle(
        request.status,
        request.refundedAt,
        request.refundFailedAt,
        request.pixRefundId
      )}`}
    >
      {immediateStatusLabel(request.status, request.refundedAt, request.refundFailedAt, request.pixRefundId)}
    </span>
  );
}

export function ImmediateTable({ requests }: { requests: ImmediateRequestRow[] }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-ink/55">
        Nenhum atendimento imediato ainda. Os pedidos aparecem aqui assim que um paciente escolher &quot;Atendimento imediato&quot; no chatbot.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-subtle">
      <table className="min-w-full text-sm">
        <thead className="bg-mist text-left text-xs font-semibold uppercase tracking-wide text-ink/55">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">Sessão</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Pago</th>
            <th className="px-4 py-3">Profissional</th>
            <th className="px-4 py-3">Sala</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {requests.map((request) => (
            <tr key={request.id} className="align-top">
              <td className="px-4 py-3 text-ink/55">{request.id}</td>
              <td className="px-4 py-3">
                <Person name={request.patientName} phone={request.patientPhone} />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-ink">{request.durationMinutes} min</div>
                <div className="text-xs text-ink/55">{formatCents(request.amountCents)}</div>
              </td>
              <td className="px-4 py-3">
                <ImmediateStatusBadge request={request} />
                {request.refundedAt ? <div className="mt-1 text-xs text-ink/55">Estorno {formatDate(request.refundedAt, true)}</div> : null}
                {request.refundFailedAt ? (
                  <div className="mt-1 text-xs font-medium text-coral">Devolver manualmente ({formatDate(request.refundFailedAt, true)})</div>
                ) : null}
              </td>
              <td className="px-4 py-3 text-ink/70">{formatDate(request.createdAt, true)}</td>
              <td className="px-4 py-3 text-ink/70">{formatDate(request.paidAt, true)}</td>
              <td className="px-4 py-3">
                <Person name={request.professionalName} phone={request.professionalPhone} />
                {request.acceptedAt ? <div className="mt-1 text-xs text-ink/55">Aceito {formatDate(request.acceptedAt, true)}</div> : null}
              </td>
              <td className="px-4 py-3">
                {request.roomUrl ? (
                  <a
                    href={request.roomUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sage hover:underline"
                  >
                    Abrir sala <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : (
                  <span className="text-ink/40">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
