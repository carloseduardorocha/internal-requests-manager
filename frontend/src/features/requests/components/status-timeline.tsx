import { formatDateTime } from "@/features/requests/format";
import { statusLabels } from "@/features/requests/labels";
import type { StatusChange } from "@/features/requests/types";

export function StatusTimeline({ history }: { history: StatusChange[] }) {
  return (
    <ol className="pl-1">
      {history.map((change) => (
        <li
          key={`${change.to_status}-${change.created_at}`}
          className="relative border-l-2 border-border pb-4 pl-[22px] before:absolute before:top-[3px] before:-left-[7px] before:size-3 before:rounded-full before:border-2 before:border-card before:bg-brand before:content-[''] last:border-l-transparent last:pb-0"
        >
          <b>{statusLabels[change.to_status]}</b>
          <small className="block text-[12.5px] text-muted-foreground">
            {change.changed_by.name} · {formatDateTime(change.created_at)}
          </small>
        </li>
      ))}
    </ol>
  );
}
