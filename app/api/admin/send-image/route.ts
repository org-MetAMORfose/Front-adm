import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractImageUrl(body: unknown): string | null {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    return body;
  }

  if (typeof body === "object") {
    const candidate = body as Record<string, unknown>;

    if (typeof candidate.image_url === "string" && candidate.image_url.trim()) {
      return candidate.image_url.trim();
    }

    if (typeof candidate.url === "string" && candidate.url.trim()) {
      return candidate.url.trim();
    }

    if (typeof candidate.file_url === "string" && candidate.file_url.trim()) {
      return candidate.file_url.trim();
    }

    if (candidate.data && typeof candidate.data === "object") {
      const nested = candidate.data as Record<string, unknown>;
      if (typeof nested.image_url === "string" && nested.image_url.trim()) {
        return nested.image_url.trim();
      }
      if (typeof nested.url === "string" && nested.url.trim()) {
        return nested.url.trim();
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  const uploadMediaUrl = process.env.UPLOAD_MEDIA_URL;
  const sendMessageUrl = process.env.SEND_MESSAGE_URL;

  if (!uploadMediaUrl) {
    return NextResponse.json(
      { error: "UPLOAD_MEDIA_URL is not configured." },
      { status: 500 }
    );
  }

  if (!sendMessageUrl) {
    return NextResponse.json(
      { error: "SEND_MESSAGE_URL is not configured." },
      { status: 500 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart/form-data body." },
      { status: 400 }
    );
  }

  const phoneNumber = formData.get("phone_number");
  const personId = Number(formData.get("person_id"));
  const caption = formData.get("caption");
  const file = formData.get("file");

  if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    return NextResponse.json(
      { error: "phone_number is required." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(personId) || personId <= 0) {
    return NextResponse.json({ error: "person_id is required." }, { status: 400 });
  }

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No valid file uploaded." },
      { status: 400 }
    );
  }

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { phone_number: true, chat_mode: true }
  });

  if (!person || person.phone_number !== phoneNumber.trim()) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (person.chat_mode !== "MANUAL") {
    return NextResponse.json(
      { error: "A conversa precisa estar no modo Manual para enviar imagens." },
      { status: 409 }
    );
  }

  const uploadData = new FormData();
  uploadData.append("media_type", "image");
  uploadData.append("file", file, (file as File).name);

  const uploadResponse = await fetch(uploadMediaUrl, {
    method: "POST",
    body: uploadData
  });

  const uploadBody = await readResponseBody(uploadResponse);

  if (!uploadResponse.ok) {
    return NextResponse.json(
      {
        error:
          uploadBody && typeof uploadBody === "object" && "error" in uploadBody
            ? (uploadBody as { error?: string }).error
            : "Failed to upload media."
      },
      { status: uploadResponse.status }
    );
  }

  const imageUrl = extractImageUrl(uploadBody);

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Upload succeeded but no image URL was returned." },
      { status: 500 }
    );
  }

  const sendBody = {
    phone_number: phoneNumber.trim(),
    content: typeof caption === "string" ? caption.trim() : "",
    image_url: imageUrl,
    document_url: null
  };

  const sendResponse = await fetch(sendMessageUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(sendBody)
  });

  const sendResponseBody = await readResponseBody(sendResponse);

  return NextResponse.json(
    {
      ok: sendResponse.ok,
      status: sendResponse.status,
      body: sendResponseBody
    },
    { status: sendResponse.ok ? 200 : sendResponse.status }
  );
}
