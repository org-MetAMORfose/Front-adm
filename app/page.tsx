"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ChatWindow } from "@/components/ChatWindow";
import { ConversationList } from "@/components/ConversationList";
import type { Conversation } from "@/types";

async function fetchConversations() {
  const response = await fetch("/api/admin/conversations", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as conversas.");
  }

  return (await response.json()) as { conversations: Conversation[] };
}

export default function HomePage() {
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: 5000
  });

  const conversations = data?.conversations ?? [];
  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.person_id === selectedPersonId
      ) ?? conversations[0],
    [conversations, selectedPersonId]
  );

  useEffect(() => {
    if (!selectedPersonId && conversations[0]) {
      setSelectedPersonId(conversations[0].person_id);
    }
  }, [conversations, selectedPersonId]);

  return (
    <main className="flex min-h-screen flex-col bg-mist text-ink">
      <header className="border-b border-black/10 bg-white px-4 py-3 shadow-subtle sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">MetaAmorfose Admin</h1>
            <p className="text-sm text-ink/60">
              Conversas, mídia recebida e aprovação de profissionais.
            </p>
          </div>
          <div className="rounded border border-black/10 bg-mist px-3 py-2 text-sm text-ink/70">
            Polling ativo
          </div>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
        <ConversationList
          conversations={conversations}
          error={error}
          isLoading={isLoading}
          selectedPersonId={selectedConversation?.person_id ?? null}
          onSelect={setSelectedPersonId}
        />
        <ChatWindow conversation={selectedConversation ?? null} />
      </section>
    </main>
  );
}
