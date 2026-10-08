"use client";

import { Eye, EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteRequestDialog } from "@/features/requests/components/delete-request-dialog";
import type { InternalRequest } from "@/features/requests/types";

const itemClass =
  "min-h-11 cursor-pointer gap-2 rounded-lg px-3 font-bold text-foreground focus:bg-accent focus:text-accent-foreground";

// The row's "⋯" menu: view always, edit and delete as the API allows (`can`).
export function RequestRowActions({
  request,
  onDeleted,
  onRefresh,
}: {
  request: InternalRequest;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={triggerRef}
          aria-label={`Ações de #${request.id} ${request.title}`}
          className="grid size-11 cursor-pointer place-items-center rounded-lg border border-transparent text-muted-foreground outline-hidden transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:border-border data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <EllipsisVertical aria-hidden="true" className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-lg ring-0"
        >
          <DropdownMenuItem asChild className={itemClass}>
            <Link href={`/requests/${request.id}`}>
              <Eye aria-hidden="true" />
              Visualizar
            </Link>
          </DropdownMenuItem>
          {request.can.update && (
            <DropdownMenuItem asChild className={itemClass}>
              <Link href={`/requests/${request.id}/edit`}>
                <Pencil aria-hidden="true" />
                Editar
              </Link>
            </DropdownMenuItem>
          )}
          {request.can.delete && (
            <DropdownMenuItem
              className={`${itemClass} text-destructive focus:bg-status-rejected-bg focus:text-status-rejected-fg`}
              onSelect={() => setDeleting(true)}
            >
              <Trash2 aria-hidden="true" />
              Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {request.can.delete && (
        <DeleteRequestDialog
          request={request}
          open={deleting}
          onOpenChange={setDeleting}
          onCloseFocus={() => triggerRef.current?.focus()}
          onDeleted={onDeleted}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
