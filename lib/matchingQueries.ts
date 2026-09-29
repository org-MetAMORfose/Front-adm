import "server-only";

import { prisma } from "@/lib/db";
import {
  getCycleStatus,
  getPendingPatients,
  isActiveCycle
} from "@/lib/matchingDomain";
import type {
  DistributionData,
  MatchingCycleType,
  ProfessionalDetail
} from "@/types/matching";

function cycleType(value: string): MatchingCycleType {
  return value === "REPLACEMENT" ? "REPLACEMENT" : "REGULAR";
}

export async function getDistributionData(): Promise<DistributionData> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [professionals, patients] = await Promise.all([
    prisma.professional.findMany({
      include: {
        person: true,
        matching_cycle: {
          include: {
            _count: { select: { matching_slot: true } }
          },
          orderBy: [{ deadline_at: "asc" }, { id: "asc" }]
        }
      },
      orderBy: [{ person: { name: "asc" } }, { id: "asc" }]
    }),
    prisma.patient.findMany({
      select: { person_id: true, created_at: true },
      orderBy: { created_at: "asc" }
    })
  ]);

  const firstPatientRegistration = new Map<number, Date>();
  for (const patient of patients) {
    if (!firstPatientRegistration.has(patient.person_id)) {
      firstPatientRegistration.set(patient.person_id, patient.created_at);
    }
  }

  let pendingConnections = 0;
  let dueNextSevenDays = 0;
  let overdueConnections = 0;
  let pendingReplacements = 0;
  const activeAreas = new Set<string>();

  const professionalItems = professionals.map((professional) => {
    const validCycles = professional.matching_cycle.filter(
      (cycle) => cycle.cancelled_at === null
    );
    const activeCycles = validCycles.filter((cycle) =>
      isActiveCycle(cycle, now)
    );

    if (activeCycles.length > 0) activeAreas.add(professional.area);

    let promised = 0;
    let delivered = 0;
    let pending = 0;
    let replacements = 0;
    let hasOverdue = false;
    const pendingDeadlines: Date[] = [];

    for (const cycle of validCycles) {
      const cycleDelivered = cycle._count.matching_slot;
      const cyclePending = getPendingPatients(
        cycle.promised_patients,
        cycleDelivered
      );

      promised += cycle.promised_patients;
      delivered += cycleDelivered;
      pending += cyclePending;

      if (cyclePending > 0) {
        pendingConnections += cyclePending;
        pendingDeadlines.push(cycle.deadline_at);

        if (cycle.deadline_at < now) {
          hasOverdue = true;
          overdueConnections += cyclePending;
        } else if (cycle.deadline_at <= sevenDaysAhead) {
          dueNextSevenDays += cyclePending;
        }

        if (cycle.type === "REPLACEMENT") {
          replacements += cyclePending;
          pendingReplacements += cyclePending;
        }
      }
    }

    const nextDeadline = pendingDeadlines.sort(
      (left, right) => left.getTime() - right.getTime()
    )[0];

    return {
      id: professional.id,
      person_id: professional.person_id,
      name: professional.person.name?.trim() || "Sem nome",
      phone_number: professional.person.phone_number,
      area: professional.area,
      professional_register: professional.professional_register,
      is_active: activeCycles.length > 0,
      has_regular_cycle: validCycles.some((cycle) => cycle.type === "REGULAR"),
      has_replacement_cycle: validCycles.some(
        (cycle) => cycle.type === "REPLACEMENT"
      ),
      promised_patients: promised,
      delivered_patients: delivered,
      pending_patients: pending,
      pending_replacements: replacements,
      next_deadline: nextDeadline?.toISOString() ?? null,
      has_overdue: hasOverdue
    };
  });

  return {
    metrics: {
      registered_professionals: professionals.length,
      active_professionals: professionalItems.filter((item) => item.is_active)
        .length,
      registered_patients: firstPatientRegistration.size,
      new_patients_last_7_days: [...firstPatientRegistration.values()].filter(
        (createdAt) => createdAt >= sevenDaysAgo
      ).length,
      pending_connections: pendingConnections,
      due_next_7_days: dueNextSevenDays,
      overdue_connections: overdueConnections,
      pending_replacements: pendingReplacements
    },
    professionals: professionalItems,
    active_areas: [...activeAreas].sort((left, right) =>
      left.localeCompare(right, "pt-BR")
    ),
    known_areas: [...new Set(professionals.map((professional) => professional.area))].sort(
      (left, right) => left.localeCompare(right, "pt-BR")
    ),
    generated_at: now.toISOString()
  };
}

