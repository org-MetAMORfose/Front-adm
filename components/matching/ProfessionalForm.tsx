"use client";

import { useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { PhoneField } from "@/components/admin/PhoneField";
import { withBasePath } from "@/lib/basePath";
import { PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import { isValidBrazilianMobile } from "@/lib/phone";

type Props = {
  knownAreas: string[];
  onCancel: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink/75";

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function ProfessionalForm({ knownAreas, onCancel, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [area, setArea] = useState("");
  const [registerType, setRegisterType] = useState("");
  const [professionalRegister, setProfessionalRegister] = useState("");
  const [email, setEmail] = useState("");
  const [approach, setApproach] = useState("");
  const [background, setBackground] = useState("");
  const [videoPlatform, setVideoPlatform] = useState("");
  const [gender, setGender] = useState("");
  const [minorityGroup, setMinorityGroup] = useState("");
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
      const response = await fetch(
        withBasePath("/api/admin/registrations/professional"),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            phone_number: phone,
            birth_date: birthDate,
            cpf,
            area,
            professional_register: professionalRegister,
            register_type: registerType,
            email,
            approach,
            background,
            video_platform: videoPlatform,
            gender,
            minority_group: minorityGroup
          })
        }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Falha ao cadastrar profissional.");
      }
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
        Os dados pessoais e profissionais serão enviados juntos ao endpoint do chatbot. O painel não grava nessas tabelas.
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-sage">Dados pessoais</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="professional-name" className={labelClass}>Nome completo *</label>
            <input id="professional-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={inputClass} minLength={2} required />
          </div>
          <PhoneField value={phone} onChange={setPhone} id="professional-phone" />
          <div>
            <label htmlFor="professional-birth-date" className={labelClass}>Data de nascimento</label>
            <input id="professional-birth-date" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="professional-cpf" className={labelClass}>CPF</label>
            <input id="professional-cpf" value={formatCpf(cpf)} onChange={(event) => setCpf(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className={inputClass} />
          </div>
          <div>
            <label htmlFor="professional-email" className={labelClass}>E-mail</label>
            <input id="professional-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={inputClass} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-black/10 pt-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-sage">Dados profissionais</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="professional-area" className={labelClass}>Área de atuação *</label>
            <input id="professional-area" list="known-professional-areas" value={area} onChange={(event) => setArea(event.target.value)} placeholder="Selecione ou informe uma nova área" className={inputClass} required />
            <datalist id="known-professional-areas">
              {knownAreas.map((knownArea) => <option value={knownArea} key={knownArea} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="register-type" className={labelClass}>Tipo de registro *</label>
            <input id="register-type" list="register-types" value={registerType} onChange={(event) => setRegisterType(event.target.value.toUpperCase())} placeholder="Ex.: CRP" className={inputClass} required />
            <datalist id="register-types"><option value="CRP" /><option value="CRM" /><option value="CRN" /></datalist>
          </div>
          <div>
            <label htmlFor="professional-register" className={labelClass}>Número do registro *</label>
            <input id="professional-register" value={professionalRegister} onChange={(event) => setProfessionalRegister(event.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="professional-approach" className={labelClass}>Abordagem</label>
            <input id="professional-approach" value={approach} onChange={(event) => setApproach(event.target.value)} placeholder="Ex.: TCC" className={inputClass} />
          </div>
          <div>
            <label htmlFor="professional-video" className={labelClass}>Plataforma de vídeo</label>
            <input id="professional-video" value={videoPlatform} onChange={(event) => setVideoPlatform(event.target.value)} placeholder="Ex.: Google Meet" className={inputClass} />
          </div>
          <div>
            <label htmlFor="professional-gender" className={labelClass}>Gênero</label>
            <select id="professional-gender" value={gender} onChange={(event) => setGender(event.target.value)} className={inputClass}>
              <option value="">Não informado</option><option value="Mulher">Mulher</option><option value="Homem">Homem</option><option value="Não binário">Não binário</option><option value="Outro">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="professional-minority" className={labelClass}>Grupo minoritário</label>
            <input id="professional-minority" value={minorityGroup} onChange={(event) => setMinorityGroup(event.target.value)} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="professional-background" className={labelClass}>Formação e experiência</label>
            <textarea
              id="professional-background"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              rows={3}
              maxLength={PROFESSIONAL_BACKGROUND_MAX_LENGTH}
              className={inputClass}
            />
            <p className="mt-1 text-right text-xs text-ink/45">
              {background.length} / {PROFESSIONAL_BACKGROUND_MAX_LENGTH} caracteres
            </p>
          </div>
        </div>
      </fieldset>

      {error ? <p role="alert" className="rounded-lg border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-black/10 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-mist">Cancelar</button>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
          {submitting ? "Cadastrando..." : "Cadastrar profissional"}
        </button>
      </div>
    </form>
  );
}
