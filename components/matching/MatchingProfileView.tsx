import { formatBooleanPreference } from "@/lib/matchingProfile";
import type { ProfessionalMatchingProfile } from "@/types/matching";

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink/75">{value || "Não informado"}</dd>
    </div>
  );
}

export function MatchingProfileView({ profile }: { profile: ProfessionalMatchingProfile }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <Value label="Áreas" value={profile.areas.join(", ")} />
      <Value label="Abordagens" value={profile.psychotherapy.approaches.join(", ")} />
      <Value label="Especialidades" value={profile.psychotherapy.specialties.join(", ")} />
      <Value label="Gênero" value={profile.profile.gender ?? ""} />
      <Value label="Raça" value={profile.profile.race ?? ""} />
      <Value label="LGBTQIAPN+" value={formatBooleanPreference(profile.profile.lgbtqiapn_plus)} />
    </dl>
  );
}
