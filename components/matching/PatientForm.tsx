"use client";

import { useState, type FormEvent } from "react";
import { ClipboardPaste, Loader2, UserPlus } from "lucide-react";

import { PhoneField } from "@/components/admin/PhoneField";
import { SearchCombobox } from "@/components/admin/SearchCombobox";
import { PatientBatchForm } from "@/components/matching/PatientBatchForm";
import { withBasePath } from "@/lib/basePath";
import { isValidBrazilianMobile } from "@/lib/phone";

type Props = {
  activeAreas: string[];
  onCancel: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

function IndividualPatientForm({ activeAreas, onCancel, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [approach, setApproach] = useState("");
  const [profile, setProfile] = useState("Sem preferência");
  const [priceRange, setPriceRange] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isValidBrazilianMobile(phone)) {
      setError("Informe um celular válido com DDD e nove dígitos.");
      return;
    }

    if (!area) {
      setError("Escolha uma das áreas com ciclo ativo.");
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
            name,
            phone_number: phone,
            birth_date: birthDate,
            area,
            psychotherapy_approach: approach,
            professional_profile: profile,
            price_range: priceRange
          })
        }
      );
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
      <div className="rounded-lg border border-sage/20 bg-sage/5 p-3 text-sm text-ink/65">
        O cadastro será validado e enviado para a Lambda de matching. O painel não grava dados do paciente diretamente no banco.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="patient-name" className={labelClass}>Nome completo *</label>
          <input
            id="patient-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className={inputClass}
            required
            minLength={2}
          />
        </div>

        <PhoneField value={phone} onChange={setPhone} id="patient-phone" />

        <div>
          <label htmlFor="patient-birth-date" className={labelClass}>Data de nascimento *</label>
          <input
            id="patient-birth-date"
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setBirthDate(event.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <SearchCombobox
        id="patient-area"
        label="Área desejada"
        placeholder="Pesquise uma área com ciclo ativo"
        options={activeAreas}
        selected={area}
        getKey={(option) => option}
        getLabel={(option) => option}
        onSelect={setArea}
        onClear={() => setArea(null)}
        emptyMessage="Nenhuma área com ciclo ativo corresponde à busca."
        required
      />

      {activeAreas.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Ainda não existe uma área disponível. Crie um ciclo ativo antes de cadastrar o paciente.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="patient-approach" className={labelClass}>Abordagem *</label>
          <input
            id="patient-approach"
            value={approach}
            onChange={(event) => setApproach(event.target.value)}
            placeholder="Ex.: TCC"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="patient-profile" className={labelClass}>Perfil profissional</label>
          <select
            id="patient-profile"
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
            className={inputClass}
          >
            <option>Sem preferência</option>
            <option>Mulher</option>
            <option>Homem</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="patient-price" className={labelClass}>Faixa de valor</label>
          <input
            id="patient-price"
            value={priceRange}
            onChange={(event) => setPriceRange(event.target.value)}
            placeholder="Ex.: R$ 100 a R$ 150"
            className={inputClass}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting || activeAreas.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
          {submitting ? "Cadastrando..." : "Cadastrar paciente"}
        </button>
      </div>
    </form>
  );
}

export function PatientForm(props: Props) {
  const [mode, setMode] = useState<"individual" | "batch">("individual");

  return (
    <div>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-2 rounded-lg bg-mist p-1">
          <button type="button" onClick={() => setMode("individual")} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${mode === "individual" ? "bg-white text-sage shadow-sm" : "text-ink/55 hover:text-ink"}`}>
            Cadastro individual
          </button>
          <button type="button" onClick={() => setMode("batch")} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${mode === "batch" ? "bg-white text-sage shadow-sm" : "text-ink/55 hover:text-ink"}`}>
            <ClipboardPaste className="h-4 w-4" aria-hidden />
            Colar planilha
          </button>
        </div>
      </div>

      {mode === "individual" ? (
        <IndividualPatientForm {...props} />
      ) : (
        <PatientBatchForm {...props} />
      )}
    </div>
  );
}
