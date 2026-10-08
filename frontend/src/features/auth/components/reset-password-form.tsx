"use client";

import { Link2Off, Loader2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/features/auth/api";
import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthLink } from "@/features/auth/components/auth-link";
import { PasswordInput } from "@/features/auth/components/password-input";
import { ApiError } from "@/lib/api";

const MIN_PASSWORD = 8;

type FieldErrors = { password?: string; confirmation?: string };

function LinkUnavailable() {
  return (
    <AuthCard aria-labelledby="gone-title" className="text-center">
      <span className="mb-3 inline-grid size-14 place-items-center rounded-full bg-status-rejected-bg text-status-rejected-fg">
        <Link2Off aria-hidden="true" className="size-7" />
      </span>
      <h1
        id="gone-title"
        className="font-heading text-2xl leading-normal font-extrabold"
      >
        Link indisponível
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Este link de recuperação é inválido ou expirou. Peça um novo.
      </p>
      <Button asChild className="min-h-12 w-full rounded-lg px-6 text-[15px]">
        <Link href="/forgot-password">Pedir novo link</Link>
      </Button>
      <div className="mt-3 flex justify-center">
        <AuthLink href="/login" className="my-0">
          Voltar para o login
        </AuthLink>
      </div>
    </AuthCard>
  );
}

export function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [logoutOthers, setLogoutOthers] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (unavailable || token === "" || email === "") return <LinkUnavailable />;

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
      await resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmation,
        logout_other_devices: logoutOthers,
      });
      router.replace("/login?reset=1");
    } catch (error) {
      setSubmitting(false);

      if (error instanceof ApiError && error.status === 422) {
        if (error.errors.token || error.errors.email) {
          setUnavailable(true);
        } else {
          setFieldErrors({
            password: error.errors.password?.[0] ?? error.message,
          });
        }
      } else {
        setFailed(true);
      }
    }
  }

  return (
    <AuthCard aria-labelledby="reset-title">
      <h1
        id="reset-title"
        className="font-heading text-2xl leading-normal font-extrabold"
      >
        Criar nova senha
      </h1>
      <p className="mt-1 mb-5 text-muted-foreground">
        Para a conta <b>{email}</b>.
      </p>

      {failed && (
        <AuthAlert tone="error" icon={<TriangleAlert aria-hidden="true" />}>
          Não foi possível salvar a nova senha. Tente novamente.
        </AuthAlert>
      )}

      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        <input
          type="email"
          autoComplete="username"
          value={email}
          readOnly
          hidden
        />

        <div className="grid gap-1.5">
          <Label htmlFor="password" className="text-[13px] font-bold">
            Nova senha
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
            Confirmar nova senha
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

        <Label
          htmlFor="logout-others"
          className="min-h-11 cursor-pointer gap-2.5 text-[15px] font-semibold"
        >
          <Checkbox
            id="logout-others"
            aria-describedby="logout-others-help"
            checked={logoutOthers}
            onCheckedChange={(value) => setLogoutOthers(value === true)}
            className="size-5"
          />
          Desconectar dos outros dispositivos
        </Label>
        <span
          id="logout-others-help"
          className="-mt-1.5 ml-[30px] block text-[13px] text-muted-foreground"
        >
          Encerra a sessão nos outros navegadores e aparelhos em que você
          entrou.
        </span>

        <Button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-lg bg-primary px-6 text-[15px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting && (
            <Loader2 aria-hidden="true" className="animate-spin" />
          )}
          {submitting ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </AuthCard>
  );
}
