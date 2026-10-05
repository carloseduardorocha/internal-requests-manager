"use client";

import { Hand, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { assignInternalRequest } from "@/features/requests/api";
import { ApiError } from "@/lib/api";

// Takes the request for review, with no confirmation. On success, and on a
// 403, 404 or 409, it asks the screen to reload.
export function AssignRequestButton({
  requestId,
  onRefresh,
}: {
  requestId: number;
  onRefresh: () => void;
}) {
  const [assigning, setAssigning] = useState(false);

  async function handleClick() {
    setAssigning(true);
    try {
      await assignInternalRequest(requestId);
      toast.success("Análise assumida");
      onRefresh();
    } catch (error) {
      // On success the button stays busy until the screen swaps it out.
      setAssigning(false);
      // Expired session: the API client is already sending the user to the login.
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        return;
      }
      toast.error("Não foi possível assumir", {
        description:
          error instanceof ApiError
            ? error.message
            : "Não foi possível concluir a ação. Tente novamente.",
      });
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) {
        onRefresh();
      }
    }
  }

  return (
    <Button
      disabled={assigning}
      onClick={handleClick}
      className="max-[480px]:flex-1"
    >
      {assigning ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <Hand aria-hidden="true" />
      )}
      {assigning ? "Assumindo…" : "Assumir análise"}
    </Button>
  );
}
