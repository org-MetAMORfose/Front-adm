"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { PhoneField } from "@/components/admin/PhoneField";
import { withBasePath } from "@/lib/basePath";
import { PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import { isValidBrazilianMobile } from "@/lib/phone";

type Props = { knownAreas: string[]; onCancel: () => void; onSuccess: () => void };
const inputClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

export function ProfessionalForm({ knownAreas, onCancel, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [minorityGroup, setMinorityGroup] = useState("");
  const [background, setBackground] = useState("");
  const [videoPlatform, setVideoPlatform] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isValidBrazilianMobile(phone)) {
      setError("Informe um celular válido com DDD e nove dígitos.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(withBasePath("/api/admin/registrations/professional"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone_number: phone, email, area, birth_date: birthDate, gender, minority_group: minorityGroup, background, video_platform: videoPlatform })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Falha ao cadastrar profissional.");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      <div className="rounded-lg border border-sage/20 bg-sage/5 p-3 text-sm text-ink/65">Nome, celular, e-mail e área são obrigatórios. A área aceita texto livre e sugere valores já cadastrados.</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="professional-name" className={labelClass}>Nome completo *</label><input id="professional-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} minLength={2} required /></div>
        <PhoneField value={phone} onChange={setPhone} id="professional-phone" />
        <div><label htmlFor="professional-email" className={labelClass}>E-mail *</label><input id="professional-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={inputClass} required /></div>
        <div className="sm:col-span-2"><label htmlFor="professional-area" className={labelClass}>Área de atuação *</label><input id="professional-area" list="known-professional-areas" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Selecione ou escreva uma nova área" className={inputClass} required /><datalist id="known-professional-areas">{knownAreas.map((item) => <option value={item} key={item} />)}</datalist></div>
        <div><label htmlFor="professional-birth-date" className={labelClass}>Data de nascimento</label><input id="professional-birth-date" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} className={inputClass} /></div>
        <div><label htmlFor="professional-video" className={labelClass}>Plataforma</label><input id="professional-video" value={videoPlatform} onChange={(event) => setVideoPlatform(event.target.value)} placeholder="Ex.: Google Meet" className={inputClass} /></div>
        <div><label htmlFor="professional-gender" className={labelClass}>Gênero</label><input id="professional-gender" value={gender} onChange={(event) => setGender(event.target.value)} className={inputClass} /></div>
        <div><label htmlFor="professional-minority" className={labelClass}>Grupo minoritário</label><input id="professional-minority" value={minorityGroup} onChange={(event) => setMinorityGroup(event.target.value)} className={inputClass} /></div>
        <div className="sm:col-span-2"><label htmlFor="professional-background" className={labelClass}>Formação e experiência</label><textarea id="professional-background" value={background} onChange={(event) => setBackground(event.target.value)} rows={4} maxLength={PROFESSIONAL_BACKGROUND_MAX_LENGTH} className={inputClass} /><p className="mt-1 text-right text-xs text-ink/45">{background.length} / {PROFESSIONAL_BACKGROUND_MAX_LENGTH}</p></div>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">Cancelar</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage/90 disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{submitting ? "Cadastrando..." : "Cadastrar profissional"}</button></div>
    </form>
  );
}
