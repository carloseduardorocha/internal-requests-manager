"use client";

import { Ban, Loader2 } from "lucide-react";
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
import { deactivateUser } from "@/features/users/api";
import { failureMessage } from "@/features/users/api-error";
import type { ManagedUser } from "@/features/users/types";

// Confirms before cutting the account's access: the session ends at once.
export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onCloseFocus,
  onDeactivated,
}: {
  user: ManagedUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes when the dialog closes (it has no trigger).
  onCloseFocus?: () => void;
  onDeactivated: (user: ManagedUser) => void;
}) {
  const [deactivating, setDeactivating] = useState(false);

  async function handleConfirm() {
    setDeactivating(true);
    try {
      const updated = await deactivateUser(user.id);
      onDeactivated(updated);
      toast.success("Conta desativada", {
        description: `${user.name} não consegue mais entrar.`,
      });
    } catch (error) {
      const message = failureMessage(error);
      if (message !== null) {
        toast.error("Não foi possível desativar", { description: message });
      }
    } finally {
      setDeactivating(false);
      onOpenChange(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !deactivating && onOpenChange(next)}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseFocus?.();
        }}
        className="gap-[18px]"
      >
        <AlertDialogHeader className="place-items-start gap-1.5 text-left">
          <AlertDialogTitle>Desativar {user.name}?</AlertDialogTitle>
          <AlertDialogDescription className="text-left text-[15px]">
            A pessoa deixa de entrar no sistema e a sessão dela termina na hora.
            Os pedidos e o histórico continuam com o nome dela. Você pode
            reativar a conta depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3">
          <AlertDialogCancel
            disabled={deactivating}
            className="max-[480px]:flex-1"
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deactivating}
            onClick={handleConfirm}
            className="max-[480px]:flex-1"
          >
            {deactivating ? (
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
