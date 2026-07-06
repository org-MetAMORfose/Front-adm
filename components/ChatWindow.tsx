"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { MessageBubble } from "@/components/MessageBubble";
import { ProfessionalCard } from "@/components/ProfessionalCard";
import { sendImageMessage } from "@/lib/imageSender";
import type { ChatMode, ChatState, Conversation, Message, Professional } from "@/types";

type Props = {
  conversation: Conversation | null;
};

const CHAT_STATE_SELECT_STYLES: Record<ChatState, string> = {
  FEEDBACK: "border-emerald-200 bg-emerald-100 text-emerald-800",
  QUESTION: "border-rose-200 bg-rose-100 text-rose-800",
  PROFESSIONAL_SUPPORT: "border-slate-200 bg-slate-100 text-slate-800",
  NEW_PATIENT: "border-sky-200 bg-sky-100 text-sky-800",
  PAYMENT_RENEWAL: "border-amber-200 bg-amber-100 text-amber-800",
  PROFESSIONAL_REGISTRATION: "border-violet-200 bg-violet-100 text-violet-800"
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

async function sendMessage(payload: {
  person_id: number;
  phone_number: string;
  content: string;
}) {
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

type StateUpdate =
  | { chat_mode: ChatMode }
  | { chat_state: ChatState | null };

async function updateConversationState(personId: number, update: StateUpdate) {
  const response = await fetch(`/api/admin/conversations/${personId}/state`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(update)
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Falha ao atualizar o estado da conversa.");
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

  const stateMutation = useMutation({
    mutationFn: (update: StateUpdate) =>
      updateConversationState(personId as number, update),
    onSuccess: async () => {
      setStatus("Estado da conversa atualizado.");
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
      person_id: conversation.person_id,
      phone_number: conversation.phone_number,
      content: content.trim()
    });
  }

  function handleStateChange(value: string) {
    setStatus(null);
    stateMutation.mutate({
      chat_state: value === "state:none" ? null : (value.slice(6) as ChatState)
    });
  }

  function handleModeToggle() {
    if (!conversation) return;

    setStatus(null);
    stateMutation.mutate({
      chat_mode: conversation.chat_mode === "MANUAL" ? "AUTOMATIC" : "MANUAL"
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
        personId: conversation.person_id,
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

  const isManual = conversation.chat_mode === "MANUAL";
  const stateSelectStyle = conversation.chat_state
    ? CHAT_STATE_SELECT_STYLES[conversation.chat_state]
    : "border-black/10 bg-white text-ink/70";

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
              {conversation.chat_mode === "MANUAL" ? "Manual" : "Automático"} ·{" "}
              {conversation.chat_state ?? "Sem etapa"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink/70">
              <span>Modo manual</span>
              <button
                type="button"
                role="switch"
                aria-checked={isManual}
                aria-label="Alternar modo manual"
                disabled={stateMutation.isPending}
                onClick={handleModeToggle}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isManual ? "bg-sage" : "bg-black/20"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    isManual ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
            <span className="rounded border border-black/10 px-3 py-1 text-xs font-medium text-ink/60">
              Pessoa #{conversation.person_id}
            </span>
          </div>
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
              disabled={!isManual}
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
          <label className={`inline-flex items-center justify-center rounded border border-black/10 p-3 text-ink/70 transition ${isManual ? "cursor-pointer hover:bg-mist" : "cursor-not-allowed opacity-50"}`}>
            <ImagePlus className="h-5 w-5" aria-hidden />
            <span className="sr-only">Anexar imagem</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={!isManual}
            />
          </label>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            placeholder={`Mensagem para ${conversation.phone_number}`}
            disabled={!isManual}
            className="min-h-12 flex-1 resize-none rounded border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/20"
          />
          <button
            type="submit"
            disabled={!isManual || mutation.isPending || !content.trim()}
            className="inline-flex min-h-12 items-center gap-2 rounded bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden />
            Enviar
          </button>
          <select
            aria-label="Alterar etapa da conversa"
            value=""
            disabled={stateMutation.isPending}
            onChange={(event) => handleStateChange(event.target.value)}
            className={`min-h-12 rounded border px-3 py-2 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-sage/20 disabled:cursor-not-allowed disabled:opacity-60 ${stateSelectStyle}`}
          >
            <option value="" disabled>Alterar etapa</option>
            <option value="state:none">Sem etapa</option>
            <option value="state:FEEDBACK">Feedback</option>
            <option value="state:QUESTION">Dúvidas</option>
            <option value="state:PROFESSIONAL_SUPPORT">Suporte profissional</option>
            <option value="state:NEW_PATIENT">Novo paciente</option>
            <option value="state:PAYMENT_RENEWAL">Reposição</option>
            <option value="state:PROFESSIONAL_REGISTRATION">Seleção profissional</option>
          </select>
        </div>
        {!isManual ? (
          <p className="mt-2 text-sm text-amber-700">
            Selecione o modo Manual para enviar mensagens.
          </p>
        ) : null}
        {status ? <p className="mt-2 text-sm text-ink/65">{status}</p> : null}
      </form>

      <ImagePreviewModal
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </section>
  );
}
