"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  MessageSquareText,
  RotateCcw,
  Users
} from "lucide-react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Modal } from "@/components/admin/Modal";
import { CycleForm } from "@/components/matching/CycleForm";
import { CycleTable } from "@/components/matching/CycleTable";
import { MetricCard } from "@/components/matching/MetricCard";
import { PatientConnectionsTable } from "@/components/matching/PatientConnectionsTable";
import { ProfessionalStatusBadge } from "@/components/matching/StatusBadge";
import { withBasePath } from "@/lib/basePath";
import { formatDate, PROFESSIONAL_BACKGROUND_MAX_LENGTH } from "@/lib/matchingDomain";
import { displayBrazilianPhone } from "@/lib/phone";
import type { MatchingCycleView, ProfessionalDetail, ProfessionalOption } from "@/types/matching";

type Tab = "OVERVIEW" | "CYCLES" | "CONNECTIONS" | "REPLACEMENTS" | "BACKGROUND";

async function fetchProfessional(id: number) {
  const response = await fetch(withBasePath(`/api/admin/professionals/${id}`), {
    cache: "no-store"
  });
  const body = (await response.json()) as {
    professional?: ProfessionalDetail;
    error?: string;
  };
  if (!response.ok || !body.professional) {
    throw new Error(body.error || "Não foi possível carregar o profissional.");
  }
  return body.professional;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink/75">{value || "--"}</dd>
    </div>
  );
}

