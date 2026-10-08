"use client";

import { Loader2, Lock, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/features/auth/api";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import {
  AUTH_LINK_CLASS,
  AuthLink,
} from "@/features/auth/components/auth-link";
import { EMAIL_PATTERN } from "@/features/auth/validation";
import { ApiError } from "@/lib/api";

type Failure =
  | { kind: "blocked"; message: string; seconds: number | null }
  | { kind: "generic" };

function blockedText(failure: Extract<Failure, { kind: "blocked" }>): string {
  if (failure.seconds === null) return failure.message;
  const minutes = Math.max(1, Math.ceil(failure.seconds / 60));
  return `Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [failure, setFailure] = useState<Failure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const blocked = failure?.kind === "blocked" ? failure : null;
  const blockedSeconds = blocked?.seconds ?? null;
  // Without Retry-After there is no wait to enforce: only show the message.
  const locked = blockedSeconds !== null;

  // The block lifts on its own once the wait is over.
  useEffect(() => {
    if (blockedSeconds === null) return;
    const timer = setTimeout(() => setFailure(null), blockedSeconds * 1000);
    return () => clearTimeout(timer);
  }, [blockedSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || locked) return;

    setFailure(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError("Informe um e-mail válido.");
      return;
    }
    setEmailError(undefined);

    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setEmailError(error.errors.email?.[0] ?? error.message);
      } else if (error instanceof ApiError && error.status === 429) {
        setFailure({
          kind: "blocked",
          message: error.message,
          seconds: error.retryAfter,
        });
      } else {
        setFailure({ kind: "generic" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthCard aria-labelledby="sent-title" className="text-center">
        <span className="mb-3 inline-grid size-14 place-items-center rounded-full bg-status-approved-bg text-status-approved-fg">
          <Mail aria-hidden="true" className="size-7" />
        </span>
        <h1
          id="sent-title"
          className="font-heading text-2xl leading-normal font-extrabold"
        >
          Confira seu e-mail
        </h1>
        <p className="mt-1 mb-5 text-muted-foreground">
          Se houver uma conta com <b>{email.trim()}</b>, enviamos um link para
          criar uma nova senha. O link vale por 60 minutos.
        </p>
        <Button
          asChild
          variant="outline"
          className="min-h-12 w-full rounded-lg px-6 text-[15px]"
        >
          <Link href="/login">Voltar para o login</Link>
        </Button>
        <p className="mt-5 text-[13px] text-muted-foreground">
          Não chegou? Confira a caixa de spam ou{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className={AUTH_LINK_CLASS}
          >
            peça de novo
          </button>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard aria-labelledby="forgot-title">
      <h1
        id="forgot-title"
        className="font-heading text-2xl leading-normal font-extrabold"
      >
        Esqueci minha senha
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Informe o e-mail da sua conta. Vamos enviar um link para você criar uma
        nova senha.
      </p>

      {blocked && (
        <AuthAlert tone="error" icon={<Lock aria-hidden="true" />}>
          <b>Muitos pedidos seguidos.</b>
          <br />
          {blockedText(blocked)}
        </AuthAlert>
      )}
      {failure?.kind === "generic" && (
        <AuthAlert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          Não foi possível enviar o link. Tente novamente.
        </AuthAlert>
      )}

      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email" className="text-[13px] font-bold">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nome@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          <FieldError id="email-error" message={emailError} />
        </div>

        <Button
          type="submit"
          disabled={submitting || locked}
          className="min-h-12 w-full rounded-lg bg-primary px-6 text-[15px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting && (
            <Loader2 aria-hidden="true" className="animate-spin" />
          )}
          {submitting ? "Enviando…" : "Enviar link"}
        </Button>
      </form>

      <div className="mt-3 flex justify-center">
        <AuthLink href="/login" className="my-0">
          Voltar para o login
        </AuthLink>
      </div>
    </AuthCard>
  );
}
