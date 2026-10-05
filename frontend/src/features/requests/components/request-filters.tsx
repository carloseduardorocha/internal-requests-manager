"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SEARCH_MAX,
  hasActiveFilters,
  toSearchParams,
} from "@/features/requests/filters";
import {
  priorities,
  priorityLabels,
  sortLabels,
  sorts,
  statuses,
  statusLabels,
} from "@/features/requests/labels";
import type {
  InternalRequestFilters,
  PaginationMeta,
} from "@/features/requests/types";

const SEARCH_DELAY_MS = 300;

function SelectField({
  id,
  label,
  className = "",
  children,
  ...props
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className={`grid min-w-0 gap-1.5 ${className}`}>
      <Label htmlFor={id} className="text-[13px] font-bold">
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          {...props}
          className="min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-border-strong bg-background pr-9 pl-3 text-foreground outline-hidden focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid"
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}

function countText(meta: PaginationMeta): string {
  if (meta.total === 0) return "Nenhuma solicitação encontrada";
  if (meta.total === 1) return "1 solicitação encontrada";
  return `Mostrando ${meta.from}–${meta.to} de ${meta.total} solicitações`;
}

// The filters live in the URL: every change replaces it (no history noise)
// and goes back to page 1.
export function RequestFilters({
  filters,
  meta,
}: {
  filters: InternalRequestFilters;
  meta: PaginationMeta | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(filters.search);
  const [seenSearch, setSeenSearch] = useState(filters.search);
  // Last value the debounce put in the URL: when the navigation catches up
  // with it, the box already holds (or has moved past) that text.
  const [sentSearch, setSentSearch] = useState<string | null>(null);

  // Follow changes that did not come from typing (clear, back button).
  if (filters.search !== seenSearch) {
    setSeenSearch(filters.search);
    if (filters.search !== text.trim() && filters.search !== sentSearch) {
      setText(filters.search);
    }
  }

  function apply(patch: Partial<InternalRequestFilters>) {
    const query = toSearchParams({ ...filters, ...patch, page: 1 }).toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const trimmed = text.trim();

  useEffect(() => {
    if (trimmed === filters.search) return;

    const timer = setTimeout(() => {
      setSentSearch(trimmed);
      const query = toSearchParams({
        ...filters,
        search: trimmed,
        page: 1,
      }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [trimmed, filters, pathname, router]);

  function handleClear() {
    setText("");
    setSentSearch(null);
    router.replace(pathname);
  }

  const active = hasActiveFilters(filters) || trimmed !== "";

  return (
    <>
      <form
        role="search"
        aria-label="Filtrar solicitações"
        onSubmit={(event) => event.preventDefault()}
        className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_170px_170px_170px] md:items-end"
      >
        <div className="relative col-span-full md:col-auto">
          <Label htmlFor="search" className="sr-only">
            Pesquisar
          </Label>
          <Search
            aria-hidden="true"
            className="absolute top-4 left-3.5 size-4 text-muted-foreground"
          />
          <Input
            id="search"
            type="search"
            placeholder="Pesquisar no título ou na descrição"
            value={text}
            maxLength={SEARCH_MAX}
            onChange={(event) => setText(event.target.value)}
            className="pl-10"
          />
        </div>

        <SelectField
          id="filter-status"
          label="Status"
          value={filters.status}
          onChange={(event) =>
            apply({ status: event.target.value as typeof filters.status })
          }
        >
          <option value="">Todos</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filter-priority"
          label="Prioridade"
          value={filters.priority}
          onChange={(event) =>
            apply({ priority: event.target.value as typeof filters.priority })
          }
        >
          <option value="">Todas</option>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filter-sort"
          label="Ordenar por"
          className="col-span-full md:col-auto"
          value={filters.sort}
          onChange={(event) =>
            apply({ sort: event.target.value as typeof filters.sort })
          }
        >
          {sorts.map((sort) => (
            <option key={sort} value={sort}>
              {sortLabels[sort]}
            </option>
          ))}
        </SelectField>
      </form>

      {(meta || active) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
          <span aria-live="polite">{meta ? countText(meta) : ""}</span>
          {active && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 font-bold text-primary outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
            >
              <X aria-hidden="true" className="size-4" />
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </>
  );
}
