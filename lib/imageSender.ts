export type ImageMessageDraft = {
  phoneNumber: string;
  file: File;
  caption?: string;
};

export async function sendImageMessage(_draft: ImageMessageDraft) {
  // TODO: Integrar com endpoint real de envio de imagem quando estiver definido.
  throw new Error("Envio de imagem ainda nao possui endpoint configurado.");
}
