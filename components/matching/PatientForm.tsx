"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { PhoneField } from "@/components/admin/PhoneField";
import { SpecialtyFields } from "@/components/matching/MatchingProfileFields";
import { withBasePath } from "@/lib/basePath";
import {
  isPsychotherapyArea,
  PROFESSIONAL_GENDERS,
  PROFESSIONAL_RACES,
  PSYCHOTHERAPY_APPROACHES
} from "@/lib/matchingProfile";
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
  const [psychotherapyApproach, setPsychotherapyApproach] = useState("");
  const [psychotherapySpecialties, setPsychotherapySpecialties] = useState<string[]>([]);
  const [preferredGender, setPreferredGender] = useState("");
  const [preferredRace, setPreferredRace] = useState("");
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
    const psychotherapy = isPsychotherapyArea(area);
    try {
      const response = await fetch(withBasePath("/api/admin/registrations/patient"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone_number: phone,
          area,
          birth_date: birthDate || null,
          psychotherapy_approach: psychotherapy
            ? psychotherapyApproach || null
            : null,
          psychotherapy_specialties: psychotherapy
            ? psychotherapySpecialties
            : [],
          preferred_gender: preferredGender || null,
          preferred_race: preferredRace || null
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
      <div>
        <label htmlFor="patient-area" className={labelClass}>Área desejada *</label>
        <select id="patient-area" value={area ?? ""} onChange={(event) => setArea(event.target.value || null)} className={inputClass} required>
          <option value="">Selecione uma área disponível</option>
          {activeAreas.map((activeArea) => <option key={activeArea} value={activeArea}>{activeArea}</option>)}
        </select>
      </div>
      {area && isPsychotherapyArea(area) ? (
        <section className="space-y-4 rounded-xl border border-sage/20 bg-sage/5 p-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">Preferências de psicoterapia</h3>
            <p className="mt-1 text-xs text-ink/55">Todos os campos são opcionais. Uma abordagem escolhida precisa ser oferecida pelo profissional; as especialidades ajudam na priorização.</p>
          </div>
          <div>
            <label htmlFor="patient-psychotherapy-approach" className={labelClass}>Abordagem</label>
            <select id="patient-psychotherapy-approach" value={psychotherapyApproach} onChange={(event) => setPsychotherapyApproach(event.target.value)} className={inputClass}>
              <option value="">Sem preferência</option>
              {PSYCHOTHERAPY_APPROACHES.map((approach) => <option key={approach} value={approach}>{approach}</option>)}
            </select>
          </div>
          <SpecialtyFields idPrefix="patient" legend="Especialidades procuradas (selecione uma ou mais)" selected={psychotherapySpecialties} onChange={setPsychotherapySpecialties} />
        </section>
      ) : null}
      <section className="space-y-4 rounded-xl border border-black/10 p-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Preferências de profissional</h3>
          <p className="mt-1 text-xs text-ink/55">Todos os campos são opcionais e usados apenas para priorização.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="patient-preferred-gender" className={labelClass}>Gênero</label>
            <select id="patient-preferred-gender" value={preferredGender} onChange={(event) => setPreferredGender(event.target.value)} className={inputClass}>
              <option value="">Sem preferência</option>
              {PROFESSIONAL_GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="patient-preferred-race" className={labelClass}>Autodeclaração do profissional</label>
            <select id="patient-preferred-race" value={preferredRace} onChange={(event) => setPreferredRace(event.target.value)} className={inputClass}>
              <option value="">Sem preferência</option>
              {PROFESSIONAL_RACES.map((race) => <option key={race} value={race}>{race}</option>)}
            </select>
          </div>
        </div>
      </section>
      {activeAreas.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Não há área com ciclo vigente e paciente pendente.</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">Cancelar</button>
        <button type="submit" disabled={submitting || activeAreas.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{submitting ? "Cadastrando..." : "Cadastrar paciente"}</button>
      </div>
    </form>
  );
}
