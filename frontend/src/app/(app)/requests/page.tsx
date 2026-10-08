"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { BulkActionBar } from "@/components/bulk-action-bar";
import { BulkResultSummary } from "@/components/bulk-result-summary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { canAccess } from "@/features/auth/routes";
import {
  BulkRequestActions,
  type BulkRequestAction,
} from "@/features/requests/components/bulk-request-actions";
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
import { useSelection } from "@/hooks/use-selection";
import type { BulkResult } from "@/lib/bulk";

type Summary = {
  key: string;
  action: BulkRequestAction;
  result: BulkResult;
  total: number;
  titles: Map<number, string>;
};

function summaryTitle(summary: Summary) {
  const verb =
    summary.action === "delete"
      ? ["excluída", "excluídas"]
      : ["assumida", "assumidas"];
  const done = summary.result.done.length;
  return `${done} de ${summary.total} solicitações ${verb[1]}`;
}

function successMessage(action: BulkRequestAction, count: number) {
  const [one, many] =
    action === "delete" ? ["excluída", "excluídas"] : ["assumida", "assumidas"];
  return count === 1 ? `1 solicitação ${one}` : `${count} solicitações ${many}`;
}

function RequestsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseFilters(useSearchParams());
  const query = toSearchParams(filters).toString();
  const { loading, error, data, meta, reload } = useInternalRequests(filters);

  const selection = useSelection(
    data.map((request) => request.id),
    query,
  );
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  // The summary belongs to the page and filters it came from.
  if (summary && summary.key !== query) setSummary(null);

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

  function handleBulkResult(action: BulkRequestAction, result: BulkResult) {
    // The list reloads after this, so the titles are kept now.
    const titles = new Map(data.map((request) => [request.id, request.title]));
    selection.clear();
    reload();
    if (result.skipped.length === 0) {
      setSummary(null);
      toast.success(successMessage(action, result.done.length));
      // The bar is gone with the selection: the focus goes to the page title.
      document.getElementById("requests-title")?.focus();
      return;
    }
    // The summary takes the focus when it appears.
    setSummary({
      key: query,
      action,
      result,
      total: result.done.length + result.skipped.length,
      titles,
    });
  }

  function handleBulkForbidden() {
    selection.clear();
    reload();
    document.getElementById("requests-title")?.focus();
  }

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
    body = <RequestList requests={data} onRefresh={reload} {...selection} />;
  }

  return (
    <>
      <RequestFilters
        filters={filters}
        meta={!loading && !error && (data.length > 0 || active) ? meta : null}
      />
      {summary && (
        <BulkResultSummary
          result={summary.result}
          title={summaryTitle(summary)}
          labelFor={(id) => `#${id} ${summary.titles.get(id) ?? ""}`.trim()}
          onClose={() => setSummary(null)}
        />
      )}
      {body}
      {!loading && !error && meta && meta.last_page > 1 && (
        <Pagination meta={meta} onPageChange={goTo} />
      )}
      <BulkActionBar
        count={selection.selected.length}
        busy={busy}
        onClear={selection.clear}
      >
        <BulkRequestActions
          role={user.role}
          ids={selection.selected}
          busy={busy}
          onBusyChange={setBusy}
          onResult={handleBulkResult}
          onForbidden={handleBulkForbidden}
        />
      </BulkActionBar>
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
          <h1
            id="requests-title"
            tabIndex={-1}
            className="font-heading text-[26px] font-extrabold outline-hidden"
          >
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
