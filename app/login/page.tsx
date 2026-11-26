import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/LoginForm";
import { ADMIN_SESSION_COOKIE, safeNextPath, verifyAdminSession } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

const oswald = localFont({ src: "../fonts/oswald.woff2", weight: "400 700", variable: "--font-oswald", display: "swap" });

export const metadata: Metadata = {
  title: "Entrar no painel MetAMORfose"
};

const WING = "M29 61C28 45 28 28 32 17C35 9 44 6 50 12C56 18 60 32 62 48C70 46 78 52 81 62C84 72 83 84 77 87C70 90 62 86 55 81C46 75 37 68 29 61Z";
const TAIL = "M19 50L26 54L24 61L38 76L17 66L22 59Z";

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="14 4 72 88" className={className} aria-hidden>
      <path fill="#E0262B" d={WING} />
      <path fill="#F7F3F2" d={TAIL} />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(Array.isArray(next) ? next[0] : next);

  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (user && password && (await verifyAdminSession(session, user, password))) redirect(target);

  return (
    <main className={`${oswald.variable} flex min-h-screen flex-col bg-mist text-ink lg:flex-row`}>
      <section className="relative flex h-36 shrink-0 flex-col justify-between overflow-hidden bg-[#1A1315] px-4 py-5 text-[#F7F3F2] sm:px-8 lg:h-auto lg:w-[42%] lg:max-w-[560px] lg:px-12 lg:py-12">
        <svg
          viewBox="14 4 72 88"
          className="pointer-events-none absolute -right-20 -top-6 h-[170%] text-[#C00000] lg:-right-[38%] lg:top-[16%] lg:h-[80%]"
          aria-hidden
        >
          <path fill="currentColor" d={WING} />
        </svg>

        <div className="relative flex items-center gap-3">
          <Mark className="h-9 w-auto" />
          <span className="font-[family-name:var(--font-oswald)] text-2xl font-medium tracking-wide">MetAMORfose</span>
        </div>

        <p className="relative hidden max-w-[18rem] text-base leading-relaxed text-[#F7F3F2]/75 lg:block">
          Painel da equipe: conversas do chatbot, distribuição de pacientes e acolhimento imediato.
        </p>
      </section>

      <section className="flex flex-1 items-start justify-center px-4 py-10 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-[22.5rem]">
          <h1 className="font-[family-name:var(--font-oswald)] text-[2.125rem] font-semibold leading-tight text-[#1A1315]">
            Entrar no painel
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/65">Use o usuário e a senha da equipe.</p>
          <LoginForm next={target} />
        </div>
      </section>
    </main>
  );
}
