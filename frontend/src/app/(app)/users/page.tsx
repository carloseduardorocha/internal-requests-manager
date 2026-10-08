"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { Pagination } from "@/features/requests/components/pagination";
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
import type { Area } from "@/lib/types";

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
        <UserList users={data} areas={areas} onUpdated={handleUpdated} />
      );
  }

  return (
    <>
      <UserFilters
        filters={filters}
        areas={areas}
        meta={!loading && !error && (data.length > 0 || active) ? meta : null}
      />
      {body}
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
          <h1 className="font-heading text-[26px] font-extrabold">Usuários</h1>
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
