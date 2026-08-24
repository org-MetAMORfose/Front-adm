import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    person: {
      findUnique: mocks.findUnique
    }
  }
}));

import { POST as sendImage } from "@/app/api/admin/send-image/route";

function createRequest() {
  const formData = new FormData();
  formData.append("person_id", "10");
  formData.append("phone_number", "5511999999999");
  formData.append("caption", "Legenda");
  formData.append(
    "file",
    new Blob(["image-bytes"], { type: "image/jpeg" }),
    "photo.jpg"
  );

  return new Request("http://localhost/api/admin/send-image", {
    method: "POST",
    body: formData
  });
}

describe("POST send-image", () => {
  beforeEach(() => {
    process.env.UPLOAD_MEDIA_URL = "https://fast-api.example/upload-media";
    process.env.SEND_MESSAGE_URL = "https://fast-api.example/send";
    mocks.findUnique.mockReset();
    mocks.findUnique.mockResolvedValue({
      phone_number: "5511999999999",
      chat_mode: "MANUAL"
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads the file and sends the returned media path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ media: "media/image/photo.jpg" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await sendImage(createRequest());

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[0];
    expect(uploadUrl).toBe("https://fast-api.example/upload-media");
    expect(uploadInit.method).toBe("POST");
    expect((uploadInit.body as FormData).get("media_type")).toBe("image");

    const [sendUrl, sendInit] = fetchMock.mock.calls[1];
    expect(sendUrl).toBe("https://fast-api.example/send");
    expect(JSON.parse(sendInit.body as string)).toEqual({
      phone_number: "5511999999999",
      content: "Legenda",
      media: "media/image/photo.jpg"
    });
  });

  it("rejects an invalid media path returned by the upload API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ media: "https://example.com/photo.jpg" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await sendImage(createRequest());

    expect(response.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses FastAPI detail errors from the upload endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Uploaded file is empty" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await sendImage(createRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Uploaded file is empty"
    });
  });
});
