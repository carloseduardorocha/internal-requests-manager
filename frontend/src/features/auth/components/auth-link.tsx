import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        "-my-3 inline-flex min-h-11 items-center rounded text-[13px] font-bold text-primary underline underline-offset-2 outline-hidden hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    />
  );
}
