import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: number;
  note?: string;
  icon: LucideIcon;
  tone?: "default" | "positive" | "warning";
};

export function MetricCard({ label, value, note, icon: Icon, tone = "default" }: Props) {
  const colors = {
    default: "bg-white text-sage",
    positive: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700"
  }[tone];

  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-subtle">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
          {note ? <p className="mt-1 text-xs text-ink/50">{note}</p> : null}
        </div>
        <span className={`rounded-lg p-2 ${colors}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </article>
  );
}
