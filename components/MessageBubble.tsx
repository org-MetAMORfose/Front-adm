"use client";

import { FileText } from "lucide-react";

import type { Message } from "@/types";

type Props = {
  message: Message;
  onImageClick: (imageUrl: string) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function MessageBubble({ message, onImageClick }: Props) {
  const fromUser = message.is_from_user;

  return (
    <div className={`flex ${fromUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded px-3 py-2 shadow-subtle sm:max-w-[68%] ${
          fromUser
            ? "border border-black/10 bg-white"
            : "bg-sage text-white"
        }`}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        ) : null}

        {message.image_url ? (
          <button
            type="button"
            className="mt-2 block overflow-hidden rounded border border-black/10"
            onClick={() => onImageClick(message.image_url as string)}
            aria-label="Ampliar imagem"
          >
            <img
              src={message.image_url}
              alt="Imagem recebida"
              className="max-h-64 w-full object-cover"
            />
          </button>
        ) : null}

        {message.document_url ? (
          <a
            href={message.document_url}
            target="_blank"
            rel="noreferrer"
            className={`mt-2 inline-flex items-center gap-2 rounded border px-2 py-1 text-sm underline-offset-2 hover:underline ${
              fromUser
                ? "border-black/10 text-sage"
                : "border-white/30 text-white"
            }`}
          >
            <FileText className="h-4 w-4" aria-hidden />
            Abrir documento
          </a>
        ) : null}

        <div
          className={`mt-1 text-[11px] ${
            fromUser ? "text-ink/45" : "text-white/75"
          }`}
        >
          {formatDate(message.created_at)}
        </div>
      </div>
    </div>
  );
}
