import { ChartNoAxesColumn } from "lucide-react";

import { CARD } from "@/features/dashboard/components/stat-cards";
import type { Dashboard } from "@/features/dashboard/types";
import { PriorityBadge } from "@/features/requests/components/priority-badge";
import { priorities } from "@/features/requests/labels";
import type { InternalRequestPriority } from "@/features/requests/types";

const fills: Record<InternalRequestPriority, string> = {
  low: "fill-priority-low",
  medium: "fill-priority-mid",
  high: "fill-priority-high",
};

function percent(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export function PriorityDistribution({ data }: { data: Dashboard }) {
  return (
    <section aria-labelledby="h-prio" className={`${CARD} min-h-0 p-5`}>
      <h2
        id="h-prio"
        className="mb-3 text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase"
      >
        Por prioridade
      </h2>
      {data.total === 0 ? (
        <div className="grid place-items-center gap-2.5 px-3 py-6 text-center text-muted-foreground">
          <ChartNoAxesColumn aria-hidden="true" className="size-9" />
          <p className="max-w-[360px]">
            Sem solicitações para distribuir por prioridade.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {priorities.map((priority) => {
            const n = data.by_priority[priority];
            const pct = percent(n, data.total);
            return (
              <li
                key={priority}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 md:grid-cols-[110px_1fr_120px]"
              >
                <PriorityBadge priority={priority} />
                <svg
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="order-last col-span-full h-3 w-full overflow-hidden rounded-full border border-border md:order-none md:col-span-1"
                >
                  <rect width="100" height="12" className="fill-background" />
                  <rect width={pct} height="12" className={fills[priority]} />
                </svg>
                <span className="text-[13px] whitespace-nowrap text-muted-foreground md:text-right">
                  <b className="text-[15px] text-foreground">{n}</b> · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
