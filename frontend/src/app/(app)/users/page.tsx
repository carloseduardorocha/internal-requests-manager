"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { BulkResultSummary } from "@/components/bulk-result-summary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { Pagination } from "@/features/requests/components/pagination";
import {
  UserBulkActions,
  type UserBulkAction,
} from "@/features/users/components/user-bulk-actions";
import { UserFilters } from "@/features/users/components/user-filters";
import { UserList } from "@/features/users/components/user-list";
import {
  UserListError,
  UserListNoResults,
  UserListSkeleton,
} from "@/features/users/components/user-list-states";
import {
  hasActiveUserFilters,
  parseUserFilters,
  toUserSearchParams,
} from "@/features/users/filters";
import { useAreas } from "@/features/users/hooks/use-areas";
import { useUsers } from "@/features/users/hooks/use-users";
import type { ManagedUser } from "@/features/users/types";
import { useSelection } from "@/hooks/use-selection";
import type { BulkResult } from "@/lib/bulk";
import type { Area } from "@/lib/types";

const TITLE_ID = "users-title";

// What the last bulk action left out; it belongs to the page and filters it
// was run on.
type Summary = {
  id: number;
  key: string;
  result: BulkResult;
  action: UserBulkAction;
  labels: Record<number, string>;
};

const verbs = {
  deactivate: ["desativada", "desativadas"],
  reactivate: ["reativada", "reativadas"],
} as const;

function focusTitle() {
  document.getElementById(TITLE_ID)?.focus();
}

// The areas are loaded first: an `area_id` in the URL is only valid if the
// area exists.
function UsersContent() {
  const { loading, error, areas, reload } = useAreas();

  if (loading) return <UserListSkeleton />;
  if (error) return <UserListError onRetry={reload} />;

  return <UsersList areas={areas} />;
}

function UsersList({ areas }: { areas: Area[] }) {
  const { user: me, updateUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseUserFilters(
    searchParams,
    areas.map((area) => area.id),
  );
  const { loading, error, data, meta, reload, replace } = useUsers(filters);

  // The own account has no checkbox, so it never counts as selectable. The
  // selection is per page: any change of page or filter clears it.
  const resetKey = toUserSearchParams(filters).toString();
  const selection = useSelection(
    data.filter((user) => user.id !== me.id).map((user) => user.id),
    resetKey,
  );
  const [summary, setSummary] = useState<Summary | null>(null);
  const shownSummary = summary?.key === resetKey ? summary : null;

  function handleBulkDone(
    result: BulkResult,
    action: UserBulkAction,
    labels: Record<number, string>,
  ) {
    selection.clear();
    reload();
    if (result.skipped.length === 0) {
      setSummary(null);
      const [one, many] = verbs[action];
      toast.success(
        result.done.length === 1
          ? `1 conta ${one}`
          : `${result.done.length} contas ${many}`,
      );
      focusTitle();
      return;
    }
    setSummary({ id: Date.now(), key: resetKey, result, action, labels });
  }

  function handleBulkForbidden() {
    selection.clear();
    reload();
  }

  // The row is swapped in place; the own account also feeds the header.
  function handleUpdated(updated: ManagedUser) {
    replace(updated);
    if (updated.id === me.id) {
      const { id, name, email, role, area } = updated;
      updateUser({ id, name, email, role, area });
    }
  }

  const active = hasActiveUserFilters(filters);
  const lastPage = meta?.last_page ?? 1;

  // Paging is navigation (back goes to the previous page); typing is not.
  function goTo(page: number) {
    const query = toUserSearchParams({ ...filters, page }).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  // A page past the end (a stale or edited URL): go to the last one.
  useEffect(() => {
    if (!loading && meta && filters.page > lastPage) {
      const query = toUserSearchParams({
        ...filters,
        page: lastPage,
      }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
    // `filters` is rebuilt on every render; its page is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, meta, filters.page, lastPage, pathname, router]);

  let body;
  if (loading) {
    body = <UserListSkeleton />;
  } else if (error) {
    body = <UserListError onRetry={reload} />;
  } else {
    // The administrator always appears, so an empty list means filters.
    body =
      data.length === 0 ? (
        <UserListNoResults
          search={filters.search}
          onClear={() => router.replace(pathname)}
        />
      ) : (
        <UserList
          users={data}
          areas={areas}
          selection={{
            isSelected: selection.isSelected,
            onToggle: selection.toggle,
            allSelected: selection.allSelected,
            someSelected: selection.someSelected,
            onToggleAll: selection.toggleAll,
          }}
          onUpdated={handleUpdated}
        />
      );
  }

  return (
    <>
      <UserFilters
        filters={filters}
        areas={areas}
        meta={!loading && !error && (data.length > 0 || active) ? meta : null}
      />
      {shownSummary && (
        <BulkResultSummary
          // A new action remounts it, so it takes the focus again.
          key={shownSummary.id}
          result={shownSummary.result}
          title={`${shownSummary.result.done.length} de ${
            shownSummary.result.done.length + shownSummary.result.skipped.length
          } contas ${verbs[shownSummary.action][1]}`}
          labelFor={(id) => shownSummary.labels[id] ?? `Conta ${id}`}
          onClose={() => {
            setSummary(null);
            focusTitle();
          }}
        />
      )}
      {body}
      <UserBulkActions
        users={data.filter((user) => selection.isSelected(user.id))}
        onClear={selection.clear}
        onStart={() => setSummary(null)}
        onDone={handleBulkDone}
        onForbidden={handleBulkForbidden}
      />
      {!loading && !error && meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPageChange={goTo} />
      )}
    </>
  );
}

export default function UsersPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            id={TITLE_ID}
            tabIndex={-1}
            className="font-heading text-[26px] font-extrabold outline-hidden"
          >
            Usuários
          </h1>
          <p className="mt-1 text-muted-foreground">
            Contas da empresa: perfil, área e situação.
          </p>
        </div>
        <Button asChild className="max-[480px]:w-full">
          <Link href="/users/invite">
            <UserPlus aria-hidden="true" />
            Convidar usuário
          </Link>
        </Button>
      </div>

      <Suspense fallback={<UserListSkeleton />}>
        <UsersContent />
      </Suspense>
    </>
  );
}
