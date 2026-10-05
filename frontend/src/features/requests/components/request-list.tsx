"use client";

import Link from "next/link";

import { useAuth } from "@/features/auth/auth-provider";
import { PriorityBadge } from "@/features/requests/components/priority-badge";
import { StatusBadge } from "@/features/requests/components/status-badge";
import { formatDate, formatDateTime } from "@/features/requests/format";
import type { InternalRequest } from "@/features/requests/types";

const COLUMNS = "md:grid-cols-[1fr_110px_140px_150px]";

function RequestRow({
  request,
  showPeople,
}: {
  request: InternalRequest;
  showPeople: boolean;
}) {
  return (
    <Link
      href={`/requests/${request.id}`}
      className={`grid grid-cols-[auto_auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3.5 outline-hidden hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid md:gap-x-3 ${COLUMNS}`}
    >
      <span className="col-span-3 grid min-w-0 gap-0.5 md:col-span-1">
        <span className="font-bold [overflow-wrap:anywhere] md:truncate">
          {request.title}
        </span>
        <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[13px] text-muted-foreground">
          <span className="font-mono">#{request.id}</span>
          {showPeople && (
            <span>
              {request.requester.name} · {request.area.name}
            </span>
          )}
          <span className="md:hidden">{formatDate(request.created_at)}</span>
        </span>
      </span>
      <span className="order-3 md:order-none">
        <PriorityBadge priority={request.priority} />
      </span>
      <span className="order-2 md:order-none">
        <StatusBadge status={request.status} />
      </span>
      <span className="hidden text-[13px] text-muted-foreground md:block">
        {formatDateTime(request.created_at)}
      </span>
    </Link>
  );
}

export function RequestList({ requests }: { requests: InternalRequest[] }) {
  const { user } = useAuth();
  // The requester only sees their own requests: who and where is redundant.
  const showPeople = user.role !== "requester";

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      <div
        aria-hidden="true"
        className={`hidden gap-3 bg-background px-4 py-2.5 text-xs font-bold tracking-[0.05em] text-muted-foreground uppercase md:grid ${COLUMNS}`}
      >
        <span>Solicitação</span>
        <span>Prioridade</span>
        <span>Status</span>
        <span>Criada em</span>
      </div>
      {requests.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          showPeople={showPeople}
        />
      ))}
    </div>
  );
}
