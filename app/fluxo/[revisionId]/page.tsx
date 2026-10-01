import { notFound } from "next/navigation";

import { FlowEditor } from "@/components/flow/FlowEditor";

export default async function FlowRevisionPage({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  const id = Number(revisionId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <FlowEditor revisionId={id} />;
}
