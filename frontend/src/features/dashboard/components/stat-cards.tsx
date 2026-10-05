import { ArrowRight, List } from "lucide-react";
import Link from "next/link";

import { statusCardLabels } from "@/features/dashboard/labels";
import type { Dashboard } from "@/features/dashboard/types";
import { statusStyles } from "@/features/requests/components/status-badge";
import { statuses } from "@/features/requests/labels";

export const CARD =
  "rounded-lg border border-border bg-card text-card-foreground shadow-sm";
export const STAT_CARD = "relative grid min-h-28 content-start gap-1 p-4";

function plural(n: number) {
  return `${n} ${n === 1 ? "solicitação" : "solicitações"}`;
}

function StatCard({
  label,
  count,
  href,
  action,
  icon: Icon,
  iconColors,
  className = "",
}: {
  label: string;
  count: number;
  href: string;
  action: string;
  icon: typeof List;
  iconColors: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${plural(count)}. ${action}`}
      className={`${CARD} ${STAT_CARD} group outline-hidden transition-[border-color,box-shadow] hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
        <span
          className={`inline-grid size-7 place-items-center rounded-full ${iconColors}`}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        {label}
      </span>
      <span className="font-heading text-[32px] leading-[1.1] font-extrabold">
        {count}
      </span>
      <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-bold text-primary group-hover:underline">
        {action}
        <ArrowRight aria-hidden="true" className="size-4" />
      </span>
    </Link>
  );
}

export function StatCards({ data }: { data: Dashboard }) {
  return (
    <section aria-labelledby="h-status">
      <h2 id="h-status" className="sr-only">
        Solicitações por status
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          label="Total"
          count={data.total}
          href="/requests"
          action="Ver todas"
          icon={List}
          iconColors="bg-accent text-accent-foreground"
          className="col-span-2 border-l-4 border-l-brand md:col-span-1"
        />
        {statuses.map((status) => {
          const { icon, colors } = statusStyles[status];
          return (
            <StatCard
              key={status}
              label={statusCardLabels[status]}
              count={data.by_status[status]}
              href={`/requests?status=${status}`}
              action="Ver na lista"
              icon={icon}
              iconColors={colors}
            />
          );
        })}
      </div>
    </section>
  );
}
