"use client";

import { Clock, Eye, EyeOff, Loader2, Lock, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/features/auth/api";
import { homeFor } from "@/features/auth/routes";
import { ApiError } from "@/lib/api";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

type FieldErrors = { email?: string; password?: string };
type Failure =
  | { kind: "credentials" }
  | { kind: "blocked"; message: string; seconds: number | null }
  | { kind: "generic"; message: string };

function Alert({
  tone,
  icon,
  children,
}: {
  tone: "info" | "error";
  icon: ReactNode;
  children: ReactNode;
}) {
  const colors =
    tone === "info"
      ? "bg-status-open-bg text-status-open-fg"
      : "bg-status-rejected-bg text-status-rejected-fg";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm ${colors}`}
    >
      <span className="mt-0.5 [&>svg]:size-[18px]">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function blockedText(failure: Extract<Failure, { kind: "blocked" }>): string {
  if (failure.seconds === null) return failure.message;
  const minutes = Math.max(1, Math.ceil(failure.seconds / 60));
  return `Muitas tentativas erradas. Tente de novo em ${minutes} ${
    minutes === 1 ? "minuto" : "minutos"
  }.`;
}

export function LoginForm({ expired = false }: { expired?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <h1 id="login-title" className="font-heading text-2xl font-extrabold">
        Entrar
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Use o e-mail e a senha da sua conta.
      </p>

      {expired && !failure && (
        <Alert tone="info" icon={<Clock aria-hidden="true" />}>
          Sua sessão expirou. Entre de novo para continuar.
        </Alert>
      )}
      {failure?.kind === "credentials" && (
        <Alert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          E-mail ou senha incorretos.
        </Alert>
      )}
      {failure?.kind === "generic" && (
        <Alert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          {failure.message}
        </Alert>
      )}
      {blocked && (
        <Alert tone="error" icon={<Lock aria-hidden="true" />}>
          <b>Acesso bloqueado temporariamente.</b>
          <br />
          {blockedText(blocked)}
        </Alert>
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
          {fieldErrors.email && (
            <span id="email-error" className="text-xs text-destructive">
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password" className="text-[13px] font-bold">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={
                fieldErrors.password ? "password-error" : undefined
              }
              className="pr-13"
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((current) => !current)}
              className="absolute top-0.5 right-0.5 grid size-11 place-items-center rounded-lg text-muted-foreground outline-hidden hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-5" />
              ) : (
                <Eye aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <span id="password-error" className="text-xs text-destructive">
              {fieldErrors.password}
            </span>
          )}
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
        Não tem acesso ou esqueceu a senha? Fale com a equipe de suporte.
      </p>
    </section>
  );
}
