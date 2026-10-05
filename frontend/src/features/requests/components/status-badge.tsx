import {
  Circle,
  CircleCheck,
  CircleX,
  Clock,
  type LucideIcon,
} from "lucide-react";

import { statusLabels } from "@/features/requests/labels";
import type { InternalRequestStatus } from "@/features/requests/types";

export const statusStyles: Record<
  InternalRequestStatus,
  { icon: LucideIcon; colors: string }
> = {
  open: {
    icon: Circle,
    colors: "bg-status-open-bg text-status-open-fg",
  },
  in_review: {
    icon: Clock,
    colors: "bg-status-review-bg text-status-review-fg",
  },
  approved: {
    icon: CircleCheck,
    colors: "bg-status-approved-bg text-status-approved-fg",
  },
  rejected: {
    icon: CircleX,
    colors: "bg-status-rejected-bg text-status-rejected-fg",
  },
};

// Icon, text and color together: the status is never only a color.
export function StatusBadge({ status }: { status: InternalRequestStatus }) {
  const { icon: Icon, colors } = statusStyles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-[18px] font-bold whitespace-nowrap ${colors}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {statusLabels[status]}
    </span>
  );
}
