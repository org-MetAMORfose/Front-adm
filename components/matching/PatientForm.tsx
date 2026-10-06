"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { PhoneField } from "@/components/admin/PhoneField";
import { SearchCombobox } from "@/components/admin/SearchCombobox";
import { withBasePath } from "@/lib/basePath";
import { isValidBrazilianMobile } from "@/lib/phone";

type Props = {
  activeAreas: string[];
  onCancel: () => void;
  onSuccess: () => void;
};

const inputClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

export function PatientForm({ activeAreas, onCancel, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isValidBrazilianMobile(phone)) {
      setError("Informe um celular válido com DDD e oito ou nove dígitos.");
      return;
    }
    if (!area) {
      setError("Escolha uma das áreas disponíveis.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(withBasePath("/api/admin/registrations/patient"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone_number: phone,
          area,
          ...(birthDate ? { birth_date: birthDate } : {})
        })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao cadastrar paciente.");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      <div className="rounded-lg border border-sage/20 bg-sage/5 p-3 text-sm text-ink/65">Nome, celular e área são obrigatórios. A data de nascimento pode ser preenchida depois.</div>
      <div>
        <label htmlFor="patient-name" className={labelClass}>Nome completo *</label>
        <input id="patient-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} required minLength={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PhoneField value={phone} onChange={setPhone} id="patient-phone" />
        <div>
          <label htmlFor="patient-birth-date" className={labelClass}>Data de nascimento</label>
          <input id="patient-birth-date" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} className={inputClass} />
        </div>
      </div>
      <SearchCombobox id="patient-area" label="Área desejada" placeholder="Pesquise uma área disponível" options={activeAreas} selected={area} getKey={(option) => option} getLabel={(option) => option} onSelect={setArea} onClear={() => setArea(null)} emptyMessage="Nenhuma área com saldo de ciclo corresponde à busca." required />
      {activeAreas.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Não há área com ciclo vigente e paciente pendente.</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">Cancelar</button>
        <button type="submit" disabled={submitting || activeAreas.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{submitting ? "Cadastrando..." : "Cadastrar paciente"}</button>
      </div>
    </form>
  );
}
