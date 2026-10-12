"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";

import { PhoneField } from "@/components/admin/PhoneField";
import {
  ProfessionalMatchingFields,
  type ProfessionalProfileDraft
} from "@/components/matching/MatchingProfileFields";
import { withBasePath } from "@/lib/basePath";
import { PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import { hasPsychotherapyArea, uniqueAreas } from "@/lib/matchingProfile";
import { isValidBrazilianMobile } from "@/lib/phone";
import type { ProfessionalDetail } from "@/types/matching";

type Props = { professional: ProfessionalDetail; knownAreas: string[]; onCancel: () => void; onSuccess: () => void };
const inputClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

export function ProfessionalEditForm({ professional, knownAreas, onCancel, onSuccess }: Props) {
  const [name, setName] = useState(professional.name);
  const [phone, setPhone] = useState(professional.phone_number);
  const [email, setEmail] = useState(professional.email ?? "");
  const [birthDate, setBirthDate] = useState(professional.birth_date?.slice(0, 10) ?? "");
  const [background, setBackground] = useState(professional.background ?? "");
  const [videoPlatform, setVideoPlatform] = useState(professional.video_platform ?? "");
  const [profile, setProfile] = useState<ProfessionalProfileDraft>({
    areas: uniqueAreas(
      professional.matching_profile.areas.length > 0
        ? professional.matching_profile.areas
        : [professional.area]
    ),
    approaches: professional.matching_profile.psychotherapy.approaches,
    specialties: professional.matching_profile.psychotherapy.specialties,
    gender: professional.matching_profile.profile.gender ?? "",
    race: professional.matching_profile.profile.race ?? "",
    lgbtqiapnPlus: professional.matching_profile.profile.lgbtqiapn_plus
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isValidBrazilianMobile(phone)) {
      setError("Informe um celular válido com DDD e oito ou nove dígitos.");
      return;
    }
    const allAreas = uniqueAreas(profile.areas);
    if (allAreas.length === 0) {
      setError("Informe ao menos uma área de atuação no perfil de matching.");
      return;
    }
    const [area, ...areas] = allAreas;
    const psychotherapy = hasPsychotherapyArea(allAreas);
    setSubmitting(true);
    try {
      const response = await fetch(withBasePath(`/api/admin/professionals/${professional.id}`), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone_number: phone,
          email,
          area,
          birth_date: birthDate || null,
          gender: profile.gender || null,
          minority_group: professional.minority_group,
          background: background || null,
          video_platform: videoPlatform || null,
          areas,
          approaches: psychotherapy ? profile.approaches : [],
          psychotherapy_specialties: psychotherapy ? profile.specialties : [],
          race: profile.race || null,
          lgbtqiapn_plus: profile.lgbtqiapnPlus
        })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao atualizar profissional.");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="edit-professional-name" className={labelClass}>Nome completo *</label><input id="edit-professional-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} minLength={2} required /></div>
        <PhoneField value={phone} onChange={setPhone} id="edit-professional-phone" />
        <div><label htmlFor="edit-professional-email" className={labelClass}>E-mail *</label><input id="edit-professional-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required /></div>
        <div><label htmlFor="edit-professional-birth" className={labelClass}>Data de nascimento</label><input id="edit-professional-birth" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} className={inputClass} /></div>
        <div><label htmlFor="edit-professional-video" className={labelClass}>Plataforma</label><input id="edit-professional-video" value={videoPlatform} onChange={(event) => setVideoPlatform(event.target.value)} className={inputClass} /></div>
        <ProfessionalMatchingFields idPrefix="edit-professional-profile" knownAreas={knownAreas} value={profile} onChange={setProfile} />
        <div className="sm:col-span-2"><label htmlFor="edit-professional-background" className={labelClass}>Formação e experiência</label><textarea id="edit-professional-background" value={background} onChange={(event) => setBackground(event.target.value)} rows={4} maxLength={PROFESSIONAL_BACKGROUND_MAX_LENGTH} className={inputClass} /><p className="mt-1 text-right text-xs text-ink/45">{background.length} / {PROFESSIONAL_BACKGROUND_MAX_LENGTH}</p></div>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      <div className="flex justify-end gap-2 border-t border-black/10 pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium hover:bg-mist">Cancelar</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{submitting ? "Salvando..." : "Salvar alterações"}</button></div>
    </form>
  );
}
