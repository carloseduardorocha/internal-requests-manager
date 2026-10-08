"use client";

import { CircleCheck, Clock, Loader2, Lock, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/features/auth/api";
import { AuthLink } from "@/features/auth/components/auth-link";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { PasswordInput } from "@/features/auth/components/password-input";
import { homeFor } from "@/features/auth/routes";
import { EMAIL_PATTERN } from "@/features/auth/validation";
import { ApiError } from "@/lib/api";

type FieldErrors = { email?: string; password?: string };
type Failure =
  | { kind: "credentials" }
  | { kind: "blocked"; message: string; seconds: number | null }
  | { kind: "generic"; message: string };

function blockedText(failure: Extract<Failure, { kind: "blocked" }>): string {
  if (failure.seconds === null) return failure.message;
  const minutes = Math.max(1, Math.ceil(failure.seconds / 60));
  return `Muitas tentativas erradas. Tente de novo em ${minutes} ${
    minutes === 1 ? "minuto" : "minutos"
  }.`;
}

export function LoginForm({
  expired = false,
  reset = false,
}: {
  expired?: boolean;
  reset?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const errors: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "Informe um e-mail válido.";
    }
    if (password === "") errors.password = "Informe a senha.";

    setFieldErrors(errors);
    setFailure(null);
    if (errors.email || errors.password) return;

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password, remember });
      router.replace(homeFor(user.role));
    } catch (error) {
      setPassword("");
      setSubmitting(false);

      if (error instanceof ApiError && error.status === 422) {
        setFailure({ kind: "credentials" });
      } else if (error instanceof ApiError && error.status === 429) {
        setFailure({
          kind: "blocked",
          message: error.message,
          seconds: error.retryAfter,
        });
      } else {
        setFailure({
          kind: "generic",
          message: "Não foi possível entrar. Tente novamente.",
        });
      }
    }
  }

  return (
    <section
      aria-labelledby="login-title"
      className="rounded-lg border border-border bg-card px-5 py-6 shadow-sm min-[481px]:px-7 min-[481px]:py-8"
    >
      <h1
        id="login-title"
        className="font-heading text-2xl leading-normal font-extrabold"
      >
        Entrar
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Use o e-mail e a senha da sua conta.
      </p>

      {reset && !failure && (
        <AuthAlert tone="success" icon={<CircleCheck aria-hidden="true" />}>
          <b>Senha redefinida.</b>
          <br />
          Entre com a nova senha.
        </AuthAlert>
      )}
      {expired && !reset && !failure && (
        <AuthAlert tone="info" icon={<Clock aria-hidden="true" />}>
          Sua sessão expirou. Entre de novo para continuar.
        </AuthAlert>
      )}
      {failure?.kind === "credentials" && (
        <AuthAlert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          E-mail ou senha incorretos.
        </AuthAlert>
      )}
      {failure?.kind === "generic" && (
        <AuthAlert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          {failure.message}
        </AuthAlert>
      )}
      {blocked && (
        <AuthAlert tone="error" icon={<Lock aria-hidden="true" />}>
          <b>Acesso bloqueado temporariamente.</b>
          <br />
          {blockedText(blocked)}
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
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          <FieldError id="email-error" message={fieldErrors.email} />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password" className="text-[13px] font-bold">
              Senha
            </Label>
            <AuthLink href="/forgot-password">Esqueci minha senha</AuthLink>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
          />
          <FieldError id="password-error" message={fieldErrors.password} />
        </div>

        <Label
          htmlFor="remember"
          className="min-h-11 cursor-pointer gap-2.5 text-[15px] font-semibold"
        >
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(value) => setRemember(value === true)}
            className="size-5"
          />
          Mantenha-me conectado
        </Label>

        <Button
          type="submit"
          disabled={submitting || locked}
          className="min-h-12 w-full rounded-lg bg-primary px-6 text-[15px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting && (
            <Loader2 aria-hidden="true" className="animate-spin" />
          )}
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        Não tem acesso? Fale com o administrador.
      </p>
    </section>
  );
}
