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
      <path fill="#C00000" d={WING} />
      <path fill="#1A1315" d={TAIL} />
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
    <main className={`${oswald.variable} flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 text-[#1A1315]`}>
      <div className="mb-8 flex items-center gap-2.5">
        <Mark className="h-10 w-auto" />
        <span className="font-[family-name:var(--font-oswald)] text-[1.75rem] font-medium tracking-wide">MetAMORfose</span>
      </div>

      <section className="w-full max-w-[28rem] rounded-lg border border-black/[0.06] bg-white px-6 py-8 shadow-[0_18px_50px_-18px_rgba(26,19,21,0.28)] sm:px-10 sm:py-10">
        <h1 className="text-[1.375rem] font-bold tracking-tight">Entrar no painel</h1>
        <LoginForm next={target} />
      </section>
      <p className="mt-6 text-xs text-[#1A1315]/50">© {new Date().getFullYear()} MetAMORfose. Todos os direitos reservados.</p>
    </main>
  );
}
