"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { addFaqQuestion, createFaqGroup, deleteFaqGroup, deleteFaqQuestion, listFaqGroups, updateFaqGroup } from "@/lib/faqClient";
import type { FaqGroup } from "@/types/faq";

const inputClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/15";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function CreateGroupDialog({ pending, onClose, onCreate }: {
  pending: boolean;
  onClose: () => void;
  onCreate: (answer: string, questions: string[]) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [questions, setQuestions] = useState([""]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedQuestions = questions.map((question) => question.trim()).filter(Boolean);
    if (!answer.trim() || normalizedQuestions.length === 0) return;
    onCreate(answer.trim(), normalizedQuestions);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4" role="dialog" aria-modal="true" aria-labelledby="new-faq-title">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-black/10 p-5">
          <div><h2 id="new-faq-title" className="text-lg font-semibold">Novo grupo de perguntas</h2><p className="mt-1 text-sm text-ink/55">Todas as perguntas usarão a mesma resposta oficial.</p></div>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg p-2 text-ink/45 hover:bg-mist" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-5">
          <label className="block text-sm font-semibold text-ink/70">Resposta oficial<textarea autoFocus rows={5} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Digite a resposta que o chatbot deve enviar" className={`mt-2 resize-y ${inputClass}`} /></label>
          <section>
            <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Perguntas equivalentes</h3><p className="text-xs text-ink/45">Adicione formas diferentes de perguntar a mesma coisa.</p></div><button type="button" onClick={() => setQuestions((current) => [...current, ""])} className="inline-flex items-center gap-1 rounded-lg border border-sage/25 px-2.5 py-1.5 text-xs font-semibold text-sage hover:bg-sage/5"><Plus className="h-3.5 w-3.5" />Pergunta</button></div>
            <div className="mt-3 space-y-2">
              {questions.map((question, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input value={question} onChange={(event) => setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Pergunta ${index + 1}`} className={inputClass} />
                  <button type="button" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-coral hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Remover pergunta ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 p-5"><button type="button" onClick={onClose} disabled={pending} className="rounded-lg border border-black/15 px-4 py-2 text-sm font-semibold text-ink/65 hover:bg-mist">Cancelar</button><button type="submit" disabled={pending || !answer.trim() || !questions.some((question) => question.trim())} className="rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-45">{pending ? "Criando..." : "Criar grupo"}</button></div>
      </form>
    </div>
  );
}

function GroupAnswerCell({ group, busy, onUpdate, onAddQuestion, onDeleteGroup }: {
  group: FaqGroup;
  busy: boolean;
  onUpdate: (answer: string) => void;
  onAddQuestion: (question: string) => void;
  onDeleteGroup: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(group.answer);
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");

  return (
    <div className="min-w-80 space-y-3">
      {editing ? (
        <form onSubmit={(event) => { event.preventDefault(); if (!answer.trim()) return; onUpdate(answer.trim()); setEditing(false); }}>
          <textarea autoFocus rows={5} value={answer} onChange={(event) => setAnswer(event.target.value)} className={`${inputClass} resize-y`} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setAnswer(group.answer); setEditing(false); }} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold hover:bg-mist">Cancelar</button>
            <button type="submit" disabled={busy || !answer.trim() || answer.trim() === group.answer} className="rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Salvar resposta</button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{group.answer}</p>
      )}

      {adding ? (
        <form onSubmit={(event) => { event.preventDefault(); if (!question.trim()) return; onAddQuestion(question.trim()); setQuestion(""); setAdding(false); }} className="rounded-lg border border-dashed border-sage/30 bg-white p-3">
          <input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Digite a nova pergunta" className={inputClass} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setQuestion(""); }} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold hover:bg-mist">Cancelar</button>
            <button type="submit" disabled={busy || !question.trim()} className="rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Adicionar</button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-1 border-t border-black/10 pt-2">
        <button type="button" disabled={busy} onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-sage hover:bg-sage/10 disabled:opacity-40"><Pencil className="h-3.5 w-3.5" />Editar</button>
        <button type="button" disabled={busy} onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-sage hover:bg-sage/10 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Pergunta</button>
        <button type="button" disabled={busy} onClick={onDeleteGroup} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-coral hover:bg-coral/10 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Grupo</button>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["faq", "groups"], queryFn: listFaqGroups, retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["faq", "groups"] });
  const mutationOptions = { onSuccess: () => { setNotice(null); void refresh(); }, onError: (error: unknown) => setNotice(errorMessage(error)) };
  const createMutation = useMutation({ mutationFn: ({ answer, questions }: { answer: string; questions: string[] }) => createFaqGroup(answer, questions), ...mutationOptions, onSuccess: () => { setShowCreate(false); mutationOptions.onSuccess(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, answer }: { id: number; answer: string }) => updateFaqGroup(id, answer), ...mutationOptions });
  const addMutation = useMutation({ mutationFn: ({ id, question }: { id: number; question: string }) => addFaqQuestion(id, question), ...mutationOptions });
  const deleteQuestionMutation = useMutation({ mutationFn: deleteFaqQuestion, ...mutationOptions });
  const deleteGroupMutation = useMutation({ mutationFn: deleteFaqGroup, ...mutationOptions });
  const busy = createMutation.isPending || updateMutation.isPending || addMutation.isPending || deleteQuestionMutation.isPending || deleteGroupMutation.isPending;

  const groups = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return query.data?.groups ?? [];
    return (query.data?.groups ?? []).flatMap((group) => {
      if (group.answer.toLocaleLowerCase("pt-BR").includes(term)) return [group];
      return group.questions.some((item) => item.question.toLocaleLowerCase("pt-BR").includes(term))
        ? [group]
        : [];
    });
  }, [query.data, search]);
  const questionCount = query.data?.groups.reduce((count, group) => count + group.questions.length, 0) ?? 0;

  const actions = <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white hover:bg-sage/90"><Plus className="h-4 w-4" />Novo grupo</button>;
  return (
    <main className="min-h-screen bg-mist text-ink">
      <AdminHeader title="FAQ do chatbot" description="Consulte perguntas e respostas oficiais em uma única tabela." actions={actions} />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {notice ? <div className="mb-4 flex items-center justify-between rounded-lg border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} className="font-semibold">Fechar</button></div> : null}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-64 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por pergunta ou resposta" className={`${inputClass} pl-9`} /></label>
          {query.data ? <span className="text-sm text-ink/45">{questionCount} {questionCount === 1 ? "pergunta" : "perguntas"} · {query.data.groups.length} {query.data.groups.length === 1 ? "resposta" : "respostas"}</span> : null}
        </div>
        {query.isLoading ? <div className="rounded-xl border border-black/10 bg-white p-10 text-center text-sm text-ink/55">Carregando FAQ...</div> : null}
        {query.error ? <div className="rounded-xl border border-coral/25 bg-coral/10 p-5"><p className="font-semibold text-coral">Não foi possível carregar o FAQ.</p><p className="mt-1 text-sm text-ink/60">{errorMessage(query.error)}</p><button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-coral px-3 py-2 text-sm font-semibold text-white">Tentar novamente</button></div> : null}
        {query.data && groups.length ? (
          <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-subtle">
            <table className="w-full min-w-[760px] table-fixed border-collapse">
              <thead><tr className="border-b border-black/10 bg-mist/70 text-left text-xs font-bold uppercase tracking-wide text-ink/45"><th className="w-1/2 px-5 py-3">Pergunta</th><th className="w-1/2 border-l border-black/10 px-5 py-3">Resposta</th></tr></thead>
              <tbody>{groups.flatMap((group) => group.questions.map((item, index) => (
                <tr key={item.id} className="border-b border-black/10 last:border-b-0 hover:bg-mist/25">
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage/10 text-[11px] font-bold text-sage">?</span><p className="min-w-0 flex-1 text-sm leading-relaxed">{item.question}</p><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Apagar a pergunta “${item.question}”?\n\nO histórico de atendimentos será preservado.`)) deleteQuestionMutation.mutate(item.id); }} className="rounded-lg p-1.5 text-ink/30 hover:bg-coral/10 hover:text-coral disabled:opacity-40" aria-label="Apagar pergunta"><Trash2 className="h-4 w-4" /></button></div>
                  </td>
                  {index === 0 ? <td rowSpan={group.questions.length} className="border-l border-black/10 bg-sage/[0.025] px-5 py-4 align-top"><GroupAnswerCell group={group} busy={busy} onUpdate={(answer) => updateMutation.mutate({ id: group.id, answer })} onAddQuestion={(question) => addMutation.mutate({ id: group.id, question })} onDeleteGroup={() => { if (window.confirm(`Apagar esta resposta e suas ${group.questions.length} pergunta(s)?\n\nO histórico será preservado, mas elas deixarão de responder novas dúvidas.`)) deleteGroupMutation.mutate(group.id); }} /></td> : null}
                </tr>
              )))}</tbody>
            </table>
          </div>
        ) : null}
        {query.data && !groups.length ? <div className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center"><CircleHelp className="mx-auto h-8 w-8 text-ink/25" /><p className="mt-3 font-semibold">{search ? "Nenhum resultado encontrado" : "Nenhuma pergunta cadastrada"}</p><p className="mt-1 text-sm text-ink/45">{search ? "Tente buscar por outro termo." : "Crie a primeira resposta com suas perguntas equivalentes."}</p>{!search ? <button type="button" onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Criar grupo</button> : null}</div> : null}
      </div>
      {showCreate ? <CreateGroupDialog pending={createMutation.isPending} onClose={() => setShowCreate(false)} onCreate={(answer, questions) => createMutation.mutate({ answer, questions })} /> : null}
    </main>
  );
}
