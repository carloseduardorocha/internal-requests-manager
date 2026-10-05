"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { canAccess } from "@/features/auth/routes";
import { Pagination } from "@/features/requests/components/pagination";
import { RequestFilters } from "@/features/requests/components/request-filters";
import { RequestList } from "@/features/requests/components/request-list";
import {
  RequestListEmpty,
  RequestListError,
  RequestListNoResults,
  RequestListSkeleton,
} from "@/features/requests/components/request-list-states";
import {
  hasActiveFilters,
  parseFilters,
  toSearchParams,
} from "@/features/requests/filters";
import { saveListQuery } from "@/features/requests/list-href";
import { useInternalRequests } from "@/features/requests/hooks/use-internal-requests";

function RequestsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseFilters(useSearchParams());
  const query = toSearchParams(filters).toString();
  const { loading, error, data, meta, reload } = useInternalRequests(filters);

  const canCreate = canAccess(user.role, "/requests/new");
  const active = hasActiveFilters(filters);
  const lastPage = meta?.last_page ?? 1;

  // Remember the filters for the "back to the list" links.
  useEffect(() => saveListQuery(query), [query]);

  // Paging is navigation (back goes to the previous page); typing is not.
  function goTo(page: number) {
    const query = toSearchParams({ ...filters, page }).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  // A page past the end (a stale or edited URL): go to the last one.
  useEffect(() => {
    if (!loading && meta && filters.page > lastPage) {
      const query = toSearchParams({ ...filters, page: lastPage }).toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
    // `filters` is rebuilt on every render; its page is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, meta, filters.page, lastPage, pathname, router]);

  let body;
  if (loading) {
    body = <RequestListSkeleton />;
  } else if (error) {
    body = <RequestListError onRetry={reload} />;
  } else if (data.length === 0) {
    body = active ? (
      <RequestListNoResults
        search={filters.search}
        onClear={() => router.replace(pathname)}
      />
    ) : (
      <RequestListEmpty role={user.role} canCreate={canCreate} />
    );
  } else {
    body = <RequestList requests={data} />;
  }

  return (
    <>
      <RequestFilters
        filters={filters}
        meta={!loading && !error && (data.length > 0 || active) ? meta : null}
      />
      {body}
      {!loading && !error && meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPageChange={goTo} />
      )}
    </>
  );
}

export default function RequestsPage() {
  const { user } = useAuth();
  const own = user.role === "requester";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[26px] font-extrabold">
            {own ? "Minhas solicitações" : "Solicitações"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {own
              ? "Acompanhe os pedidos que você abriu."
              : "Todos os pedidos da empresa."}
          </p>
        </div>
        {canAccess(user.role, "/requests/new") && (
          <Button asChild className="max-[480px]:w-full">
            <Link href="/requests/new">
              <Plus aria-hidden="true" />
              Nova solicitação
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<RequestListSkeleton />}>
        <RequestsContent />
      </Suspense>
    </>
  );
}
