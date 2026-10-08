"use client";

import { Hand, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  bulkAssignInternalRequests,
  bulkDeleteInternalRequests,
} from "@/features/requests/api";
import { failureMessage } from "@/lib/api-error";
import { ApiError } from "@/lib/api";
import type { BulkResult } from "@/lib/bulk";
import type { Role } from "@/lib/types";

export type BulkRequestAction = "delete" | "assign";

// The bulk bar buttons: the requester and the administrator delete, the
// analyst and the administrator take. Deleting asks first. The API skips what
// the action does not apply to, so the selection is not filtered here.
export function BulkRequestActions({
  role,
  ids,
  busy,
  onBusyChange,
  onResult,
  onForbidden,
}: {
  role: Role;
  ids: number[];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onResult: (action: BulkRequestAction, result: BulkResult) => void;
  // The role changed during the session: the screen clears and reloads.
  onForbidden: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  async function run(action: BulkRequestAction) {
    onBusyChange(true);
    try {
      const result =
        action === "delete"
          ? await bulkDeleteInternalRequests(ids)
          : await bulkAssignInternalRequests(ids);
      onResult(action, result);
    } catch (error) {
      const message = failureMessage(error);
      if (message !== null) {
        toast.error(
          action === "delete"
            ? "Não foi possível excluir"
            : "Não foi possível assumir",
          { description: message },
        );
      }
      if (error instanceof ApiError && error.status === 403) onForbidden();
    } finally {
      onBusyChange(false);
      setConfirming(false);
    }
  }

  return (
    <>
      {role !== "requester" && (
        <Button disabled={busy} onClick={() => void run("assign")}>
          <Hand aria-hidden="true" />
          Assumir
        </Button>
      )}
      {role !== "analyst" && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className="text-destructive hover:border-destructive hover:bg-status-rejected-bg hover:text-destructive"
        >
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      )}

      <AlertDialog
        open={confirming}
        onOpenChange={(next) => !busy && setConfirming(next)}
      >
        <AlertDialogContent className="gap-[18px]">
          <AlertDialogHeader className="place-items-start gap-1.5 text-left">
            <AlertDialogTitle>
              {ids.length === 1
                ? "Excluir 1 solicitação?"
                : `Excluir ${ids.length} solicitações?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-[15px]">
              Só as que ainda estão Abertas e que você pode excluir saem das
              listas e do painel; as outras ficam de fora e aparecem no resumo.
              Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel disabled={busy} className="max-[480px]:flex-1">
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void run("delete")}
              className="max-[480px]:flex-1"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
