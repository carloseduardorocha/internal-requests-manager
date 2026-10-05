"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteInternalRequest } from "@/features/requests/api";
import type { InternalRequest } from "@/features/requests/types";
import { ApiError } from "@/lib/api";

// Confirms before deleting. On a 409 (the request is no longer Open) it shows
// the API message and asks the screen to reload.
export function DeleteRequestDialog({
  request,
  onConflict,
}: {
  request: Pick<InternalRequest, "id" | "title">;
  onConflict: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await deleteInternalRequest(request.id);
      toast.success("Solicitação excluída");
      router.replace("/requests");
    } catch (error) {
      setDeleting(false);
      setOpen(false);
      toast.error("Não foi possível excluir", {
        description:
          error instanceof ApiError
            ? error.message
            : "Não foi possível concluir a ação. Tente novamente.",
      });
      if (error instanceof ApiError && error.status === 409) onConflict();
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !deleting && setOpen(next)}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="text-destructive hover:border-destructive hover:bg-status-rejected-bg hover:text-destructive max-[480px]:flex-1"
        >
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta solicitação?</AlertDialogTitle>
          <AlertDialogDescription>
            “{request.title}” sai das listas e do painel. Não é possível
            desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting} className="max-sm:flex-1">
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={handleConfirm}
            className="max-sm:flex-1"
          >
            {deleting ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