export default function ProfessionalDetailPage() {
  const params = useParams<{ professionalId: string }>();
  const professionalId = Number(params.professionalId);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [cycleModal, setCycleModal] = useState(false);
  const [cancellingCycleId, setCancellingCycleId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["professional", professionalId],
    queryFn: () => fetchProfessional(professionalId),
    enabled: Number.isInteger(professionalId) && professionalId > 0
  });

  const professional = query.data;
  const background = professional?.background?.slice(
    0, PROFESSIONAL_BACKGROUND_MAX_LENGTH
  ) ?? "";
  const option: ProfessionalOption | null = professional
    ? {
        id: professional.id,
        person_id: professional.person_id,
        name: professional.name,
        phone_number: professional.phone_number,
        area: professional.area,
        professional_register: professional.professional_register
      }
    : null;

  async function cycleCreated() {
    setCycleModal(false);
    setNotice("Ciclo criado com sucesso.");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["professional", professionalId] }),
      queryClient.invalidateQueries({ queryKey: ["distribution"] })
    ]);
  }

  async function cancelCycle(cycle: MatchingCycleView) {
    if (!window.confirm(`Deseja excluir o ciclo #${cycle.id}? Ele será apenas marcado como excluído.`)) {
      return;
    }

    setCancellingCycleId(cycle.id);
    setNotice(null);

    try {
      const response = await fetch(
        withBasePath(`/api/admin/matching-cycles/${cycle.id}`),
        { method: "DELETE" }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Não foi possível excluir o ciclo.");
      }

      setNotice("Ciclo marcado como excluído.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["professional", professionalId] }),
        queryClient.invalidateQueries({ queryKey: ["distribution"] })
      ]);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Erro inesperado.");
    } finally {
      setCancellingCycleId(null);
    }
  }

  const actions = professional ? (
    <>
      <Link href={`/?personId=${professional.person_id}`} className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-ink/65 transition hover:bg-mist">
        <MessageSquareText className="h-4 w-4" aria-hidden />Abrir conversa
      </Link>
      <button type="button" onClick={() => setCycleModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white transition hover:bg-sage/90">
        <CalendarPlus className="h-4 w-4" aria-hidden />Novo ciclo
      </button>
    </>
  ) : null;

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-mist text-ink">
      <AdminHeader title={professional?.name ?? "Detalhes do profissional"} description={professional ? `${professional.area} · ${displayBrazilianPhone(professional.phone_number)}` : "Ciclos, conexões e compromissos."} actions={actions} />

      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/distribuicao" className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-ink/55 hover:text-sage">
          <ArrowLeft className="h-4 w-4" aria-hidden />Voltar para distribuição
        </Link>

        {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}
        {query.isLoading ? <div className="rounded-xl border border-black/10 bg-white p-10 text-center text-sm text-ink/55">Carregando profissional...</div> : null}
        {query.error ? (
          <div className="rounded-xl border border-coral/25 bg-coral/10 p-5">
            <p className="font-semibold text-coral">Não foi possível abrir o profissional.</p>
            <p className="mt-1 text-sm text-ink/60">{query.error.message}</p>
          </div>
        ) : null}

        {professional ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <section className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-4 shadow-subtle">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold">{professional.name}</h2>
                  <ProfessionalStatusBadge active={professional.is_active} overdue={professional.cycles.some((cycle) => cycle.status === "OVERDUE")} />
                </div>
                <p className="mt-1 text-sm text-ink/55">{professional.area}</p>
              </div>
            </section>

            <section className="grid shrink-0 gap-3 sm:grid-cols-3">
              <MetricCard label="Entregas" value={professional.delivered_patients} note={`Meta acumulada: ${professional.promised_patients}`} icon={Users} tone="positive" />
              <MetricCard label="Conexões pendentes" value={professional.pending_patients} icon={CalendarClock} />
              <MetricCard label="Reposições pendentes" value={professional.pending_replacements} note={`Próximo prazo: ${formatDate(professional.next_deadline)}`} icon={RotateCcw} tone="warning" />
            </section>

            <div className="shrink-0 overflow-x-auto border-b border-black/10">
              <nav className="flex min-w-max gap-1" aria-label="Detalhes do profissional">
                {([
                  ["OVERVIEW", "Visão geral"],
                  ["CYCLES", "Ciclos"],
                  ["CONNECTIONS", "Pacientes"],
                  ["REPLACEMENTS", "Reposições"],
                  ["BACKGROUND", "Background"]
                ] as Array<[Tab, string]>).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === value ? "border-sage text-sage" : "border-transparent text-ink/50 hover:text-ink"}`}>
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {tab === "OVERVIEW" ? (
              <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <section className="rounded-xl border border-black/10 bg-white p-5 shadow-subtle">
                  <h3 className="font-semibold">Cadastro</h3>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <Field label="Telefone" value={displayBrazilianPhone(professional.phone_number)} />
                    <Field label="E-mail" value={professional.email} />
                    <Field label="CPF" value={professional.cpf} />
                    <Field label="Nascimento" value={professional.birth_date ? formatDate(professional.birth_date) : null} />
                    <Field label="Abordagem" value={professional.approach} />
                    <Field label="Gênero" value={professional.gender} />
                    <Field label="Grupo minoritário" value={professional.minority_group} />
                    <Field label="Plataforma de vídeo" value={professional.video_platform} />
                  </dl>
                </section>
                <section className="space-y-3">
                  <div className="flex items-center justify-between"><h3 className="font-semibold">Ciclos recentes</h3><button type="button" onClick={() => setTab("CYCLES")} className="text-sm font-semibold text-sage">Ver todos</button></div>
                  <CycleTable cycles={professional.cycles.slice(0, 3)} onCancel={(cycle) => void cancelCycle(cycle)} cancellingId={cancellingCycleId} />
                </section>
              </div>
            ) : null}

            {tab === "CYCLES" ? <CycleTable cycles={professional.cycles} onCancel={(cycle) => void cancelCycle(cycle)} cancellingId={cancellingCycleId} /> : null}
            {tab === "REPLACEMENTS" ? <CycleTable cycles={professional.cycles.filter((cycle) => cycle.type === "REPLACEMENT")} onCancel={(cycle) => void cancelCycle(cycle)} cancellingId={cancellingCycleId} /> : null}

            {tab === "BACKGROUND" ? (
              <section className="rounded-xl border border-black/10 bg-white p-5 shadow-subtle">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-ink">Formação e experiência</h3>
                    <p className="mt-1 text-xs text-ink/45">
                      {background.length} / {PROFESSIONAL_BACKGROUND_MAX_LENGTH} caracteres
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Cadastrado em</p>
                    <p className="mt-1 text-sm font-medium text-ink">{formatDate(professional.created_at)}</p>
                  </div>
                </div>
                <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-ink/75">{background || "Nenhum background informado para este profissional."}</p>
              </section>
            ) : null}

            {tab === "CONNECTIONS" ? (
              <PatientConnectionsTable connections={professional.connections} professionalPhone={professional.phone_number} />
            ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <Modal open={cycleModal} title="Criar ciclo" description={professional ? `Novo compromisso para ${professional.name}.` : undefined} onClose={() => setCycleModal(false)}>
        <CycleForm professionals={option ? [option] : []} initialProfessionalId={professionalId} onCancel={() => setCycleModal(false)} onSuccess={() => void cycleCreated()} />
      </Modal>
    </main>
  );
}
