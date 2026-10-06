"use client";

import { formatBrazilianPhone } from "@/lib/phone";

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

export function PhoneField({ value, onChange, id = "phone-number" }: Props) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink/75">
        Celular *
      </label>
      <div className="flex overflow-hidden rounded-lg border border-black/15 bg-white transition focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/20">
        <span className="flex items-center border-r border-black/10 bg-mist px-3 text-sm font-medium text-ink/65">
          +55
        </span>
        <input
          id={id}
          value={formatBrazilianPhone(value)}
          onChange={(event) => onChange(event.target.value)}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 9999-9999 ou 99999-9999"
          className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none"
          required
        />
      </div>
      <p className="mt-1 text-xs text-ink/45">Será salvo no formato internacional 55 + DDD + número.</p>
    </div>
  );
}
