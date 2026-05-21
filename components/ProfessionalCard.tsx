"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import type { Professional } from "@/types";

type Props = {
  professional: Professional | null;
  isLoading: boolean;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink/45">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-ink/80">{value || "--"}</dd>
    </div>
  );
}

export function ProfessionalCard({ professional, isLoading }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  if (isLoading) {
    return (
      <section className="border-b border-black/10 bg-white p-4 text-sm text-ink/60">
        Carregando profissional...
      </section>
    );
  }

  if (!professional) {
    return null;
  }

  async function approve() {
    if (!professional) {
      return;
    }

    setIsApproving(true);
    setStatus(null);

    try {
      const response = await fetch(
        `/api/admin/professionals/${professional.id}/approve`,
        {
          method: "POST"
        }
      );
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao aprovar profissional.");
      }

      setStatus("Solicitacao de aprovacao enviada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <section className="border-b border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Profissional</h3>
          <p className="text-xs text-ink/55">
            Status atual: {professional.current_status ?? "--"}
          </p>
        </div>
        <button
          type="button"
          onClick={approve}
          disabled={isApproving}
          className="inline-flex items-center gap-2 rounded bg-coral px-3 py-2 text-sm font-semibold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {isApproving ? "Aprovando..." : "Aprovar profissional"}
        </button>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Area" value={professional.area} />
        <Field
          label="Registro"
          value={professional.professional_register}
        />
        <Field label="Tipo" value={professional.register_type} />
        <Field label="Email" value={professional.email} />
        <Field label="Abordagem" value={professional.approach} />
        <Field label="Background" value={professional.background} />
      </dl>

      {status ? <p className="mt-3 text-sm text-ink/70">{status}</p> : null}
    </section>
  );
}
