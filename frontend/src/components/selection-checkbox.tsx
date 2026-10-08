"use client";

import type { ComponentProps } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// The list checkbox: an 18px box with a 44px touch area and an indeterminate
// state (some, but not all, selected).
export function SelectionCheckbox({
  className,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, "checked" | "onCheckedChange"> & {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean | "indeterminate") => void;
  "aria-label": string;
}) {
  return (
    <Checkbox
      {...props}
      className={cn(
        "size-[18px] cursor-pointer rounded-[4px] border-2 border-border-strong bg-card after:-inset-[13px] hover:border-primary focus-visible:border-border-strong focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:focus-visible:border-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:focus-visible:border-primary dark:bg-card dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary",
        className,
      )}
    />
  );
}
