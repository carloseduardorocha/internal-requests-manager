"use client";

import { CircleCheck, CircleX, Loader2 } from "lucide-react";
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
import { decideInternalRequest } from "@/features/requests/api";
import { ApiError } from "@/lib/api";

export type DecisionKind = "approve" | "reject";

const COPY = {
  approve: {
    title: "Aprovar esta solicitação?",
    action: "Aprovar",
    busy: "Aprovando…",
    success: "Solicitação aprovada",
    Icon: CircleCheck,
  },
  reject: {
    title: "Rejeitar esta solicitação?",
    action: "Rejeitar",
    busy: "Rejeitando…",
    success: "Solicitação rejeitada",
    Icon: CircleX,
  },
} as const;

// Confirms a decision, which is final. Errors: 401/419 do nothing, 422 goes
// back to the form field, 403/404/409 show the API message and reload, and
// anything else keeps the typed text.
export function DecisionConfirmDialog({
  requestId,
  decision,
  justification,
  onClose,
  onInvalid,
  onRefresh,
}: {
  requestId: number;
  decision: DecisionKind | null;
  justification: string;
  onClose: () => void;
  onInvalid: (message: string) => void;
  onRefresh: () => void;
}) {
  const [deciding, setDeciding] = useState(false);
  // Keeps the copy while the dialog fades out after `decision` goes back to null.
  const [last, setLast] = useState<DecisionKind>("approve");
  if (decision && decision !== last) setLast(decision);
  const copy = COPY[decision ?? last];

  async function handleConfirm() {
    if (!decision) return;
    setDeciding(true);
    try {
      await decideInternalRequest(requestId, decision, justification);
      toast.success(copy.success);
      onClose();
      onRefresh();
    } catch (error) {
      onClose();
      // Expired session: the API client is already sending the user to the login.
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        onInvalid(error.errors.justification?.[0] ?? error.message);
        return;
      }
      toast.error("Não foi possível decidir", {
        description:
          error instanceof ApiError
            ? error.message
            : "Não foi possível concluir a ação. Tente novamente.",
      });
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
        onRefresh();
      }
    } finally {
      setDeciding(false);
    }
  }

  return (
    <AlertDialog
      open={decision !== null}
      onOpenChange={(next) => !next && !deciding && onClose()}
    >
      <AlertDialogContent className="gap-[18px]">
        <AlertDialogHeader className="place-items-start gap-1.5 text-left">
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-left text-[15px]">
            A decisão fica registrada com esta justificativa e não pode ser
            alterada depois.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <blockquote className="rounded-r-md border-l-[3px] border-l-border-strong bg-background px-3 py-2.5 text-sm [overflow-wrap:anywhere] whitespace-pre-line">
          {justification}
        </blockquote>
        <AlertDialogFooter className="flex-row gap-3">
          <AlertDialogCancel disabled={deciding} className="max-[480px]:flex-1">
            Cancelar
          </AlertDialogCancel>
          <Button
            variant={
              (decision ?? last) === "reject" ? "destructive" : "default"
            }
            disabled={deciding}
            onClick={handleConfirm}
            className="max-[480px]:flex-1"
          >
            {deciding ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <copy.Icon aria-hidden="true" />
            )}
            {deciding ? copy.busy : copy.action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
