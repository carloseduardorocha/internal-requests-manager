"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { SelectField } from "@/components/select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_MAX } from "@/features/requests/filters";
import type { PaginationMeta } from "@/features/requests/types";
import {
  hasActiveUserFilters,
  toUserSearchParams,
} from "@/features/users/filters";
import {
  accountStatusFilterLabels,
  accountStatuses,
  roleLabels,
  roles,
} from "@/features/users/labels";
import type { UserFilters as Filters } from "@/features/users/types";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { Area } from "@/lib/types";

function countText(meta: PaginationMeta): string {
  if (meta.total === 0) return "Nenhum usuário encontrado";
  if (meta.total === 1) return "1 usuário encontrado";
  return `Mostrando ${meta.from}–${meta.to} de ${meta.total} usuários`;
}

// The filters live in the URL: every change replaces it (no history noise)
// and goes back to page 1.
export function UserFilters({
  filters,
  areas,
  meta,
}: {
  filters: Filters;
  areas: Area[];
  meta: PaginationMeta | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function replaceWith(next: Filters) {
    const query = toUserSearchParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function apply(patch: Partial<Filters>) {
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

  const active = hasActiveUserFilters(filters) || trimmed !== "";

  return (
    <>
      <form
        role="search"
        aria-label="Filtrar usuários"
        onSubmit={(event) => event.preventDefault()}
        className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_160px_170px_160px] md:items-end"
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
            placeholder="Pesquisar por nome ou e-mail"
            value={text}
            maxLength={SEARCH_MAX}
            onChange={(event) => setText(event.target.value)}
            className="pl-10"
          />
        </div>

        <SelectField
          id="filter-role"
          label="Perfil"
          value={filters.role}
          onChange={(event) =>
            apply({ role: event.target.value as typeof filters.role })
          }
        >
          <option value="">Todos</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filter-area"
          label="Área"
          value={filters.area_id === null ? "" : String(filters.area_id)}
          onChange={(event) =>
            apply({
              area_id: event.target.value ? Number(event.target.value) : null,
            })
          }
        >
          <option value="">Todas</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filter-status"
          label="Situação"
          className="col-span-full md:col-auto"
          value={filters.status}
          onChange={(event) =>
            apply({ status: event.target.value as typeof filters.status })
          }
        >
          <option value="">Todas</option>
          {accountStatuses.map((status) => (
            <option key={status} value={status}>
              {accountStatusFilterLabels[status]}
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
