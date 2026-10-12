"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import {
  hasPsychotherapyArea,
  PROFESSIONAL_GENDERS,
  PROFESSIONAL_RACES,
  PSYCHOTHERAPY_APPROACHES,
  PSYCHOTHERAPY_SPECIALTIES,
  uniqueAreas
} from "@/lib/matchingProfile";

export type ProfessionalProfileDraft = {
  areas: string[];
  approaches: string[];
  specialties: string[];
  gender: string;
  race: string;
  lgbtqiapnPlus: boolean | null;
};

type CheckboxGroupProps = {
  legend: string;
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

const inputClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

export function CheckboxGroup({ legend, options, selected, onChange }: CheckboxGroupProps) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink/70 hover:bg-mist">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) => onChange(
                event.target.checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option)
              )}
              className="mt-0.5 h-4 w-4 accent-sage"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TriStateSelect({
  id,
  label,
  value,
  onChange,
  emptyLabel = "Não informado"
}: {
  id: string;
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <select
        id={id}
        value={value === null ? "" : String(value)}
        onChange={(event) => onChange(
          event.target.value === "" ? null : event.target.value === "true"
        )}
        className={inputClass}
      >
        <option value="">{emptyLabel}</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    </div>
  );
}

export function ProfessionalMatchingFields({
  idPrefix,
  knownAreas,
  value,
  onChange
}: {
  idPrefix: string;
  knownAreas: string[];
  value: ProfessionalProfileDraft;
  onChange: (value: ProfessionalProfileDraft) => void;
}) {
  const [customArea, setCustomArea] = useState("");
  const areas = uniqueAreas(value.areas);
  const psychotherapy = hasPsychotherapyArea(areas);
  const availableAreas = knownAreas.filter(
    (area) => !areas.some(
      (selected) => selected.localeCompare(area, "pt-BR", { sensitivity: "base" }) === 0
    )
  );

  function addArea(area: string) {
    const next = uniqueAreas([...areas, area]);
    onChange({ ...value, areas: next });
    setCustomArea("");
  }

  return (
    <section className="space-y-4 rounded-xl border border-sage/20 bg-sage/5 p-4 sm:col-span-2">
      <div>
        <h3 className="text-sm font-semibold text-ink">Perfil para matching</h3>
        <p className="mt-1 text-xs text-ink/55">Selecione todas as áreas de atuação. Os demais campos são opcionais e ajudam a priorizar combinações compatíveis.</p>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-known-area`} className={labelClass}>Áreas de atuação *</label>
        {areas.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {areas.map((area) => (
              <span key={area} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink/70 ring-1 ring-black/10">
                {area}
                <button type="button" onClick={() => onChange({ ...value, areas: areas.filter((item) => item !== area) })} aria-label={`Remover ${area}`}>
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select id={`${idPrefix}-known-area`} value="" onChange={(event) => event.target.value && addArea(event.target.value)} className={inputClass}>
            <option value="">Adicionar área de atuação</option>
            {availableAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <input aria-label="Nova área de atuação" value={customArea} onChange={(event) => setCustomArea(event.target.value)} placeholder="Ou informe outra área" className={inputClass} />
          <button type="button" onClick={() => addArea(customArea)} disabled={!customArea.trim()} className="inline-flex items-center justify-center gap-1 rounded-lg border border-sage/30 bg-white px-3 py-2 text-sm font-semibold text-sage disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden />Adicionar
          </button>
        </div>
      </div>

      {psychotherapy ? (
        <>
          <CheckboxGroup legend="Abordagens" options={PSYCHOTHERAPY_APPROACHES} selected={value.approaches} onChange={(approaches) => onChange({ ...value, approaches })} />
          <CheckboxGroup legend="Especialidades em psicoterapia" options={PSYCHOTHERAPY_SPECIALTIES} selected={value.specialties} onChange={(specialties) => onChange({ ...value, specialties })} />
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-gender`} className={labelClass}>Gênero</label>
          <select id={`${idPrefix}-gender`} value={value.gender} onChange={(event) => onChange({ ...value, gender: event.target.value })} className={inputClass}>
            <option value="">Não informado</option>
            {PROFESSIONAL_GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-race`} className={labelClass}>Raça</label>
          <select id={`${idPrefix}-race`} value={value.race} onChange={(event) => onChange({ ...value, race: event.target.value })} className={inputClass}>
            <option value="">Não informado</option>
            {PROFESSIONAL_RACES.map((race) => <option key={race} value={race}>{race}</option>)}
          </select>
        </div>
        <TriStateSelect id={`${idPrefix}-lgbtqiapn`} label="Identificação LGBTQIAPN+" value={value.lgbtqiapnPlus} onChange={(lgbtqiapnPlus) => onChange({ ...value, lgbtqiapnPlus })} />
      </div>
    </section>
  );
}
