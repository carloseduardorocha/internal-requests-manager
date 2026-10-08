"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { SelectField } from "@/components/select-field";
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
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

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
  function replaceWith(next: InternalRequestFilters) {
    const query = toSearchParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function apply(patch: Partial<InternalRequestFilters>) {
    replaceWith({ ...filters, ...patch, page: 1 });
  }

  const { text, setText, trimmed, reset } = useDebouncedSearch(
    filters.search,
    (search) => replaceWith({ ...filters, search, page: 1 }),
  );

  function handleClear() {
    reset();
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
