"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";

import { SearchCombobox } from "@/components/admin/SearchCombobox";
import { withBasePath } from "@/lib/basePath";
import { displayBrazilianPhone } from "@/lib/phone";
import type { MatchingCycleType, ProfessionalOption } from "@/types/matching";

type Props = {
  professionals: ProfessionalOption[];
  initialProfessionalId?: number;
  onCancel: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function calculateDeadline(startsAt: string, durationDays: string) {
  const start = new Date(startsAt);
  const days = Number(durationDays);
  if (Number.isNaN(start.getTime()) || !Number.isInteger(days) || days <= 0) {
    return null;
  }

  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

function previewDate(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

export function CycleForm({
  professionals,
  initialProfessionalId,
  onCancel,
  onSuccess
}: Props) {
  const initialProfessional = useMemo(
    () => professionals.find((item) => item.id === initialProfessionalId) ?? null,
    [initialProfessionalId, professionals]
  );
  const now = useMemo(() => new Date(), []);
  const [professional, setProfessional] = useState<ProfessionalOption | null>(
    initialProfessional
  );
  const [type, setType] = useState<MatchingCycleType>("REGULAR");
  const [promisedPatients, setPromisedPatients] = useState("4");
  const [startsAt, setStartsAt] = useState(localDateTime(now));
  const [durationDays, setDurationDays] = useState("30");
  const deadlineAt = useMemo(
    () => calculateDeadline(startsAt, durationDays),
    [durationDays, startsAt]
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!professional) {
      setError("Selecione um profissional da lista.");
      return;
    }

    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime()) || !deadlineAt) {
      setError("Informe um início e uma duração válida em dias.");
      return;
    }
    const deadline = deadlineAt;

    setSubmitting(true);
    try {
      const response = await fetch(withBasePath("/api/admin/matching-cycles"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professional_id: professional.id,
          type,
          promised_patients: Number(promisedPatients),
          starts_at: start.toISOString(),
          deadline_at: deadline.toISOString()
        })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao criar ciclo.");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      <SearchCombobox
        id="cycle-professional"
        label="Profissional"
        placeholder="Digite o nome do profissional"
        options={professionals}
        selected={professional}
        getKey={(option) => option.id}
        getLabel={(option) => option.name}
        getDescription={(option) =>
          `${option.area} · ${displayBrazilianPhone(option.phone_number)} · ${option.professional_register}`
        }
        onSelect={setProfessional}
        onClear={() => setProfessional(null)}
        emptyMessage="Nenhum profissional cadastrado corresponde à busca."
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cycle-type" className={labelClass}>Tipo *</label>
          <select id="cycle-type" value={type} onChange={(event) => setType(event.target.value as MatchingCycleType)} className={inputClass}>
            <option value="REGULAR">Regular</option>
            <option value="REPLACEMENT">Reposição</option>
          </select>
        </div>
        <div>
          <label htmlFor="cycle-quantity" className={labelClass}>Quantidade de pacientes *</label>
          <input
            id="cycle-quantity"
            type="number"
            min={1}
            step={1}
            value={promisedPatients}
            onChange={(event) => setPromisedPatients(event.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="cycle-start" className={labelClass}>Início *</label>
          <input id="cycle-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="cycle-duration" className={labelClass}>Duração em dias *</label>
          <input
            id="cycle-duration"
            type="number"
            min={1}
            step={1}
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-black/10 bg-mist p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Prazo inicial</p>
          <p className="mt-1 font-semibold text-ink">{previewDate(new Date(startsAt))}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Prazo final</p>
          <p className="mt-1 font-semibold text-sage">{previewDate(deadlineAt)}</p>
        </div>

      </div>
      <div className="rounded-xl border border-sage/20 bg-sage/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sage">Revise antes de salvar</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-ink/45">Profissional</dt><dd className="font-medium text-ink">{professional?.name ?? "Não selecionado"}</dd></div>
          <div><dt className="text-ink/45">Compromisso</dt><dd className="font-medium text-ink">{promisedPatients || "0"} pacientes · {type === "REPLACEMENT" ? "Reposição" : "Regular"}</dd></div>
          <div><dt className="text-ink/45">Duração</dt><dd className="font-medium text-ink">{durationDays || "0"} dias</dd></div>
          <div><dt className="text-ink/45">Prazo final</dt><dd className="font-medium text-ink">{previewDate(deadlineAt)}</dd></div>
        </dl>
      </div>

      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">Cancelar</button>
        <button type="submit" disabled={submitting || professionals.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CalendarPlus className="h-4 w-4" aria-hidden />}
          {submitting ? "Criando..." : "Criar ciclo"}
        </button>
      </div>
    </form>
  );
}
