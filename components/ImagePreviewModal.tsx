"use client";

import { X } from "lucide-react";

type Props = {
  imageUrl: string | null;
  onClose: () => void;
};

export function ImagePreviewModal({ imageUrl, onClose }: Props) {
  if (!imageUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded bg-white p-2 text-ink shadow-subtle transition hover:bg-mist"
        onClick={onClose}
        aria-label="Fechar imagem"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <img
        src={imageUrl}
        alt="Preview ampliado"
        className="max-h-[88vh] max-w-[92vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
