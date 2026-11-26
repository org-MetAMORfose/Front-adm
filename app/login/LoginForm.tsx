"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";

import { withBasePath } from "@/lib/basePath";

const inputClass =
  "h-12 w-full rounded-md border border-ink/15 bg-white px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-[#C00000] focus:ring-2 focus:ring-[#C00000]/20";

export function LoginForm({ next }: { next: string }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const response = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, password })
      });
      if (response.ok) {
        window.location.assign(withBasePath(next));
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Não foi possível entrar agora. Tente de novo em instantes.");
    } catch {
      setError("Não foi possível entrar agora. Confira a internet e tente de novo.");
    }
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="login-user" className="block text-sm font-medium text-ink/80">
          Usuário
        </label>
        <input
          id="login-user"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          value={user}
          onChange={(event) => setUser(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-sm font-medium text-ink/80">
          Senha
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-ink/45 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C00000]"
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-[#C00000]/[0.07] px-3.5 py-2.5 text-sm text-[#9A0000]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending || !user || !password}
        className="h-12 w-full rounded-md bg-[#C00000] text-base font-semibold text-white transition-colors hover:bg-[#A30000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C00000] disabled:cursor-not-allowed disabled:bg-[#C00000]/45"
      >
        {sending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
