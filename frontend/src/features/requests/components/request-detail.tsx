import { Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { AssignRequestButton } from "@/features/requests/components/assign-request-button";
import { DecisionForm } from "@/features/requests/components/decision-form";
import { DeleteRequestDialog } from "@/features/requests/components/delete-request-dialog";
import { PriorityBadge } from "@/features/requests/components/priority-badge";
import { StatusBadge } from "@/features/requests/components/status-badge";
import { StatusTimeline } from "@/features/requests/components/status-timeline";
import { formatDateTime } from "@/features/requests/format";
import type { InternalRequest } from "@/features/requests/types";

function Section({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <h2 className="mb-3 text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs leading-[18px] font-bold text-muted-foreground">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function DecisionSection({
  request,
  onRefresh,
}: {
  request: InternalRequest;
  onRefresh: () => void;
}) {
  const { decision, status, can } = request;

  if (!decision) {
    return (
      <Section title="Decisão" className="border-l-4 border-l-border-strong">
        {can.approve || can.reject ? (
          <DecisionForm request={request} onRefresh={onRefresh} />
        ) : (
          <p className="text-muted-foreground italic">
            {status === "open" || !request.assigned_to ? (
              "Aguardando um analista assumir."
            ) : (
              <>
                Em análise com{" "}
                <b className="text-foreground not-italic">
                  {request.assigned_to.name}
                </b>
                . Aguardando a decisão.
              </>
            )}
          </p>
        )}
      </Section>
    );
  }

  const accent =
    status === "approved"
      ? "border-l-status-approved-fg"
      : "border-l-status-rejected-fg";

  return (
    <Section title="Decisão" className={`border-l-4 ${accent}`}>
      <StatusBadge status={status} />
      <blockquote className="mt-2 [overflow-wrap:anywhere] whitespace-pre-line">
        {decision.justification}
      </blockquote>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {decision.decided_by.name} · {formatDateTime(decision.decided_at)}
      </p>
    </Section>
  );
}

// The actions come from the API (`can`): it already considers the role, who
// took the request and the status.
export function RequestDetail({
  request,
  onRefresh,
}: {
  request: InternalRequest;
  onRefresh: () => void;
}) {
  const { can } = request;

  return (
    <div className="grid gap-5">
      <header className="grid gap-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-mono text-[13px]">#{request.id}</span>
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
        </div>
        <h1
          id="request-title"
          tabIndex={-1}
          className="font-heading text-2xl leading-9 font-extrabold [overflow-wrap:anywhere] outline-hidden"
        >
          {request.title}
        </h1>
        {(can.assign || can.update || can.delete) && (
          <div className="flex flex-wrap gap-2">
            {can.assign && (
              <AssignRequestButton
                requestId={request.id}
                onRefresh={onRefresh}
              />
            )}
            {can.update && (
              <Button asChild variant="outline" className="max-[480px]:flex-1">
                <Link href={`/requests/${request.id}/edit`}>
                  <Pencil aria-hidden="true" />
                  Editar
                </Link>
              </Button>
            )}
            {can.delete && (
              <DeleteRequestDialog request={request} onRefresh={onRefresh} />
            )}
          </div>
        )}
      </header>

      <div className="grid gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_320px] min-[900px]:items-start">
        <div className="grid gap-4">
          <Section title="Descrição">
            <p className="[overflow-wrap:anywhere] whitespace-pre-line">
              {request.description}
            </p>
          </Section>
          <DecisionSection request={request} onRefresh={onRefresh} />
          <Section title="Histórico">
            <StatusTimeline history={request.history ?? []} />
          </Section>
        </div>

        <Section title="Dados">
          <dl className="grid gap-3">
            <Fact label="Solicitante">{request.requester.name}</Fact>
            <Fact label="Área">{request.area.name}</Fact>
            <Fact label="Criada em">{formatDateTime(request.created_at)}</Fact>
            <Fact label="Responsável">
              {request.assigned_to ? (
                <>
                  {request.assigned_to.name}
                  {request.assigned_at && (
                    <small className="block text-[12.5px] text-muted-foreground">
                      desde {formatDateTime(request.assigned_at)}
                    </small>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground italic">
                  Ainda ninguém assumiu
                </span>
              )}
            </Fact>
          </dl>
        </Section>
      </div>
    </div>
  );
}
