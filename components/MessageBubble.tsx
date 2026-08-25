"use client";

import { Download, FileText, Play } from "lucide-react";
import { useState } from "react";

import { withBasePath } from "@/lib/basePath";
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
  const mediaUrl = withBasePath(`/api/admin/messages/${message.id}/media`);
  const [videoRequested, setVideoRequested] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

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

        {message.media_type === "image" ? (
          <button
            type="button"
            className="mt-2 block overflow-hidden rounded border border-black/10"
            onClick={() => onImageClick(mediaUrl)}
            aria-label="Ampliar imagem"
          >
            <img
              src={mediaUrl}
              alt="Imagem recebida"
              className="max-h-64 w-full object-cover"
            />
          </button>
        ) : null}

        {message.media_type === "video" ? (
          <div className="mt-2 overflow-hidden rounded border border-black/10 bg-black">
            {videoFailed ? (
              <p className="px-3 py-6 text-center text-sm text-white/80">
                Não foi possível reproduzir este vídeo.
              </p>
            ) : !videoRequested ? (
              <button
                type="button"
                className="flex min-h-40 w-full flex-col items-center justify-center gap-2 px-4 py-6 text-sm font-semibold text-white transition hover:bg-white/10"
                onClick={() => setVideoRequested(true)}
                aria-label="Reproduzir vídeo"
              >
                <span className="rounded-full bg-white/15 p-3">
                  <Play className="h-6 w-6 fill-current" aria-hidden />
                </span>
                Reproduzir vídeo
              </button>
            ) : (
              <video
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-80 w-full"
                onError={() => setVideoFailed(true)}
              >
                Seu navegador não suporta a reprodução de vídeos.
              </video>
            )}
          </div>
        ) : null}

        {message.media_type === "video" ? (
          <a
            href={mediaUrl}
            download
            className={`mt-2 inline-flex items-center gap-2 rounded border px-2 py-1 text-sm underline-offset-2 hover:underline ${
              fromUser
                ? "border-black/10 text-sage"
                : "border-white/30 text-white"
            }`}
          >
            <Download className="h-4 w-4" aria-hidden />
            Baixar vídeo
          </a>
        ) : null}

        {message.media_type === "document" ? (
          <a
            href={mediaUrl}
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
