"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  Clock3,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  UserPlus,
  Users
} from "lucide-react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { Modal } from "@/components/admin/Modal";
import { CycleForm } from "@/components/matching/CycleForm";
import { MetricCard } from "@/components/matching/MetricCard";
import { PatientForm } from "@/components/matching/PatientForm";
import { ProfessionalForm } from "@/components/matching/ProfessionalForm";
import { ProfessionalSummary } from "@/components/matching/ProfessionalSummary";
import { ProfessionalTable } from "@/components/matching/ProfessionalTable";
import { withBasePath } from "@/lib/basePath";
import { normalizeSearch } from "@/lib/matchingDomain";
import type {
  DistributionData,
  ProfessionalDistributionItem
} from "@/types/matching";

type ModalName = "patient" | "professional" | "cycle" | null;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "OVERDUE";
type TypeFilter = "ALL" | "REGULAR" | "REPLACEMENT";
type SortOption = "DEADLINE" | "NAME" | "PENDING";

async function fetchDistribution() {
  const response = await fetch(withBasePath("/api/admin/distribution"), {
    cache: "no-store"
  });
  const body = (await response.json()) as DistributionData & { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível carregar a distribuição.");
  return body;
}

export default function DistributionPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [cycleType, setCycleType] = useState<TypeFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("DEADLINE");
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["distribution"],
    queryFn: fetchDistribution,
    refetchInterval: 30_000
  });

  const professionals = useMemo(() => {
    const normalized = normalizeSearch(search);
    return [...(query.data?.professionals ?? [])]
      .filter((professional) => {
        const matchesSearch = normalizeSearch(
          `${professional.name} ${professional.area} ${professional.phone_number} ${professional.professional_register}`
        ).includes(normalized);
        const matchesStatus =
          status === "ALL" ||
          (status === "ACTIVE" && professional.is_active) ||
          (status === "INACTIVE" && !professional.is_active) ||
          (status === "OVERDUE" && professional.has_overdue);
        const matchesType =
          cycleType === "ALL" ||
          (cycleType === "REGULAR" && professional.has_regular_cycle) ||
          (cycleType === "REPLACEMENT" && professional.has_replacement_cycle);
        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((left, right) => {
        if (sort === "NAME") return left.name.localeCompare(right.name, "pt-BR");
        if (sort === "PENDING") return right.pending_patients - left.pending_patients || left.name.localeCompare(right.name, "pt-BR");
        if (!left.next_deadline) return 1;
        if (!right.next_deadline) return -1;
        return left.next_deadline.localeCompare(right.next_deadline) || left.name.localeCompare(right.name, "pt-BR");
      });
  }, [cycleType, query.data?.professionals, search, sort, status]);

  useEffect(() => {
    if (professionals.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!professionals.some((professional) => professional.id === selectedId)) {
      setSelectedId(professionals[0].id);
    }
  }, [professionals, selectedId]);

  const selected = professionals.find(
    (professional) => professional.id === selectedId
  ) ?? null;

  async function changed(message: string) {
    setModal(null);
    setNotice(message);
    await queryClient.invalidateQueries({ queryKey: ["distribution"] });
  }

  const actions = (
    <>
      <button type="button" onClick={() => setModal("patient")} className="inline-flex items-center gap-2 rounded-lg border border-sage/25 bg-white px-3 py-2 text-sm font-semibold text-sage transition hover:bg-sage/5">
        <UserPlus className="h-4 w-4" aria-hidden />Adicionar paciente
      </button>
      <button type="button" onClick={() => setModal("professional")} className="inline-flex items-center gap-2 rounded-lg border border-sage/25 bg-white px-3 py-2 text-sm font-semibold text-sage transition hover:bg-sage/5">
        <Plus className="h-4 w-4" aria-hidden />Adicionar profissional
      </button>
      <button type="button" onClick={() => setModal("cycle")} className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white transition hover:bg-sage/90">
        <CalendarPlus className="h-4 w-4" aria-hidden />Novo ciclo
      </button>
    </>
  );

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-mist text-ink">
      <AdminHeader title="Distribuição de pacientes" description="Cadastros, compromissos e conexões da rede." actions={actions} />

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-6 lg:px-8">
        {notice ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="font-semibold">Fechar</button>
          </div>
        ) : null}

        {query.isLoading ? (
          <div className="rounded-xl border border-black/10 bg-white p-10 text-center text-sm text-ink/55">Carregando indicadores e profissionais...</div>
        ) : null}

        {query.error ? (
          <div className="rounded-xl border border-coral/25 bg-coral/10 p-5">
            <p className="font-semibold text-coral">Não foi possível carregar o painel.</p>
            <p className="mt-1 text-sm text-ink/60">{query.error.message}</p>
            <button type="button" onClick={() => query.refetch()} className="mt-3 rounded-lg bg-coral px-3 py-2 text-sm font-semibold text-white">Tentar novamente</button>
          </div>
        ) : null}

        {query.data ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <section aria-label="Indicadores de cadastros" className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Profissionais cadastrados" value={query.data.metrics.registered_professionals} icon={Users} />
              <MetricCard label="Profissionais ativos" value={query.data.metrics.active_professionals} note="Com ciclo vigente agora" icon={UserCheck} tone="positive" />
              <MetricCard label="Pacientes cadastrados" value={query.data.metrics.registered_patients} icon={Users} />
              <MetricCard label="Novos pacientes" value={query.data.metrics.new_patients_last_7_days} note="Últimos 7 dias corridos" icon={UserPlus} tone="positive" />
            </section>

            <section aria-label="Indicadores de entregas" className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Conexões pendentes" value={query.data.metrics.pending_connections} icon={Clock3} />
              <MetricCard label="Próximos 7 dias" value={query.data.metrics.due_next_7_days} icon={CalendarClock} />
              <MetricCard label="Atrasadas" value={query.data.metrics.overdue_connections} icon={AlertTriangle} tone="warning" />
              <MetricCard label="Reposições a entregar" value={query.data.metrics.pending_replacements} icon={RotateCcw} tone="warning" />
            </section>

            <section className="grid min-h-0 flex-1 items-stretch gap-3 overflow-y-auto xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] xl:overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <section className="shrink-0 rounded-xl border border-black/10 bg-white p-3 shadow-subtle">
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(180px,1fr)_150px_140px_180px]">
                <label className="relative">
                  <span className="sr-only">Buscar profissional</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar profissional" className="w-full rounded-lg border border-black/15 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20" />
                </label>
                <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-sage">
                  <option value="ALL">Todas as situações</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Sem ciclo ativo</option><option value="OVERDUE">Com atraso</option>
                </select>
                <select value={cycleType} onChange={(event) => setCycleType(event.target.value as TypeFilter)} className="rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-sage">
                  <option value="ALL">Todos os tipos</option><option value="REGULAR">Regular</option><option value="REPLACEMENT">Reposição</option>
                </select>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-sage">
                  <option value="DEADLINE">Prazo mais próximo</option><option value="PENDING">Maior saldo</option><option value="NAME">Nome</option>
                </select>
              </div>
            </section>

            <section className="min-h-0 flex-1">
              <ProfessionalTable professionals={professionals} selectedId={selectedId} onSelect={(professional: ProfessionalDistributionItem) => setSelectedId(professional.id)} />
            </section>
              </div>
              <div className="min-h-0 overflow-y-auto">
                {selected ? <ProfessionalSummary professional={selected} /> : (
                  <div className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-ink/50">Selecione um profissional para ver o resumo.</div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <Modal open={modal === "patient"} title="Adicionar pacientes" description="Cadastre individualmente ou cole uma lista do Google Sheets." onClose={() => setModal(null)}>
        <PatientForm activeAreas={query.data?.active_areas ?? []} onCancel={() => setModal(null)} onSuccess={() => void changed("Pacientes enviados para a Lambda de matching.")} />
      </Modal>
      <Modal open={modal === "professional"} title="Adicionar profissional" description="Dados pessoais e profissionais serão enviados ao chatbot." onClose={() => setModal(null)}>
        <ProfessionalForm knownAreas={query.data?.known_areas ?? []} onCancel={() => setModal(null)} onSuccess={() => void changed("Profissional encaminhado ao chatbot para cadastro.")} />
      </Modal>
      <Modal open={modal === "cycle"} title="Criar novo ciclo" description="Defina a quantidade e o prazo do compromisso." onClose={() => setModal(null)}>
        <CycleForm professionals={query.data?.professionals ?? []} onCancel={() => setModal(null)} onSuccess={() => void changed("Ciclo criado com sucesso.")} />
      </Modal>
    </main>
  );
}
