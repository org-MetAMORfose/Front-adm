import { withBasePath } from "@/lib/basePath";
import type {
  FlowApiErrorDetail,
  FlowActionCatalog,
  FlowChange,
  FlowGraphResponse,
  FlowRevision,
  FlowRevisionList,
  FlowSheetTabCatalog,
  FlowValidationResult
} from "@/types/chatbotFlow";

export class FlowApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: FlowApiErrorDetail = {}
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(`/api/admin/chatbot-flow${path}`), {
    cache: "no-store",
    ...init,
    headers: init?.body
      ? { "content-type": "application/json", ...init.headers }
      : init?.headers
  });
  const body = (await response.json().catch(() => null)) as
    | { detail?: string | FlowApiErrorDetail; error?: string }
    | T
    | null;
  if (!response.ok) {
    const rawDetail = body && typeof body === "object" && "detail" in body ? body.detail : undefined;
    const detail = typeof rawDetail === "object" && rawDetail !== null ? rawDetail : {};
    const message =
      (typeof rawDetail === "string" ? rawDetail : detail.message) ||
      (body && typeof body === "object" && "error" in body ? body.error : undefined) ||
      "Não foi possível concluir a operação.";
    throw new FlowApiError(message, response.status, detail);
  }
  return body as T;
}

export function listFlowRevisions() {
  return request<FlowRevisionList>("/revisions");
}

export function listFlowActions() {
  return request<FlowActionCatalog>("/actions");
}

export function listFlowSheetTabs() {
  return request<FlowSheetTabCatalog>("/sheets/tabs");
}

export function getFlowRevision(revisionId: number) {
  return request<FlowGraphResponse>(`/revisions/${revisionId}`);
}

export function createFlowDraft(baseRevisionId: number) {
  return request<FlowRevision>("/revisions", {
    method: "POST",
    body: JSON.stringify({ base_revision_id: baseRevisionId })
  });
}

export function saveFlowChanges(revisionId: number, changes: FlowChange[]) {
  return request<{ revision_id: number; change_count: number }>(
    `/revisions/${revisionId}/changes`,
    { method: "PUT", body: JSON.stringify({ changes }) }
  );
}

export function validateFlowRevision(revisionId: number) {
  return request<FlowValidationResult>(`/revisions/${revisionId}/validate`, { method: "POST" });
}

export function publishFlowRevision(revisionId: number) {
  return request<{ revision_id: number; version: number; status: "PUBLISHED" }>(
    `/revisions/${revisionId}/publish`,
    { method: "POST" }
  );
}

export function discardFlowRevision(revisionId: number) {
  return request<FlowRevision>(`/revisions/${revisionId}`, { method: "DELETE" });
}
