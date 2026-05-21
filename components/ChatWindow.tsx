"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { MessageBubble } from "@/components/MessageBubble";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { sendImageMessage } from "@/lib/imageSender";
import type { Conversation, Message, Professional } from "@/types";

type Props = {
  conversation: Conversation | null;
};

async function fetchMessages(personId: number) {
  const response = await fetch(`/api/admin/conversations/${personId}/messages`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as mensagens.");
  }

  return (await response.json()) as { messages: Message[] };
}

async function fetchProfessional(personId: number) {
  const response = await fetch(`/api/admin/person/${personId}/professional`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o profissional.");
  }

  return (await response.json()) as { professional: Professional | null };
}

async function sendMessage(payload: { phone_number: string; content: string }) {
  const response = await fetch("/api/admin/send-message", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Falha ao enviar mensagem.");
  }

  return body;
}

export function ChatWindow({ conversation }: Props) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const personId = conversation?.person_id;

  const messagesQuery = useQuery({
    queryKey: ["messages", personId],
    queryFn: () => fetchMessages(personId as number),
    enabled: Boolean(personId),
    refetchInterval: 3000
  });

  const professionalQuery = useQuery({
    queryKey: ["professional", personId],
    queryFn: () => fetchProfessional(personId as number),
    enabled: Boolean(personId)
  });

  const messages = useMemo(
    () => messagesQuery.data?.messages ?? [],
    [messagesQuery.data?.messages]
  );

  const mutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: async () => {
      setContent("");
      setStatus("Mensagem enviada.");
      await queryClient.invalidateQueries({ queryKey: ["messages", personId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Erro inesperado.");
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.person_id]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  useEffect(() => {
    setContent("");
    setStatus(null);
    setImageFile(null);
    setPreviewImageUrl(null);
  }, [conversation?.person_id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!conversation || !content.trim()) {
      return;
    }

    mutation.mutate({
      phone_number: conversation.phone_number,
      content: content.trim()
    });
  }

  async function handleTestSend() {
    const message = content.trim() || "Mensagem de teste automatizado";

    mutation.mutate({
      phone_number: "5511974527717",
      content: message
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setImageFile(file);
    setPreviewImageUrl(URL.createObjectURL(file));
    setStatus(null);
  }

  async function handleImageSend() {
    if (!conversation || !imageFile) {
      return;
    }

    try {
      await sendImageMessage({
        phoneNumber: conversation.phone_number,
        file: imageFile,
        caption: content.trim() || undefined
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  function clearImage() {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setImageFile(null);
    setPreviewImageUrl(null);
  }

  if (!conversation) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-semibold">Selecione uma conversa</h2>
          <p className="mt-2 text-sm text-ink/60">
            As mensagens e dados do profissional aparecem aqui.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[60vh] flex-col overflow-hidden bg-mist lg:max-h-[calc(100vh-73px)]">
      <div className="border-b border-black/10 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {conversation.name || "Sem nome"}
            </h2>
            <p className="truncate text-sm text-ink/60">
              {conversation.phone_number} · {conversation.channel ?? "CANAL"} ·{" "}
              {conversation.chat_state}
            </p>
          </div>
          <span className="rounded border border-black/10 px-3 py-1 text-xs font-medium text-ink/60">
            Pessoa #{conversation.person_id}
          </span>
        </div>
      </div>

      <ProfessionalCard
        professional={professionalQuery.data?.professional ?? null}
        isLoading={professionalQuery.isLoading}
      />

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messagesQuery.isLoading ? (
          <div className="text-sm text-ink/60">Carregando mensagens...</div>
        ) : null}

        {messagesQuery.error ? (
          <div className="rounded border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
            {messagesQuery.error.message}
          </div>
        ) : null}

        {!messagesQuery.isLoading && messages.length === 0 ? (
          <div className="rounded border border-black/10 bg-white p-4 text-sm text-ink/60">
            Nenhuma mensagem encontrada.
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onImageClick={setSelectedImageUrl}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-black/10 bg-white p-3"
      >
        {previewImageUrl ? (
          <div className="mb-3 flex items-center gap-3 rounded border border-black/10 bg-mist p-2">
            <img
              src={previewImageUrl}
              alt="Preview do anexo"
              className="h-16 w-16 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{imageFile?.name}</p>
              <p className="text-xs text-ink/55">
                {imageFile ? `${Math.ceil(imageFile.size / 1024)} KB` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleImageSend}
              className="rounded bg-sage px-3 py-2 text-sm font-semibold text-white transition hover:bg-sage/90"
            >
              Enviar imagem
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="rounded border border-black/10 p-2 text-ink/60 transition hover:bg-white"
              aria-label="Remover imagem"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded border border-black/10 p-3 text-ink/70 transition hover:bg-mist">
            <ImagePlus className="h-5 w-5" aria-hidden />
            <span className="sr-only">Anexar imagem</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            placeholder={`Mensagem para ${conversation.phone_number}`}
            className="min-h-12 flex-1 resize-none rounded border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20"
          />
          <button
            type="submit"
            disabled={mutation.isPending || !content.trim()}
            className="inline-flex min-h-12 items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden />
            Enviar
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={handleTestSend}
            className="min-h-12 rounded border border-black/10 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60"
          >
            Teste
          </button>
        </div>
        {status ? <p className="mt-2 text-sm text-ink/65">{status}</p> : null}
      </form>

      <ImagePreviewModal
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </section>
  );
}
