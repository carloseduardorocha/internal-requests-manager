"use client";

import { Loader2, MailX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import { PasswordInput } from "@/features/auth/components/password-input";
import { homeFor } from "@/features/auth/routes";
import { acceptInvitation, getInvitation } from "@/features/users/api";
import { roleLabels } from "@/features/users/labels";
import type { Invitation } from "@/features/users/types";
import { ApiError } from "@/lib/api";

const MIN_PASSWORD = 8;

type FieldErrors = { password?: string; confirmation?: string };
type Status =
  | { kind: "checking" }
  | { kind: "ready"; invitation: Invitation }
  | { kind: "unavailable" };

function InvitationUnavailable({ message }: { message: string }) {
  return (
    <AuthCard aria-labelledby="gone-title" className="text-center">
      <span className="mb-3 inline-grid size-14 place-items-center rounded-full bg-status-rejected-bg text-status-rejected-fg">
        <MailX aria-hidden="true" className="size-7" />
      </span>
      <h1
        id="gone-title"
        className="font-heading text-2xl leading-normal font-extrabold"
      >
        Convite indisponível
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">{message}</p>
      <Button
        asChild
        variant="outline"
        className="min-h-12 w-full rounded-lg px-6 text-[15px]"
      >
        <Link href="/login">Ir para o login</Link>
      </Button>
    </AuthCard>
  );
}

const GONE_MESSAGE =
  "Este convite expirou ou já foi usado. Peça um novo convite ao administrador.";

function InvitationSkeleton() {
  return (
    <AuthCard aria-busy="true" aria-label="Carregando convite">
      <span className="sr-only">Carregando convite…</span>
      <div className="mb-2.5 h-7 w-[55%] animate-pulse rounded-lg bg-border" />
      <div className="mb-5 h-4 w-[80%] animate-pulse rounded-lg bg-border" />
      <div className="mb-5 h-33 animate-pulse rounded-lg bg-border" />
      <div className="mb-4 h-12 animate-pulse rounded-lg bg-border" />
      <div className="mb-4 h-12 animate-pulse rounded-lg bg-border" />
    </AuthCard>
  );
}

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(
    token === "" ? { kind: "unavailable" } : { kind: "checking" },
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token === "") return;

    let active = true;
    getInvitation(token).then(
      (invitation) => {
        if (active) setStatus({ kind: "ready", invitation });
      },
      () => {
        // The API answers one 404 for every dead link; any other failure
        // leaves nothing the person can do here either.
        if (active) setStatus({ kind: "unavailable" });
      },
    );
    return () => {
      active = false;
    };
  }, [token]);

  if (status.kind === "checking") return <InvitationSkeleton />;
  if (status.kind === "unavailable") {
    return <InvitationUnavailable message={GONE_MESSAGE} />;
  }

  const { invitation } = status;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {};
    if (password.length < MIN_PASSWORD) {
      errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
    }
    if (confirmation !== password) {
      errors.confirmation = "As senhas não conferem.";
    }

    setFieldErrors(errors);
    setFailed(false);
    if (errors.password || errors.confirmation) return;

    setSubmitting(true);
    try {
      const user = await acceptInvitation(token, {
        password,
        password_confirmation: confirmation,
      });
      router.replace(homeFor(user.role));
    } catch (error) {
      setSubmitting(false);

      if (error instanceof ApiError && error.status === 404) {
        setStatus({ kind: "unavailable" });
      } else if (error instanceof ApiError && error.status === 422) {
        setFieldErrors({
          password: error.errors.password?.[0] ?? error.message,
        });
      } else {
        setFailed(true);
      }
    }
  }

  const summary: [string, string][] = [
    ["Nome", invitation.name],
    ["E-mail", invitation.email],
    ["Perfil", roleLabels[invitation.role]],
    ["Área", invitation.area.name],
  ];

  return (
    <AuthCard aria-labelledby="accept-title">
      <h1
        id="accept-title"
        className="font-heading text-2xl leading-normal font-extrabold"
      >
        Criar sua conta
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Confira seus dados e crie a senha para entrar.
      </p>

      <dl className="mb-5 grid gap-2 rounded-lg border border-border bg-background px-3.5 py-3">
        {summary.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[64px_1fr] gap-3">
            <dt className="text-[13px] text-muted-foreground">{label}</dt>
            <dd className="font-bold [overflow-wrap:anywhere]">{value}</dd>
          </div>
        ))}
      </dl>

      {failed && (
        <AuthAlert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          Não foi possível criar a conta. Tente novamente.
        </AuthAlert>
      )}

      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        <input
          type="email"
          autoComplete="username"
          value={invitation.email}
          readOnly
          hidden
        />

        <div className="grid gap-1.5">
          <Label htmlFor="password" className="text-[13px] font-bold">
            Senha
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? "password-error" : "password-note"
            }
          />
          {fieldErrors.password ? (
            <FieldError id="password-error" message={fieldErrors.password} />
          ) : (
            <span
              id="password-note"
              className="text-xs leading-[18px] text-muted-foreground"
            >
              Mínimo de {MIN_PASSWORD} caracteres.
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label
            htmlFor="password-confirmation"
            className="text-[13px] font-bold"
          >
            Confirmar senha
          </Label>
          <PasswordInput
            id="password-confirmation"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={fieldErrors.confirmation ? true : undefined}
            aria-describedby={
              fieldErrors.confirmation ? "confirmation-error" : undefined
            }
          />
          <FieldError
            id="confirmation-error"
            message={fieldErrors.confirmation}
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-lg bg-primary px-6 text-[15px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting && (
            <Loader2 aria-hidden="true" className="animate-spin" />
          )}
          {submitting ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        Algum dado errado? Fale com o administrador que enviou o convite.
      </p>
    </AuthCard>
  );
}
