"use client";

import Link from "next/link";
import { toast } from "sonner";

import { SelectionCheckbox } from "@/components/selection-checkbox";
import { useAuth } from "@/features/auth/auth-provider";
import { PriorityBadge } from "@/features/requests/components/priority-badge";
import { RequestRowActions } from "@/features/requests/components/request-row-actions";
import { StatusBadge } from "@/features/requests/components/status-badge";
import { formatDate, formatDateTime } from "@/features/requests/format";
import type { InternalRequest } from "@/features/requests/types";
import { cn } from "@/lib/utils";

const COLUMNS = "md:grid-cols-[32px_minmax(0,1fr)_110px_140px_150px_44px]";

type Selection = {
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  allSelected: boolean;
  someSelected: boolean;
  toggleAll: () => void;
};

function RequestRow({
  request,
  showPeople,
  selected,
  onToggle,
  onDeleted,
  onRefresh,
}: {
  request: InternalRequest;
  showPeople: boolean;
  selected: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[32px_auto_auto_1fr_44px] items-center gap-x-3 gap-y-2 py-3.5 pr-2 pl-4 hover:bg-accent",
        COLUMNS,
        selected && "bg-accent shadow-[inset_3px_0_0_var(--primary)]",
      )}
    >
      <span className="col-start-1 row-start-1 self-start pt-0.5 md:self-center md:pt-0">
        <SelectionCheckbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Selecionar #${request.id} ${request.title}`}
        />
      </span>
      <span className="col-[2/5] row-start-1 grid min-w-0 gap-0.5 md:col-[2/3]">
        <Link
          href={`/requests/${request.id}`}
          className="rounded-sm font-bold [overflow-wrap:anywhere] outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid md:truncate"
        >
          {request.title}
        </Link>
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
      <span className="col-start-3 row-start-2 md:col-start-3 md:row-start-1">
        <PriorityBadge priority={request.priority} />
      </span>
      <span className="col-start-2 row-start-2 md:col-start-4 md:row-start-1">
        <StatusBadge status={request.status} />
      </span>
      <span className="hidden text-[13px] text-muted-foreground md:col-start-5 md:row-start-1 md:block">
        {formatDateTime(request.created_at)}
      </span>
      <span className="col-start-5 row-start-1 self-start md:col-start-6 md:self-center">
        <RequestRowActions
          request={request}
          onDeleted={onDeleted}
          onRefresh={onRefresh}
        />
      </span>
    </div>
  );
}

export function RequestList({
  requests,
  isSelected,
  toggle,
  allSelected,
  someSelected,
  toggleAll,
  onRefresh,
}: { requests: InternalRequest[]; onRefresh: () => void } & Selection) {
  const { user } = useAuth();
  // The requester only sees their own requests: who and where is redundant.
  const showPeople = user.role !== "requester";

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      <div
        className={cn(
          "grid grid-cols-[32px_1fr] items-center gap-3 bg-background py-2.5 pr-2 pl-4 text-xs leading-[18px] font-bold tracking-[0.05em] text-muted-foreground uppercase",
          COLUMNS,
        )}
      >
        <SelectionCheckbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={toggleAll}
          aria-label="Selecionar todas desta página"
        />
        <span
          aria-hidden="true"
          className="text-[13px] tracking-normal normal-case md:hidden"
        >
          Selecionar todas desta página
        </span>
        <span aria-hidden="true" className="hidden md:block">
          Solicitação
        </span>
        <span aria-hidden="true" className="hidden md:block">
          Prioridade
        </span>
        <span aria-hidden="true" className="hidden md:block">
          Status
        </span>
        <span aria-hidden="true" className="hidden md:block">
          Criada em
        </span>
      </div>
      {requests.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          showPeople={showPeople}
          selected={isSelected(request.id)}
          onToggle={() => toggle(request.id)}
          onDeleted={() => {
            toast.success("Solicitação excluída");
            onRefresh();
          }}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
