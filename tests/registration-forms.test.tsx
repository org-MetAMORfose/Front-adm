// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatientForm } from "@/components/matching/PatientForm";
import { PatientBatchForm } from "@/components/matching/PatientBatchForm";
import { ProfessionalEditForm } from "@/components/matching/ProfessionalEditForm";
import { ProfessionalForm } from "@/components/matching/ProfessionalForm";
import { ProfessionalSummary } from "@/components/matching/ProfessionalSummary";
import type { ProfessionalDetail } from "@/types/matching";

function successfulFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true })
  });
  vi.stubGlobal("React", React);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestBody(fetchMock: ReturnType<typeof successfulFetch>) {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as Record<string, unknown>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registration forms", () => {
  it("previews and submits spreadsheet preferences without payment or identity", async () => {
    const fetchMock = successfulFetch();
    render(<PatientBatchForm activeAreas={["Psicoterapia"]} knownAreas={["Psicoterapia"]} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Linhas da planilha *"), { target: { value:
      ["19/10/2026 20:45:15", "Ana Souza", "", "5511999999999", "Psicoterapia", "", "", "", "", "",
        "Até R$150", "01/01/2000", "Negro", "Não binário", "Psicoterapia TCC", "Declaro que as informações são verdadeiras", "", '"LGBTQIAPN+,\nLuto"', "", ""].join("\t")
    } });
    expect(screen.getByText("LGBTQIAPN+, Luto")).toBeTruthy();
    expect(screen.getByText("Negra")).toBeTruthy();
    expect(screen.getByText("Não binário")).toBeTruthy();
    expect(screen.getByLabelText("Linhas da planilha *").getAttribute("wrap")).toBe("soft");
    fireEvent.click(screen.getByRole("button", { name: "Enviar 1 paciente(s)" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(requestBody(fetchMock)).toEqual({ patients: [{
      name: "Ana Souza", phone_number: "5511999999999", area: "Psicoterapia", birth_date: "2000-01-01",
      psychotherapy_approach: "TCC", psychotherapy_specialties: ["LGBTQIAPN+", "Luto"],
      preferred_gender: "Não binário", preferred_race: "Negra"
    }] });
  });
  it("sends patient psychotherapy preferences using null and arrays correctly", async () => {
    const fetchMock = successfulFetch();
    render(
      <PatientForm
        activeAreas={["Psicoterapia"]}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Nome completo *"), { target: { value: "Ana Souza" } });
    fireEvent.change(screen.getByLabelText("Celular *"), { target: { value: "11999999999" } });
    fireEvent.change(screen.getByLabelText("Área desejada *"), { target: { value: "Psicoterapia" } });
    for (const specialty of [
      "Autismo",
      "TDAH",
      "Transtorno Bipolar",
      "Transtorno de Personalidade Borderline",
      "Ansiedade",
      "Depressão"
    ]) {
      expect(screen.getByRole("checkbox", { name: specialty })).toBeTruthy();
    }
    fireEvent.change(screen.getByLabelText("Abordagem"), { target: { value: "TCC" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Autismo" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Transtorno Bipolar" }));
    fireEvent.change(screen.getByLabelText("Gênero"), { target: { value: "Mulher" } });
    fireEvent.change(screen.getByLabelText("Autodeclaração do profissional"), { target: { value: "Negra" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "LGBTQIAPN+" }));
    fireEvent.change(screen.getByLabelText("Outra especialidade"), { target: { value: "Luto" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar especialidade" }));
    expect(screen.queryByLabelText("Profissional LGBTQIAPN+")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar paciente" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(requestBody(fetchMock)).toMatchObject({
      area: "Psicoterapia",
      psychotherapy_approach: "TCC",
      psychotherapy_specialties: ["Autismo", "Transtorno Bipolar", "LGBTQIAPN+", "Luto"],
      preferred_gender: "Mulher",
      preferred_race: "Negra"
    });
    expect(requestBody(fetchMock)).not.toHaveProperty("prefers_lgbtqiapn_plus");
  });

  it("uses the first matching area as area and sends every other area in areas", async () => {
    const fetchMock = successfulFetch();
    render(
      <ProfessionalForm
        knownAreas={["Clínico geral", "Psiquiatria"]}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Nome completo *"), { target: { value: "Carla Lima" } });
    fireEvent.change(screen.getByLabelText("Celular *"), { target: { value: "11988887777" } });
    fireEvent.change(screen.getByLabelText("E-mail *"), { target: { value: "carla@example.com" } });
    fireEvent.change(screen.getByLabelText("Áreas de atuação *"), { target: { value: "Clínico geral" } });
    fireEvent.change(screen.getByLabelText("Áreas de atuação *"), { target: { value: "Psiquiatria" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar profissional" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(requestBody(fetchMock)).toMatchObject({
      area: "Clínico geral",
      areas: ["Psiquiatria"],
      approaches: [],
      psychotherapy_specialties: [],
      minority_group: null
    });
  });

  it("loads and preserves every matching area when editing", async () => {
    const fetchMock = successfulFetch();
    const professional: ProfessionalDetail = {
      id: 1,
      person_id: 2,
      name: "Carla Lima",
      phone_number: "5511988887777",
      area: "Clínico geral",
      professional_register: "CRM-1",
      cpf: null,
      birth_date: null,
      email: "carla@example.com",
      approach: null,
      background: null,
      video_platform: null,
      gender: null,
      minority_group: null,
      matching_profile: {
        schema_version: 1,
        areas: ["Clínico geral", "Psiquiatria"],
        psychotherapy: { approaches: [], specialties: [] },
        profile: { gender: null, race: null, lgbtqiapn_plus: null }
      },
      created_at: "2026-01-01T00:00:00.000Z",
      is_active: false,
      promised_patients: 0,
      delivered_patients: 0,
      pending_patients: 0,
      pending_replacements: 0,
      next_deadline: null,
      cycles: [],
      connections: []
    };

    render(
      <ProfessionalEditForm
        professional={professional}
        knownAreas={["Clínico geral", "Psiquiatria"]}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText("Clínico geral")).toBeTruthy();
    expect(screen.getByText("Psiquiatria")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(requestBody(fetchMock)).toMatchObject({
      area: "Clínico geral",
      areas: ["Psiquiatria"]
    });
  });

  it("shows the complete matching profile in the professional summary", () => {
    successfulFetch();
    render(
      <ProfessionalSummary
        professional={{
          id: 1,
          person_id: 2,
          name: "Carla Lima",
          phone_number: "5511988887777",
          area: "Psicoterapia",
          professional_register: "CRP-1",
          matching_profile: {
            schema_version: 1,
            areas: ["Psicoterapia"],
            psychotherapy: { approaches: ["TCC"], specialties: ["Autismo"] },
            profile: { gender: "Mulher", race: "Negra", lgbtqiapn_plus: true }
          },
          is_active: true,
          has_regular_cycle: true,
          has_replacement_cycle: false,
          promised_patients: 4,
          delivered_patients: 2,
          pending_patients: 2,
          pending_replacements: 0,
          next_deadline: null,
          last_completed_at: null,
          has_overdue: false
        }}
      />
    );

    expect(screen.getByText("TCC")).toBeTruthy();
    expect(screen.getByText("Mulher")).toBeTruthy();
    expect(screen.getByText("Negra")).toBeTruthy();
    expect(screen.queryByText("Sim")).toBeNull();
    expect(screen.queryByText("A entregar")).toBeNull();
  });
});