export async function getProfessionalDetail(
  professionalId: number
): Promise<ProfessionalDetail | null> {
  const now = new Date();
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: {
      person: true,
      matching_cycle: {
        include: {
          matching_slot: {
            include: { patient: { include: { person: true } } },
            orderBy: [{ created_at: "desc" }, { id: "desc" }]
          }
        },
        orderBy: [{ deadline_at: "desc" }, { id: "desc" }]
      }
    }
  });

  if (!professional) return null;

  let promised = 0;
  let delivered = 0;
  let pending = 0;
  let replacements = 0;
  const pendingDeadlines: Date[] = [];

  const cycles = professional.matching_cycle.map((cycle) => {
    const cycleDelivered = cycle.matching_slot.length;
    const cyclePending = getPendingPatients(
      cycle.promised_patients,
      cycleDelivered
    );

    if (!cycle.cancelled_at) {
      promised += cycle.promised_patients;
      delivered += cycleDelivered;
      pending += cyclePending;

      if (cyclePending > 0) {
        pendingDeadlines.push(cycle.deadline_at);
        if (cycle.type === "REPLACEMENT") replacements += cyclePending;
      }
    }

    return {
      id: cycle.id,
      type: cycleType(cycle.type),
      promised_patients: cycle.promised_patients,
      delivered_patients: cycleDelivered,
      pending_patients: cyclePending,
      starts_at: cycle.starts_at.toISOString(),
      deadline_at: cycle.deadline_at.toISOString(),
      cancelled_at: cycle.cancelled_at?.toISOString() ?? null,
      created_at: cycle.created_at.toISOString(),
      status: getCycleStatus(
        cycle,
        cycle.promised_patients,
        cycleDelivered,
        now
      )
    };
  });

  const connections = professional.matching_cycle.flatMap((cycle) =>
    cycle.matching_slot.map((slot) => ({
      id: slot.id,
      cycle_id: cycle.id,
      cycle_type: cycleType(cycle.type),
      patient_id: slot.patient_id,
      patient_name: slot.patient.person.name?.trim() || "Sem nome",
      patient_phone: slot.patient.person.phone_number,
      compatibility_score: slot.compatibility_score,
      urgency_score: slot.urgency_score,
      final_score: slot.final_score,
      algorithm_version: slot.algorithm_version,
      created_at: slot.created_at.toISOString()
    }))
  );

  const nextDeadline = pendingDeadlines.sort(
    (left, right) => left.getTime() - right.getTime()
  )[0];

  return {
    id: professional.id,
    person_id: professional.person_id,
    name: professional.person.name?.trim() || "Sem nome",
    phone_number: professional.person.phone_number,
    cpf: professional.person.cpf,
    birth_date: professional.person.birth_date?.toISOString() ?? null,
    area: professional.area,
    professional_register: professional.professional_register,
    email: professional.email,
    approach: professional.approach,
    background: professional.background,
    video_platform: professional.video_platform,
    gender: professional.gender,
    minority_group: professional.minority_group,
    created_at: professional.created_at.toISOString(),
    is_active: professional.matching_cycle.some((cycle) =>
      isActiveCycle(cycle, now)
    ),
    promised_patients: promised,
    delivered_patients: delivered,
    pending_patients: pending,
    pending_replacements: replacements,
    next_deadline: nextDeadline?.toISOString() ?? null,
    cycles,
    connections
  };
}

export async function getProfessionalOptions() {
  const professionals = await prisma.professional.findMany({
    include: { person: true },
    orderBy: [{ person: { name: "asc" } }, { id: "asc" }]
  });

  return professionals.map((professional) => ({
    id: professional.id,
    person_id: professional.person_id,
    name: professional.person.name?.trim() || "Sem nome",
    phone_number: professional.person.phone_number,
    area: professional.area,
    professional_register: professional.professional_register
  }));
}
