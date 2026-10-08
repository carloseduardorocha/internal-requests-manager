"use client";

import { Ban, Loader2 } from "lucide-react";

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

// Confirms before cutting the access of the selected accounts: the sessions
// end at once. It stays open while the call runs.
export function BulkDeactivateDialog({
  count,
  name,
  open,
  busy,
  onOpenChange,
  onCloseFocus,
  onConfirm,
}: {
  count: number;
  // The account's name when only one is selected.
  name: string;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes when the dialog closes (it has no trigger).
  onCloseFocus?: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseFocus?.();
        }}
        className="gap-[18px]"
      >
        <AlertDialogHeader className="place-items-start gap-1.5 text-left">
          <AlertDialogTitle>
            {count === 1 ? `Desativar ${name}?` : `Desativar ${count} contas?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-[15px]">
            As pessoas deixam de entrar no sistema e as sessões delas terminam
            na hora. Os pedidos e o histórico continuam com o nome delas. Você
            pode reativar as contas depois. Contas que já estão desativadas
            ficam de fora e aparecem no resumo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3">
          <AlertDialogCancel disabled={busy} className="max-[480px]:flex-1">
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={onConfirm}
            className="max-[480px]:flex-1"
          >
            {busy ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Ban aria-hidden="true" />
            )}
            Desativar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
