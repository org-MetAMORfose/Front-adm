import type { MediaType } from "@/types";

const MEDIA_PREFIXES: Record<MediaType, string> = {
  image: "media/image/",
  video: "media/video/",
  document: "media/document/"
};

export function getMediaType(mediaPath: string | null): MediaType | null {
  if (!mediaPath) {
    return null;
  }

  if (mediaPath.startsWith(MEDIA_PREFIXES.image)) {
    return "image";
  }

  if (mediaPath.startsWith(MEDIA_PREFIXES.video)) {
    return "video";
  }

  if (mediaPath.startsWith(MEDIA_PREFIXES.document)) {
    return "document";
  }

  return null;
}

export function isValidMediaPath(mediaPath: string): boolean {
  if (
    !mediaPath ||
    mediaPath.startsWith("/") ||
    mediaPath.includes("://") ||
    mediaPath.includes("?") ||
    mediaPath.includes("#") ||
    mediaPath.includes("\\")
  ) {
    return false;
  }

  if (
    mediaPath
      .split("/")
      .some((part) => !part || part === "." || part === "..")
  ) {
    return false;
  }

  return getMediaType(mediaPath) !== null;
}
