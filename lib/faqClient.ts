import { withBasePath } from "@/lib/basePath";
import type { FaqGroup, FaqGroupList } from "@/types/faq";

export class FaqApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(withBasePath(`/api/admin/faq${path}`), {
    cache: "no-store",
    ...init,
    headers: init?.body
      ? { "content-type": "application/json", ...init.headers }
      : init?.headers
  });
  const body = (await response.json().catch(() => null)) as
    | { detail?: string; error?: string }
    | T
    | null;
  if (!response.ok) {
    const message = body && typeof body === "object"
      ? ("detail" in body && typeof body.detail === "string" ? body.detail : undefined)
        || ("error" in body ? body.error : undefined)
      : undefined;
    throw new FaqApiError(message || "Não foi possível concluir a operação.", response.status);
  }
  return body as T;
}

export function listFaqGroups() {
  return request<FaqGroupList>("/knowledge-groups");
}

export function createFaqGroup(answer: string, questions: string[]) {
  return request<FaqGroup>("/knowledge-groups", {
    method: "POST",
    body: JSON.stringify({ answer, questions })
  });
}

export function updateFaqGroup(groupId: number, answer: string) {
  return request<FaqGroup>(`/knowledge-groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({ answer })
  });
}

export function addFaqQuestion(groupId: number, question: string) {
  return request<FaqGroup>(`/knowledge-groups/${groupId}/questions`, {
    method: "POST",
    body: JSON.stringify({ question })
  });
}

export function deleteFaqQuestion(entryId: number) {
  return request<{ id: number; deleted: boolean }>(`/knowledge-entries/${entryId}`, {
    method: "DELETE"
  });
}

export function deleteFaqGroup(groupId: number) {
  return request<{ deleted_count: number }>(`/knowledge-groups/${groupId}`, {
    method: "DELETE"
  });
}
