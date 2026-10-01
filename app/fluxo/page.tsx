"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Eye, FilePenLine, GitBranch, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  createFlowDraft,
  discardFlowRevision,
  listFlowRevisions
} from "@/lib/chatbotFlowClient";
import type { FlowRevision } from "@/types/chatbotFlow";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function RevisionCard({ revision, published, onDiscard }: { revision: FlowRevision; published?: boolean; onDiscard?: (id: number) => void }) {
  const stale = revision.is_stale === true;
  return (
    <article className={`rounded-xl border bg-white p-5 shadow-subtle ${stale ? "border-amber-300 bg-amber-50/40" : "border-black/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${published ? "bg-sage/10 text-sage" : stale ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{published ? "PUBLICADO" : stale ? "OBSOLETO" : "DRAFT"}</span>
            {published ? <span className="text-sm font-semibold">Versão {revision.version}</span> : <span className="text-sm font-semibold">Revisão {revision.id}</span>}
          </div>
          <p className="mt-3 text-sm text-ink/60">Atualizado em {formatDate(revision.updated_at)}</p>
          {!published ? <p className="mt-1 text-xs text-ink/45">Baseado na revisão {revision.base_revision_id}</p> : null}
          {stale ? <p className="mt-3 flex items-center gap-2 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" />Uma publicação mais nova impede a edição deste draft.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(published || !stale) ? <Link href={`/fluxo/${revision.id}`} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${published ? "border border-sage/25 text-sage hover:bg-sage/5" : "bg-sage text-white hover:bg-sage/90"}`}>{published ? <Eye className="h-4 w-4" /> : <FilePenLine className="h-4 w-4" />}{published ? "Visualizar" : "Retomar"}</Link> : null}
          {!published && onDiscard ? <button type="button" onClick={() => onDiscard(revision.id)} className="inline-flex items-center gap-2 rounded-lg border border-coral/25 px-3 py-2 text-sm font-semibold text-coral hover:bg-coral/10"><Trash2 className="h-4 w-4" />Descartar</button> : null}
        </div>
      </div>
    </article>
  );
}

export default function FlowRevisionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["chatbot-flow", "revisions"], queryFn: listFlowRevisions, retry: false });
  const createDraft = useMutation({
    mutationFn: async () => {
      if (!query.data?.published) throw new Error("Não existe uma revisão publicada.");
      return createFlowDraft(query.data.published.id);
    },
    onSuccess: async (revision) => {
      await queryClient.invalidateQueries({ queryKey: ["chatbot-flow", "revisions"] });
      router.push(`/fluxo/${revision.id}`);
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Não foi possível criar o draft.")
  });

  async function discard(id: number) {
    if (!window.confirm("Descartar este draft e todas as alterações salvas nele?")) return;
    try {
      await discardFlowRevision(id);
      await queryClient.invalidateQueries({ queryKey: ["chatbot-flow", "revisions"] });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível descartar o draft.");
    }
  }

  const actions = <button type="button" disabled={!query.data?.published || createDraft.isPending} onClick={() => createDraft.mutate()} className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white transition hover:bg-sage/90 disabled:opacity-45"><Plus className="h-4 w-4" />{createDraft.isPending ? "Criando..." : "Criar draft"}</button>;

  return (
    <main className="min-h-screen bg-mist text-ink">
      <AdminHeader title="Fluxo do chatbot" description="Visualize a publicação atual e continue alterações em drafts." actions={actions} />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {notice ? <div className="flex items-center justify-between rounded-lg border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} className="font-semibold">Fechar</button></div> : null}
        {query.isLoading ? <div className="rounded-xl border border-black/10 bg-white p-10 text-center text-sm text-ink/55">Carregando revisões...</div> : null}
        {query.error ? <div className="rounded-xl border border-coral/25 bg-coral/10 p-5"><p className="font-semibold text-coral">Não foi possível carregar as revisões.</p><p className="mt-1 text-sm text-ink/60">{query.error.message}</p><button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-coral px-3 py-2 text-sm font-semibold text-white">Tentar novamente</button></div> : null}
        {query.data ? <>
          <section><div className="mb-3 flex items-center gap-2"><GitBranch className="h-5 w-5 text-sage" /><h2 className="font-semibold">Publicação atual</h2></div>{query.data.published ? <RevisionCard revision={query.data.published} published /> : <div className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-sm text-ink/50">Nenhuma publicação disponível.</div>}</section>
          <section><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-sage" /><h2 className="font-semibold">Drafts editáveis</h2></div><span className="text-xs text-ink/45">Mais recentes primeiro</span></div><div className="space-y-3">{query.data.drafts.filter((draft) => !draft.is_stale).map((draft) => <RevisionCard key={draft.id} revision={draft} onDiscard={(id) => void discard(id)} />)}{!query.data.drafts.some((draft) => !draft.is_stale) ? <div className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-sm text-ink/50">Nenhum draft em andamento.</div> : null}</div></section>
          {query.data.drafts.some((draft) => draft.is_stale) ? <section><div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-700" /><h2 className="font-semibold">Drafts obsoletos</h2></div><div className="space-y-3">{query.data.drafts.filter((draft) => draft.is_stale).map((draft) => <RevisionCard key={draft.id} revision={draft} onDiscard={(id) => void discard(id)} />)}</div></section> : null}
        </> : null}
      </div>
    </main>
  );
}
