"use client";

import {
  Ban,
  EllipsisVertical,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reactivateUser } from "@/features/users/api";
import { failureMessage } from "@/features/users/api-error";
import { DeactivateUserDialog } from "@/features/users/components/deactivate-user-dialog";
import { EditUserDialog } from "@/features/users/components/edit-user-dialog";
import type { ManagedUser } from "@/features/users/types";
import type { Area } from "@/lib/types";

const itemClass =
  "min-h-11 cursor-pointer gap-2 rounded-lg px-3 font-bold text-foreground focus:bg-accent focus:text-accent-foreground";

// The row's "⋯" menu, driven by what the API says the administrator can do.
export function UserRowActions({
  user,
  areas,
  onUpdated,
}: {
  user: ManagedUser;
  areas: Area[];
  onUpdated: (user: ManagedUser) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  async function handleReactivate() {
    setReactivating(true);
    try {
      const updated = await reactivateUser(user.id);
      onUpdated(updated);
      toast.success("Conta reativada", {
        description: `${user.name} pode entrar de novo com a mesma senha.`,
      });
    } catch (error) {
      const message = failureMessage(error);
      if (message !== null) {
        toast.error("Não foi possível reativar", { description: message });
      }
    } finally {
      setReactivating(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={reactivating}
          aria-label={`Ações de ${user.name}`}
          className="grid size-11 cursor-pointer place-items-center rounded-lg border border-transparent text-muted-foreground outline-hidden transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed data-[state=open]:border-border data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          {reactivating ? (
            <Loader2 aria-hidden="true" className="size-[18px] animate-spin" />
          ) : (
            <EllipsisVertical aria-hidden="true" className="size-[18px]" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 min-w-[200px] rounded-lg border border-border bg-card p-1 shadow-lg ring-0"
        >
          {user.can.update && (
            <DropdownMenuItem
              className={itemClass}
              onSelect={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" />
              Editar
            </DropdownMenuItem>
          )}
          {user.can.deactivate && (
            <DropdownMenuItem
              className={`${itemClass} text-destructive focus:bg-status-rejected-bg focus:text-status-rejected-fg`}
              onSelect={() => setDeactivating(true)}
            >
              <Ban aria-hidden="true" />
              Desativar
            </DropdownMenuItem>
          )}
          {user.can.reactivate && (
            <DropdownMenuItem
              className={itemClass}
              onSelect={() => void handleReactivate()}
            >
              <RotateCcw aria-hidden="true" />
              Reativar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog
        user={user}
        areas={areas}
        open={editing}
        onOpenChange={setEditing}
        onSaved={onUpdated}
      />
      <DeactivateUserDialog
        user={user}
        open={deactivating}
        onOpenChange={setDeactivating}
        onDeactivated={onUpdated}
      />
    </>
  );
}
