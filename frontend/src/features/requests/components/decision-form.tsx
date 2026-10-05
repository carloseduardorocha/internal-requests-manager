"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DecisionConfirmDialog,
  type DecisionKind,
} from "@/features/requests/components/decision-confirm-dialog";
import type { InternalRequest } from "@/features/requests/types";

const JUSTIFICATION_MAX = 10000;

// Same count as Laravel's mb_strlen: one per code point (an emoji is 1).
function validate(justification: string): string | undefined {
  if (justification === "") return "O campo justificativa é obrigatório.";
  if ([...justification].length > JUSTIFICATION_MAX)
    return "A justificativa deve ter no máximo 10.000 caracteres.";
  return undefined;
}

// Justification plus the buttons the API allows (`can.approve`, `can.reject`).
export function DecisionForm({
  request,
  onRefresh,
}: {
  request: Pick<InternalRequest, "id" | "can">;
  onRefresh: () => void;
}) {
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string>();
  const [decided, setDecided] = useState(false);
  const [pending, setPending] = useState<DecisionKind | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  function ask(decision: DecisionKind) {
    const found = validate(justification.trim());
    setError(found);
    if (found) {
      ref.current?.focus();
      return;
    }
    setPending(decision);
  }

  function handleInvalid(message: string) {
    setError(message);
  }

  return (
    <form
      noValidate
      onSubmit={(event: FormEvent) => event.preventDefault()}
      className="grid gap-3.5"
    >
      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="justification" className="text-[13px] font-bold">
          Justificativa
        </Label>
        <Textarea
          id="justification"
          ref={ref}
          maxLength={JUSTIFICATION_MAX}
          readOnly={decided}
          value={justification}
          placeholder="Explique o motivo da decisão."
          onChange={(event) => {
            setJustification(event.target.value);
            setError(undefined);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? "justification-error" : "justification-help"
          }
          className="min-h-28"
        />
        {error ? (
          <span id="justification-error" className="text-xs text-destructive">
            {error}
          </span>
        ) : (
          <p
            id="justification-help"
            className="text-[13px] text-muted-foreground"
          >
            O solicitante vê a justificativa. A decisão não pode ser alterada
            depois.
          </p>
        )}
      </div>

      <div className="flex gap-2 min-[481px]:justify-end">
        {request.can.reject && (
          <Button
            type="button"
            variant="outline"
            disabled={decided}
            onClick={() => ask("reject")}
            className="flex-1 text-destructive hover:border-destructive hover:bg-status-rejected-bg hover:text-destructive min-[481px]:flex-none"
          >
            <CircleX aria-hidden="true" />
            Rejeitar
          </Button>
        )}
        {request.can.approve && (
          <Button
            type="button"
            disabled={decided}
            onClick={() => ask("approve")}
            className="flex-1 min-[481px]:flex-none"
          >
            <CircleCheck aria-hidden="true" />
            Aprovar
          </Button>
        )}
      </div>

      <DecisionConfirmDialog
        requestId={request.id}
        decision={pending}
        justification={justification.trim()}
        onClose={() => setPending(null)}
        onInvalid={handleInvalid}
        onRestoreFocus={() => ref.current?.focus()}
        onDecided={() => setDecided(true)}
        onRefresh={onRefresh}
      />
    </form>
  );
}
