"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { normalizeSearch } from "@/lib/matchingDomain";

type Props<T> = {
  id: string;
  label: string;
  placeholder: string;
  options: T[];
  selected: T | null;
  getKey: (option: T) => string | number;
  getLabel: (option: T) => string;
  getDescription?: (option: T) => string;
  onSelect: (option: T) => void;
  onClear?: () => void;
  emptyMessage?: string;
  required?: boolean;
};

export function SearchCombobox<T>({
  id,
  label,
  placeholder,
  options,
  selected,
  getKey,
  getLabel,
  getDescription,
  onSelect,
  onClear,
  emptyMessage = "Nenhuma opção encontrada.",
  required = false
}: Props<T>) {
  const [query, setQuery] = useState(selected ? getLabel(selected) : "");
  const [open, setOpen] = useState(false);
  const normalizedQuery = normalizeSearch(query);
  const filtered = useMemo(
    () =>
      options
        .filter((option) => {
          const searchable = `${getLabel(option)} ${
            getDescription?.(option) ?? ""
          }`;
          return normalizeSearch(searchable).includes(normalizedQuery);
        })
        .slice(0, 8),
    [getDescription, getLabel, normalizedQuery, options]
  );

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink/75">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
        <input
          id={id}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (
              selected &&
              normalizeSearch(nextQuery) !== normalizeSearch(getLabel(selected))
            ) {
              onClear?.();
            }
            setOpen(true);
          }}
          className="w-full rounded-lg border border-black/15 bg-white py-2.5 pl-9 pr-10 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-2 focus:ring-sage/20"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          role="combobox"
          required={required && !selected}
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-ink/40 hover:text-ink"
          aria-label="Mostrar opções"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <div
          id={`${id}-options`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-black/10 bg-white p-1 shadow-xl"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink/55">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const active =
                selected !== null && getKey(selected) === getKey(option);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  key={getKey(option)}
                  onClick={() => {
                    onSelect(option);
                    setQuery(getLabel(option));
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-mist"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {getLabel(option)}
                    </span>
                    {getDescription ? (
                      <span className="block truncate text-xs text-ink/50">
                        {getDescription(option)}
                      </span>
                    ) : null}
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-sage" aria-hidden /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
