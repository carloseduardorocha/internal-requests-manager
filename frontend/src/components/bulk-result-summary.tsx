"use client";

import { TriangleAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { BulkResult } from "@/lib/bulk";

// What a bulk action left out. It takes the focus when it appears, because
// the bar that started the action is gone by then.
export function BulkResultSummary({
  result,
  title,
  labelFor,
  onClose,
}: {
  result: BulkResult;
  title: string;
  labelFor: (id: number) => string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const count = result.skipped.length;

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <section
      ref={ref}
      role="status"
      tabIndex={-1}
      className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 rounded-lg border border-l-4 border-border border-l-warning bg-card py-3.5 pr-2 pl-4 outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
    >
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-5 text-warning"
      />
      <div className="min-w-0">
        <b className="block">{title}</b>
        <p className="text-muted-foreground">
          {count === 1 ? "1 ficou de fora:" : `${count} ficaram de fora:`}
        </p>
        <ul className="mt-2 grid gap-1.5 text-sm">
          {result.skipped.map((item) => (
            <li key={item.id} className="[overflow-wrap:anywhere]">
              {labelFor(item.id)}
              <small className="block text-muted-foreground">
                {item.message}
              </small>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        aria-label="Fechar resumo"
        onClick={onClose}
        className="-mt-2.5 grid size-11 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-hidden hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </section>
  );
}
