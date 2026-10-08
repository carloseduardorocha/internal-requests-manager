"use client";

import { Ban, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { BulkActionBar } from "@/components/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { bulkDeactivateUsers, bulkReactivateUsers } from "@/features/users/api";
import { failureMessage } from "@/features/users/api-error";
import { BulkDeactivateDialog } from "@/features/users/components/bulk-deactivate-dialog";
import type { ManagedUser } from "@/features/users/types";
import { ApiError } from "@/lib/api";
import type { BulkResult } from "@/lib/bulk";

export type UserBulkAction = "deactivate" | "reactivate";

// The bar for the selected accounts. Each button shows only when it applies
// to at least one of them, according to what the API says they `can` do.
export function UserBulkActions({
  users,
  onClear,
  onStart,
  onDone,
  onForbidden,
}: {
  users: ManagedUser[];
  onClear: () => void;
  // A new action hides the summary of the last one.
  onStart: () => void;
  // The names are captured here, before the list reloads.
  onDone: (
    result: BulkResult,
    action: UserBulkAction,
    labels: Record<number, string>,
  ) => void;
  // The profile cannot use the action: the page clears and reloads.
  onForbidden: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Kept while the dialog closes, after the selection is cleared.
  const [snapshot, setSnapshot] = useState<ManagedUser[]>([]);
  const deactivateRef = useRef<HTMLButtonElement>(null);

  const canDeactivate = users.some((user) => user.can.deactivate);
  const canReactivate = users.some((user) => user.can.reactivate);

  async function run(action: UserBulkAction, chosen: ManagedUser[]) {
    const labels = Object.fromEntries(
      chosen.map((user) => [user.id, user.name]),
    );

    onStart();
    setBusy(true);
    try {
      const ids = chosen.map((user) => user.id);
      const result =
        action === "deactivate"
          ? await bulkDeactivateUsers(ids)
          : await bulkReactivateUsers(ids);
      onDone(result, action, labels);
    } catch (error) {
      const message = failureMessage(error);
      if (message !== null) {
        toast.error(
          action === "deactivate"
            ? "Não foi possível desativar"
            : "Não foi possível reativar",
          { description: message },
        );
      }
      if (error instanceof ApiError && error.status === 403) onForbidden();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  function askToDeactivate() {
    setSnapshot(users);
    setConfirming(true);
  }

  return (
    <>
      <BulkActionBar count={users.length} busy={busy} onClear={onClear}>
        {canReactivate && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run("reactivate", users)}
          >
            <RotateCcw aria-hidden="true" />
            Reativar
          </Button>
        )}
        {canDeactivate && (
          <Button
            ref={deactivateRef}
            variant="outline"
            disabled={busy}
            onClick={askToDeactivate}
            className="text-destructive hover:border-destructive hover:bg-status-rejected-bg hover:text-destructive"
          >
            <Ban aria-hidden="true" />
            Desativar
          </Button>
        )}
      </BulkActionBar>
      <BulkDeactivateDialog
        count={snapshot.length}
        name={snapshot[0]?.name ?? ""}
        open={confirming}
        busy={busy}
        onOpenChange={setConfirming}
        onCloseFocus={() => deactivateRef.current?.focus()}
        onConfirm={() => run("deactivate", snapshot)}
      />
    </>
  );
}
