export type Channel = "TELEGRAM" | "WHATSAPP" | null;

export type ChatMode = "AUTOMATIC" | "MANUAL";

export type ChatState =
  | "FEEDBACK"
  | "QUESTION"
  | "PROFESSIONAL_SUPPORT"
  | "NEW_PATIENT"
  | "PAYMENT_RENEWAL"
  | "PROFESSIONAL_REGISTRATION";

export type ProfessionalStatus =
  | "REGISTER_PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PAYMENT_PENDING"
  | "ACTIVE"
  | "INACTIVE";

export type Conversation = {
  person_id: number;
  phone_number: string;
  chat_state: ChatState | null;
  chat_mode: ChatMode;
  name: string | null;
  channel: Channel;
  person_created_at: string;
  last_message_id: number | null;
  last_message_content: string | null;
  last_message_image_url: string | null;
  last_message_document_url: string | null;
  last_message_is_from_user: boolean | null;
  last_message_created_at: string | null;
};

export type Message = {
  id: number;
  person_id: number;
  created_at: string;
  content: string | null;
  image_url: string | null;
  document_url: string | null;
  is_from_user: boolean;
};

export type Professional = {
  id: number;
  person_id: number;
  area: string;
  professional_register: string;
  register_type: string;
  approach: string | null;
  background: string | null;
  video_platform: string | null;
  email: string | null;
  created_at: string;
  current_status: ProfessionalStatus | null;
  status_created_at: string | null;
};

export type SendMessagePayload = {
  phone_number: string;
  content: string;
};
