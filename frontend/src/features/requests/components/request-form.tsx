"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createInternalRequest,
  updateInternalRequest,
} from "@/features/requests/api";
import { PriorityBadge } from "@/features/requests/components/priority-badge";
import { prioritiesAscending } from "@/features/requests/labels";
import type {
  InternalRequest,
  InternalRequestPriority,
} from "@/features/requests/types";
import { ApiError } from "@/lib/api";

const TITLE_MAX = 255;
const DESCRIPTION_MAX = 10000;

type Field = "title" | "description" | "priority";
type FieldErrors = Partial<Record<Field, string>>;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <span id={id} className="text-xs text-destructive">
      {message}
    </span>
  );
}

function validate(
  title: string,
  description: string,
  priority: InternalRequestPriority | "",
): FieldErrors {
  const errors: FieldErrors = {};

  if (title === "") errors.title = "O campo título é obrigatório.";
  else if (title.length > TITLE_MAX)
    errors.title = `O título deve ter no máximo ${TITLE_MAX} caracteres.`;

  if (description === "")
    errors.description = "O campo descrição é obrigatório.";
  else if (description.length > DESCRIPTION_MAX)
    errors.description = "A descrição deve ter no máximo 10.000 caracteres.";

  if (priority === "") errors.priority = "O campo prioridade é obrigatório.";

  return errors;
}

// Creates a request, or edits one when `request` is given.
export function RequestForm({ request }: { request?: InternalRequest }) {
  const router = useRouter();
  const [title, setTitle] = useState(request?.title ?? "");
  const [description, setDescription] = useState(request?.description ?? "");
  const [priority, setPriority] = useState<InternalRequestPriority | "">(
    request?.priority ?? "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const editing = request !== undefined;
  const cancelHref = editing ? `/requests/${request.id}` : "/requests";

  function clearError(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const found = validate(trimmedTitle, trimmedDescription, priority);

    setErrors(found);
    if (Object.keys(found).length > 0 || priority === "") return;

    const payload = {
      title: trimmedTitle,
      description: trimmedDescription,
      priority,
    };

    setSubmitting(true);
    try {
      const saved = editing
        ? await updateInternalRequest(request.id, payload)
        : await createInternalRequest(payload);

      toast.success(editing ? "Alterações salvas" : "Solicitação criada");
      router.replace(`/requests/${saved.id}`);
    } catch (error) {
      setSubmitting(false);

      if (error instanceof ApiError && error.status === 422) {
        setErrors({
          title: error.errors.title?.[0],
          description: error.errors.description?.[0],
          priority: error.errors.priority?.[0],
        });
        return;
      }

      toast.error("Não foi possível salvar", {
        description:
          error instanceof ApiError
            ? error.message
            : "Não foi possível concluir a ação. Tente novamente.",
      });

      // No longer Open (409) or gone (404): leave the form.
      if (editing && error instanceof ApiError) {
        if (error.status === 409) router.replace(cancelHref);
        if (error.status === 404) router.replace("/requests");
      }
    }
  }

  return (
    <section className="w-full max-w-[720px] rounded-lg border border-border bg-card p-5 shadow-sm">
      <form noValidate onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="title" className="text-[13px] font-bold">
              Título
            </Label>
            <span
              className={`text-xs ${title.length > TITLE_MAX ? "text-destructive" : "text-muted-foreground"}`}
            >
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <Input
            id="title"
            value={title}
            placeholder="Ex.: Notebook para a nova analista"
            onChange={(event) => {
              setTitle(event.target.value);
              clearError("title");
            }}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          <FieldError id="title-error" message={errors.title} />
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="description" className="text-[13px] font-bold">
            Descrição
          </Label>
          <Textarea
            id="description"
            value={description}
            placeholder="Explique o que você precisa e por quê."
            onChange={(event) => {
              setDescription(event.target.value);
              clearError("description");
            }}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
          />
          <FieldError id="description-error" message={errors.description} />
        </div>

        <div className="grid gap-1.5">
          <fieldset
            aria-describedby={errors.priority ? "priority-error" : undefined}
            className="grid min-w-0 grid-cols-3 gap-2"
          >
            <legend className="mb-1.5 p-0 text-[13px] font-bold">
              Prioridade
            </legend>
            {prioritiesAscending.map((option) => (
              <label
                key={option}
                className={`relative flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-background font-bold has-checked:border-primary has-checked:bg-accent has-checked:shadow-[inset_0_0_0_1px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid ${errors.priority ? "border-destructive" : "border-border-strong"}`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={option}
                  checked={priority === option}
                  onChange={() => {
                    setPriority(option);
                    clearError("priority");
                  }}
                  className="absolute inset-0 m-0 cursor-pointer opacity-0"
                />
                <PriorityBadge priority={option} />
              </label>
            ))}
          </fieldset>
          <FieldError id="priority-error" message={errors.priority} />
        </div>

        <div className="flex flex-col-reverse gap-2 min-[481px]:flex-row min-[481px]:justify-end">
          <Button asChild variant="outline">
            <Link href={cancelHref}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && (
              <Loader2 aria-hidden="true" className="animate-spin" />
            )}
            {submitting
              ? "Salvando…"
              : editing
                ? "Salvar alterações"
                : "Criar solicitação"}
          </Button>
        </div>
      </form>
    </section>
  );
}
