import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isValidMediaPath } from "@/lib/media";
import { getS3Media } from "@/lib/s3";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    messageId: string;
  }>;
};

function isMissingS3Object(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const status =
    "$metadata" in error &&
    error.$metadata &&
    typeof error.$metadata === "object" &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : null;

  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}

export async function GET(_request: Request, context: RouteContext) {
  const { messageId } = await context.params;
  const parsedMessageId = Number(messageId);

  if (!Number.isInteger(parsedMessageId) || parsedMessageId <= 0) {
    return NextResponse.json({ error: "Invalid messageId." }, { status: 400 });
  }

  const message = await prisma.message_history.findUnique({
    where: { id: parsedMessageId },
    select: { media_path: true }
  });

  if (!message?.media_path) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  if (!isValidMediaPath(message.media_path)) {
    return NextResponse.json(
      { error: "Stored media path is invalid." },
      { status: 500 }
    );
  }

  try {
    const object = await getS3Media(message.media_path);

    if (!object.Body) {
      return NextResponse.json({ error: "Media is empty." }, { status: 502 });
    }

    const content = object.Body.transformToWebStream();
    const filename = message.media_path.split("/").at(-1) ?? "media";
    const headers = new Headers({
      "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "content-type": object.ContentType ?? "application/octet-stream",
      "x-content-type-options": "nosniff"
    });

    if (object.ContentLength !== undefined) {
      headers.set("content-length", String(object.ContentLength));
    }

    return new Response(content, { headers });
  } catch (error) {
    if (isMissingS3Object(error)) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to load media from storage." },
      { status: 502 }
    );
  }
}
