"use client";

import { useMemo, useState } from "react";
import { AlertCircle, MessageSquareText } from "lucide-react";

import type { Conversation } from "@/types";

type Props = {
  conversations: Conversation[];
  selectedPersonId: number | null;
  isLoading: boolean;
  error: Error | null;
  onSelect: (personId: number) => void;
};

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function lastMessagePreview(conversation: Conversation) {
  if (conversation.last_message_content) {
    return conversation.last_message_content;
  }

  if (conversation.last_message_image_url) {
    return "Imagem recebida";
  }

  if (conversation.last_message_document_url) {
    return "Documento recebido";
  }

  return "Sem mensagens";
}

const CHAT_STATE_FILTERS = [
  { label: "Todos", value: "ALL" },
  { label: "Manual", value: "MANUAL" },
  { label: "Novo paciente", value: "NEW_PATIENT" },
  { label: "Seleção profissional", value: "PROFESSIONAL_REGISTRATION" },
  { label: "Reposição", value: "PAYMENT_RENEWAL" },
  { label: "Dúvidas", value: "QUESTION" },
  { label: "Feedback", value: "FEEDBACK" }
] as const;

const CHAT_STATE_LABELS: Record<string, string> = {
  FEEDBACK: "Feedback",
  QUESTION: "Dúvida",
  PROFESSIONAL_SUPPORT: "Suporte profissional",
  NEW_PATIENT: "Novo paciente",
  PAYMENT_RENEWAL: "Reposição",
  PROFESSIONAL_REGISTRATION: "Cadastro profissional"
};

const CHAT_STATE_BADGE_STYLES: Record<string, string> = {
  FEEDBACK: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  QUESTION: "bg-rose-100 text-rose-800 border border-rose-200",
  PROFESSIONAL_SUPPORT: "bg-slate-100 text-slate-800 border border-slate-200",
  NEW_PATIENT: "bg-sky-100 text-sky-800 border border-sky-200",
  PAYMENT_RENEWAL: "bg-amber-100 text-amber-800 border border-amber-200",
  PROFESSIONAL_REGISTRATION: "bg-violet-100 text-violet-800 border border-violet-200"
};

function normalizeChatState(chatState: string | null) {
  return chatState?.trim().toUpperCase().replace(/\s+/g, "_") ?? "";
}

function getChatStateBadge(chatState: string | null) {
  const normalized = normalizeChatState(chatState);
  return {
    label: CHAT_STATE_LABELS[normalized] ?? chatState ?? "Sem etapa",
    colorClass:
      CHAT_STATE_BADGE_STYLES[normalized] ?? "bg-ink/5 text-ink border border-black/10"
  };
}

export function ConversationList({
  conversations,
  selectedPersonId,
  isLoading,
  error,
  onSelect
}: Props) {
  const [activeFilter, setActiveFilter] = useState<typeof CHAT_STATE_FILTERS[number]["value"]>("ALL");

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        if (activeFilter === "ALL") {
          return true;
        }

        if (activeFilter === "MANUAL") {
          return conversation.chat_mode === "MANUAL";
        }

        return normalizeChatState(conversation.chat_state) === activeFilter;
      }),
    [activeFilter, conversations]
  );

  return (
    <aside className="border-b border-black/10 bg-white lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Conversas</h2>
          <p className="text-xs text-ink/55">
            {filteredConversations.length} de {conversations.length} registros
          </p>
        </div>
        <MessageSquareText className="h-5 w-5 text-sage" aria-hidden />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-black/10 px-4 py-3">
        {CHAT_STATE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "border-ink bg-ink text-white shadow-sm"
                  : "border-black/10 bg-white text-ink/70 hover:bg-mist"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="m-4 rounded border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
          {error.message}
        </div>
      ) : null}

      <div className="max-h-[36vh] overflow-y-auto lg:max-h-[calc(100vh-126px)]">
        {isLoading ? (
          <div className="p-4 text-sm text-ink/60">Carregando conversas...</div>
        ) : null}

        {!isLoading && filteredConversations.length === 0 ? (
          <div className="p-4 text-sm text-ink/60">
            Nenhuma conversa encontrada para este filtro.
          </div>
        ) : null}

        {filteredConversations.map((conversation) => {
          const active = selectedPersonId === conversation.person_id;
          const needsHuman = conversation.chat_mode === "MANUAL";
          const badge = getChatStateBadge(conversation.chat_state);

          return (
            <button
              key={conversation.person_id}
              type="button"
              onClick={() => onSelect(conversation.person_id)}
              className={`block w-full border-b border-black/10 px-4 py-3 text-left transition hover:bg-mist ${
                active
                  ? "bg-mist"
                  : needsHuman
                  ? "bg-amber-50"
                  : "bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {conversation.name || "Sem nome"}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink/60">
                    {conversation.phone_number}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-ink/50">
                    {formatDate(conversation.last_message_created_at)}
                  </div>
                  <div className="mt-1 text-xs font-medium text-sage">
                    {conversation.channel ?? "CANAL"}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.colorClass}`}>
                  {badge.label}
                </span>
                <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink/65">
                  {conversation.chat_mode === "MANUAL" ? "Manual" : "Automático"}
                </span>
                {needsHuman ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-coral/30 bg-coral/10 px-2 py-1 text-xs font-medium text-coral">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                    Humano
                  </span>
                ) : null}
              </div>

              <p className="mt-3 truncate text-sm text-ink/70">
                {lastMessagePreview(conversation)}
              </p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
