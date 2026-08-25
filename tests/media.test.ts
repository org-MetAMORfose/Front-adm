import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getS3Media: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    message_history: {
      findUnique: mocks.findUnique
    }
  }
}));

vi.mock("@/lib/s3", () => ({
  getS3Media: mocks.getS3Media
}));

import { GET as getMedia } from "@/app/api/admin/messages/[messageId]/media/route";
import { getMediaType, isValidMediaPath } from "@/lib/media";

function callGetMedia(messageId: string) {
  return getMedia(new Request(`http://localhost/messages/${messageId}/media`), {
    params: Promise.resolve({ messageId })
  });
}

describe("media paths", () => {
  it("classifies supported media paths", () => {
    expect(getMediaType("media/image/photo.jpg")).toBe("image");
    expect(getMediaType("media/video/recording.mp4")).toBe("video");
    expect(getMediaType("media/document/file.pdf")).toBe("document");
    expect(getMediaType("other/file.jpg")).toBeNull();
  });

  it("rejects URLs and path traversal", () => {
    expect(isValidMediaPath("media/image/photo.jpg")).toBe(true);
    expect(isValidMediaPath("media/video/recording.mp4")).toBe(true);
    expect(isValidMediaPath("https://example.com/photo.jpg")).toBe(false);
    expect(isValidMediaPath("media/image/../secret.jpg")).toBe(false);
  });
});

describe("GET message media", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.getS3Media.mockReset();
  });

  it("returns the private S3 object with safe response headers", async () => {
    mocks.findUnique.mockResolvedValue({ media_path: "media/image/photo.jpg" });
    mocks.getS3Media.mockResolvedValue({
      Body: {
        transformToWebStream: vi.fn().mockReturnValue(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([1, 2, 3]));
              controller.close();
            }
          })
        )
      },
      ContentLength: 3,
      ContentType: "image/jpeg"
    });

    const response = await callGetMedia("42");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-disposition")).toContain("photo.jpg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    );
    expect(mocks.getS3Media).toHaveBeenCalledWith("media/image/photo.jpg");
  });

  it("streams a video using its S3 content type", async () => {
    mocks.findUnique.mockResolvedValue({
      media_path: "media/video/recording.mp4"
    });
    mocks.getS3Media.mockResolvedValue({
      Body: {
        transformToWebStream: vi.fn().mockReturnValue(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([4, 5, 6]));
              controller.close();
            }
          })
        )
      },
      ContentLength: 3,
      ContentType: "video/mp4"
    });

    const response = await callGetMedia("43");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("content-disposition")).toContain(
      "recording.mp4"
    );
    expect(mocks.getS3Media).toHaveBeenCalledWith(
      "media/video/recording.mp4"
    );
  });

  it("returns 400 for an invalid message id", async () => {
    const response = await callGetMedia("invalid");

    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("does not query S3 when the message has no media", async () => {
    mocks.findUnique.mockResolvedValue({ media_path: null });

    const response = await callGetMedia("42");

    expect(response.status).toBe(404);
    expect(mocks.getS3Media).not.toHaveBeenCalled();
  });

  it("maps a missing S3 object to 404", async () => {
    mocks.findUnique.mockResolvedValue({ media_path: "media/document/file.pdf" });
    mocks.getS3Media.mockRejectedValue({ name: "NoSuchKey" });

    const response = await callGetMedia("42");

    expect(response.status).toBe(404);
  });
});
