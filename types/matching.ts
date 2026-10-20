export type MatchingCycleType = "REGULAR" | "REPLACEMENT";

export type ProfessionalMatchingProfile = {
  schema_version: number;
  areas: string[];
  psychotherapy: {
    approaches: string[];
    specialties: string[];
  };
  profile: {
    gender: string | null;
    race: string | null;
    lgbtqiapn_plus: boolean | null;
  };
};

export type CycleStatus =
  | "ACTIVE"
  | "SCHEDULED"
  | "COMPLETED"
  | "OVERDUE"
  | "CANCELLED";

export type ProfessionalOption = {
  id: number;
  person_id: number;
  name: string;
  phone_number: string;
  area: string;
  professional_register: string;
};

export type ProfessionalDistributionItem = ProfessionalOption & {
  matching_profile: ProfessionalMatchingProfile;
  is_active: boolean;
  has_regular_cycle: boolean;
  has_replacement_cycle: boolean;
  promised_patients: number;
  delivered_patients: number;
  pending_patients: number;
  pending_replacements: number;
  next_deadline: string | null;
  last_completed_at: string | null;
  has_overdue: boolean;
};

export type DistributionMetrics = {
  registered_professionals: number;
  active_professionals: number;
  registered_patients: number;
  new_patients_last_7_days: number;
  pending_connections: number;
  due_next_7_days: number;
  overdue_connections: number;
  pending_replacements: number;
};

export type DistributionData = {
  metrics: DistributionMetrics;
  professionals: ProfessionalDistributionItem[];
  active_areas: string[];
  known_areas: string[];
  generated_at: string;
};

export type MatchingCycleView = {
  id: number;
  type: MatchingCycleType;
  promised_patients: number;
  delivered_patients: number;
  pending_patients: number;
  starts_at: string;
  deadline_at: string;
  cancelled_at: string | null;
  created_at: string;
  status: CycleStatus;
};

export type MatchingConnectionView = {
  id: number;
  cycle_id: number;
  cycle_type: MatchingCycleType;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  compatibility_score: number;
  urgency_score: number;
  final_score: number;
  algorithm_version: string;
  created_at: string;
};

export type ProfessionalDetail = ProfessionalOption & {
  cpf: string | null;
  birth_date: string | null;
  email: string | null;
  approach: string | null;
  background: string | null;
  video_platform: string | null;
  gender: string | null;
  minority_group: string | null;
  matching_profile: ProfessionalMatchingProfile;
  created_at: string;
  is_active: boolean;
  promised_patients: number;
  delivered_patients: number;
  pending_patients: number;
  pending_replacements: number;
  next_deadline: string | null;
  cycles: MatchingCycleView[];
  connections: MatchingConnectionView[];
};

export type CreateCyclePayload = {
  professional_id: number;
  type: MatchingCycleType;
  promised_patients: number;
  starts_at: string;
  deadline_at: string;
};

export type PatientRegistrationPayload = {
  name: string;
  phone_number: string;
  birth_date: string | null;
  area: string;
  psychotherapy_approach: string | null;
  psychotherapy_specialties: string[];
  preferred_gender: string | null;
  preferred_race: string | null;
};

export type ProfessionalRegistrationPayload = {
  name: string;
  phone_number: string;
  email: string;
  area: string;
  birth_date: string | null;
  background: string | null;
  video_platform: string | null;
  gender: string | null;
  minority_group: string | null;
  areas: string[];
  approaches: string[];
  psychotherapy_specialties: string[];
  race: string | null;
  lgbtqiapn_plus: boolean | null;
};

export type ProfessionalUpdatePayload = ProfessionalRegistrationPayload;
