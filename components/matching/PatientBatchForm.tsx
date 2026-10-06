"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Users } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import {
  findDuplicateImportedPhones,
  parsePatientPaste,
  validateImportedAreas
} from "@/lib/patientImport";
import { displayBrazilianPhone } from "@/lib/phone";

type Props = {
  activeAreas: string[];
  knownAreas: string[];
  onCancel: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";

function displayBirthDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value || "--";
}

export function PatientBatchForm({ activeAreas, knownAreas, onCancel, onSuccess }: Props) {
  const [pastedPatients, setPastedPatients] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patients = useMemo(() => {
    const parsed = validateImportedAreas(
      parsePatientPaste(pastedPatients),
      activeAreas,
      knownAreas
    );
    const duplicatePhones = findDuplicateImportedPhones(parsed);

    return parsed.map((patient) => ({
      ...patient,
      errors: duplicatePhones.has(patient.phone_number)
        ? [...patient.errors, "Celular repetido no lote"]
        : patient.errors
    }));
  }, [activeAreas, knownAreas, pastedPatients]);

  const hasErrors = patients.some((patient) => patient.errors.length > 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (patients.length === 0) {
      setError("Cole ao menos uma linha de paciente para continuar.");
      return;
    }
    if (hasErrors) {
      setError("Corrija as linhas marcadas na planilha e cole os dados novamente antes de enviar.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        withBasePath("/api/admin/registrations/patient"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            patients: patients.map((patient) => ({
              name: patient.name,
              phone_number: patient.phone_number,
              area: patient.area,
              birth_date: patient.birth_date,
              ...(patient.psychotherapy_approach ? { psychotherapy_approach: patient.psychotherapy_approach } : {}),
              professional_profile: "Sem preferência"
            }))
          })
        }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao enviar o lote.");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      <div className="rounded-lg border border-sage/20 bg-sage/5 p-3 text-sm text-ink/65">
        Copie as linhas no Google Sheets e cole abaixo. O cabeçalho e uma coluna inicial de data e hora são ignorados. A lista será validada antes do envio.
      </div>

      <div>
        <label htmlFor="patient-paste" className="mb-1.5 block text-sm font-medium text-ink/75">
          Linhas da planilha *
        </label>
        <textarea
          id="patient-paste"
          value={pastedPatients}
          onChange={(event) => {
            setPastedPatients(event.target.value);
            setError(null);
          }}
          rows={7}
          wrap="off"
          className={`${inputClass} resize-y font-mono`}
          placeholder={'30/09/2026 15:44:46\tArthur\t\t5511974527717\tPsicoterapia\t01/01/2000'}
        />
        <p className="mt-1.5 text-xs text-ink/45">
          Formato reconhecido: nome, e-mail opcional, celular, área e nascimento opcional. Aceita celular com oito ou nove dígitos e exibe no formato brasileiro.
        </p>
      </div>

      {patients.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="flex items-center justify-between border-b border-black/10 bg-mist px-3 py-2">
            <p className="text-sm font-semibold text-ink">Pacientes para confirmar</p>
            <span className="text-xs text-ink/50">{patients.length} paciente(s)</span>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="sticky top-0 bg-white text-ink/45">
                <tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Celular</th><th className="px-3 py-2">Área</th><th className="px-3 py-2">Nascimento</th><th className="px-3 py-2">Validação</th></tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {patients.map((patient) => (
                  <tr key={patient.row} className={patient.errors.length > 0 ? "bg-coral/5" : ""}>
                    <td className="px-3 py-2 font-medium text-ink">{patient.name || "--"}</td>
                    <td className="px-3 py-2 text-ink/65">{displayBrazilianPhone(patient.phone_number)}</td>
                    <td className="px-3 py-2 text-ink/65">
                      {patient.area || "--"}
                      {patient.psychotherapy_approach ? <span className="block text-ink/40">{patient.psychotherapy_approach}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-ink/65">{displayBirthDate(patient.birth_date)}</td>
                    <td className={`px-3 py-2 ${patient.errors.length > 0 ? "text-coral" : "font-medium text-emerald-700"}`}>
                      {patient.errors.length > 0 ? patient.errors.join(" · ") : "Pronto"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : pastedPatients.trim() ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Nenhuma linha de paciente foi reconhecida.</p>
      ) : null}

      {activeAreas.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Ainda não existe uma área com ciclo ativo.</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">Cancelar</button>
        <button type="submit" disabled={submitting || activeAreas.length === 0 || patients.length === 0 || hasErrors} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Users className="h-4 w-4" aria-hidden />}
          {submitting ? "Enviando..." : `Enviar ${patients.length} paciente(s)`}
        </button>
      </div>
    </form>
  );
}
