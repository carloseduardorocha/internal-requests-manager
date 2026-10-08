import { ChevronDown } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function SelectField({
  id,
  label,
  className = "",
  invalid,
  describedBy,
  children,
  ...props
}: {
  id: string;
  label: string;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
  children: ReactNode;
  value: string;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className={`grid min-w-0 gap-1.5 ${className}`}>
      <Label htmlFor={id} className="text-[13px] font-bold">
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          {...props}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          className="min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-border-strong bg-background pr-9 pl-3 text-foreground outline-hidden focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  );
}
