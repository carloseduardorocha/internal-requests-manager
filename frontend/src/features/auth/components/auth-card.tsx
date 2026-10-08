import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function AuthCard({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={cn(
        "rounded-lg border border-border bg-card px-5 py-6 shadow-sm min-[481px]:px-7 min-[481px]:py-8",
        className,
      )}
    />
  );
}
