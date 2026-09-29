"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Professional } from "@/types";

type Props = {
  professional: Professional | null;
  isLoading: boolean;
};

export function ProfessionalProfileLink({ professional, isLoading }: Props) {
  if (isLoading || !professional) return null;

  return (
    <section className="border-b border-black/10 bg-white px-4 py-3">
      <Link href={`/profissionais/${professional.id}`} className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage/90">
        Ver página do profissional
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
