"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CircleHelp, GitFork, MessageSquareText, Network } from "lucide-react";

type Props = {
  title: string;
  description: string;
  actions?: ReactNode;
};

const navigation = [
  { href: "/", label: "Conversas", icon: MessageSquareText },
  { href: "/distribuicao", label: "Distribuição", icon: Network },
  { href: "/fluxo", label: "Fluxo", icon: GitFork },
  { href: "/faq", label: "FAQ", icon: CircleHelp }
];

export function AdminHeader({ title, description, actions }: Props) {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-black/10 bg-white px-4 py-3 shadow-subtle sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          <p className="text-sm text-ink/60">{description}</p>
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-mist p-1" aria-label="Principal">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) ||
                  (item.href === "/distribuicao" &&
                    pathname.startsWith("/profissionais/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white text-sage shadow-sm"
                    : "text-ink/60 hover:bg-white/70 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {actions ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
