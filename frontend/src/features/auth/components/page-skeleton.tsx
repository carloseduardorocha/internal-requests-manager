import { Inbox } from "lucide-react";

// Placeholder for pages built by later issues: title and an empty state.
export function PageSkeleton({ title }: { title: string }) {
  return (
    <>
      <h1 className="font-heading text-[26px] font-extrabold">{title}</h1>
      <div className="grid place-items-center gap-2 rounded-lg border border-border bg-card px-5 py-12 text-center text-muted-foreground shadow-sm">
        <Inbox aria-hidden="true" className="size-8" />
        <p>Nada por aqui ainda.</p>
      </div>
    </>
  );
}
