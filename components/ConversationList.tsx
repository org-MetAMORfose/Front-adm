"use client";

import { AlertCircle, MessageSquareText } from "lucide-react";

import { needsHumanIntervention } from "@/lib/intervention";
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

export function ConversationList({
  conversations,
  selectedPersonId,
  isLoading,
  error,
  onSelect
}: Props) {
  return (
    <aside className="border-b border-black/10 bg-white lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Conversas</h2>
          <p className="text-xs text-ink/55">{conversations.length} registros</p>
        </div>
        <MessageSquareText className="h-5 w-5 text-sage" aria-hidden />
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

        {!isLoading && conversations.length === 0 ? (
          <div className="p-4 text-sm text-ink/60">Nenhuma conversa encontrada.</div>
        ) : null}

        {conversations.map((conversation) => {
          const active = selectedPersonId === conversation.person_id;
          const needsHuman = needsHumanIntervention(conversation.chat_state);

          return (
            <button
              key={conversation.person_id}
              type="button"
              onClick={() => onSelect(conversation.person_id)}
              className={`block w-full border-b border-black/10 px-4 py-3 text-left transition hover:bg-mist ${
                active ? "bg-mist" : "bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
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

              <div className="mt-2 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-ink/70">
                  {lastMessagePreview(conversation)}
                </p>
                {needsHuman ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-coral/30 bg-coral/10 px-2 py-1 text-xs font-medium text-coral">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                    Humano
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
