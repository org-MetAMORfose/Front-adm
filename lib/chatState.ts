import type { ChatState } from "@/types";

export const CHAT_STATE_LABELS: Record<ChatState, string> = {
  FEEDBACK: "Feedback",
  QUESTION: "Dúvidas e perguntas",
  PROFESSIONAL_SUPPORT: "Suporte ao profissional",
  NEW_PATIENT: "Novo paciente",
  RETURNING_PATIENT: "Paciente retornando",
  PAYMENT_RENEWAL: "Renovação de pagamento",
  PROFESSIONAL_REGISTRATION: "Cadastro de profissional"
};

const CHAT_STATE_VALUES: ChatState[] = [
  "NEW_PATIENT",
  "RETURNING_PATIENT",
  "QUESTION",
  "PROFESSIONAL_SUPPORT",
  "PAYMENT_RENEWAL",
  "PROFESSIONAL_REGISTRATION",
  "FEEDBACK"
];

export const CHAT_STATE_OPTIONS = CHAT_STATE_VALUES.map((value) => ({
  value,
  label: CHAT_STATE_LABELS[value]
}));
