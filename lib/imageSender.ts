export type ImageMessageDraft = {
  phoneNumber: string;
  file: File;
  caption?: string;
};

export async function sendImageMessage(draft: ImageMessageDraft) {
  const formData = new FormData();

  formData.append("phone_number", draft.phoneNumber);

  if (draft.caption) {
    formData.append("caption", draft.caption);
  }

  formData.append("file", draft.file, draft.file.name);

  const response = await fetch("/api/admin/send-image", {
    method: "POST",
    body: formData
  });

  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    if (body && typeof body === "object" && "error" in body) {
      throw new Error((body as { error?: string }).error ?? "Falha ao enviar a imagem.");
    }

    throw new Error(typeof body === "string" ? body : "Falha ao enviar a imagem.");
  }

  return body;
}
