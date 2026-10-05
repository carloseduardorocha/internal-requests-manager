import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";

import { priorityLabels } from "@/features/requests/labels";
import type { InternalRequestPriority } from "@/features/requests/types";

export const priorityStyles: Record<
  InternalRequestPriority,
  { icon: LucideIcon; color: string }
> = {
  low: { icon: ArrowDown, color: "text-priority-low" },
  medium: { icon: ArrowRight, color: "text-priority-mid" },
  high: { icon: ArrowUp, color: "text-priority-high" },
};

// Arrow and text, no background.
export function PriorityBadge({
  priority,
}: {
  priority: InternalRequestPriority;
}) {
  const { icon: Icon, color } = priorityStyles[priority];

  return (
    <span
      className={`inline-flex items-center gap-1 text-[13px] font-bold whitespace-nowrap ${color}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {priorityLabels[priority]}
    </span>
  );
}
