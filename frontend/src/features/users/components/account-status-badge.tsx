import { Ban, CircleCheck, type LucideIcon } from "lucide-react";

import { accountStatusLabels } from "@/features/users/labels";
import type { AccountStatus } from "@/features/users/types";

const styles: Record<AccountStatus, { icon: LucideIcon; colors: string }> = {
  active: {
    icon: CircleCheck,
    colors: "bg-status-approved-bg text-status-approved-fg",
  },
  deactivated: {
    icon: Ban,
    colors: "border border-border-strong bg-background text-muted-foreground",
  },
};

// Icon, text and color together: the status is never only a color.
export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const { icon: Icon, colors } = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-[18px] font-bold whitespace-nowrap ${colors}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {accountStatusLabels[status]}
    </span>
  );
}
