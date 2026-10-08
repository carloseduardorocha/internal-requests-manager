"use client";

import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EMAIL_PATTERN } from "@/features/auth/validation";
import { createInvitation, listAreas } from "@/features/users/api";
import { roleDescriptions, roleLabels, roles } from "@/features/users/labels";
import { ApiError } from "@/lib/api";
import type { Area, Role } from "@/lib/types";

type Field = "name" | "email" | "role" | "area";
type FieldErrors = Partial<Record<Field, string>>;
type AreasState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; areas: Area[] };

function validate(
  name: string,
  email: string,
  role: Role | "",
  areaId: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (name === "") errors.name = "O campo nome é obrigatório.";
  if (email === "") errors.email = "O campo e-mail é obrigatório.";
  else if (!EMAIL_PATTERN.test(email))
    errors.email = "Informe um e-mail válido.";
  if (role === "") errors.role = "O campo perfil é obrigatório.";
  if (areaId === "") errors.area = "O campo área é obrigatório.";

  return errors;
}

export function InvitationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [areaId, setAreaId] = useState("");
  const [areas, setAreas] = useState<AreasState>({ status: "loading" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const firstRoleRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLSelectElement>(null);

  const loadAreas = useCallback(() => {
    setAreas({ status: "loading" });
    listAreas().then(
      (list) => setAreas({ status: "ready", areas: list }),
      () => setAreas({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAreas();
  }, [loadAreas]);

  function clearError(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Same order as the screen.
  function focusFirstError(found: FieldErrors) {
    if (found.name) nameRef.current?.focus();
    else if (found.email) emailRef.current?.focus();
    else if (found.role) firstRoleRef.current?.focus();
    else if (found.area) areaRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const found = validate(trimmedName, trimmedEmail, role, areaId);

    setErrors(found);
    if (Object.keys(found).length > 0 || role === "") {
      focusFirstError(found);
      return;
    }

    setSubmitting(true);
    try {
      const invitation = await createInvitation({
        name: trimmedName,
        email: trimmedEmail,
        role,
        area_id: Number(areaId),
      });

      toast.success("Convite enviado", {
        description: `${invitation.email} recebe o link por e-mail.`,
      });
      router.replace("/users");
    } catch (error) {
      setSubmitting(false);

      if (error instanceof ApiError && error.status === 422) {
        const apiErrors: FieldErrors = {
          name: error.errors.name?.[0],
          email: error.errors.email?.[0],
          role: error.errors.role?.[0],
          area: error.errors.area_id?.[0],
        };
        setErrors(apiErrors);
        focusFirstError(apiErrors);
        return;
      }

      // Expired session: the API client is already sending the user to the login.
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 419)
      ) {
        return;
      }

      toast.error("Não foi possível enviar o convite", {
        description:
          error instanceof ApiError
            ? error.message
            : "Não foi possível concluir a ação. Tente novamente.",
      });
    }
  }

  return (
    <section className="w-full max-w-[720px] rounded-lg border border-border bg-card p-5 shadow-sm">
      <form noValidate onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="name" className="text-[13px] font-bold">
            Nome
          </Label>
          <Input
            id="name"
            ref={nameRef}
            autoComplete="off"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearError("name");
            }}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          <FieldError id="name-error" message={errors.name} />
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="email" className="text-[13px] font-bold">
            E-mail
          </Label>
          <Input
            id="email"
            ref={emailRef}
            type="email"
            autoComplete="off"
            placeholder="nome@empresa.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          <FieldError id="email-error" message={errors.email} />
        </div>

        <div className="grid gap-1.5">
          <fieldset
            aria-describedby={errors.role ? "role-error" : undefined}
            className="grid min-w-0 gap-2 md:grid-cols-3"
          >
            <legend className="mb-1.5 p-0 text-[13px] font-bold">Perfil</legend>
            {roles.map((option, index) => (
              <label
                key={option}
                className={`relative flex min-h-12 cursor-pointer items-start gap-2.5 rounded-lg border bg-background p-3 has-checked:border-primary has-checked:bg-accent has-checked:shadow-[inset_0_0_0_1px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid ${errors.role ? "border-destructive" : "border-border-strong"}`}
              >
                <input
                  type="radio"
                  name="role"
                  ref={index === 0 ? firstRoleRef : undefined}
                  value={option}
                  checked={role === option}
                  onChange={() => {
                    setRole(option);
                    clearError("role");
                  }}
                  className="mt-[3px] size-[18px] cursor-pointer accent-primary"
                />
                <span>
                  <b>{roleLabels[option]}</b>
                  <small className="block text-xs leading-[1.4] text-muted-foreground">
                    {roleDescriptions[option]}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <FieldError id="role-error" message={errors.role} />
        </div>

        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="area" className="text-[13px] font-bold">
            Área
          </Label>
          {areas.status === "error" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-destructive">
                Não foi possível carregar as áreas.
              </span>
              <Button type="button" variant="outline" onClick={loadAreas}>
                <RefreshCw aria-hidden="true" />
                Tentar de novo
              </Button>
            </div>
          ) : (
            <div className="relative">
              <select
                id="area"
                ref={areaRef}
                value={areaId}
                disabled={areas.status === "loading"}
                onChange={(event) => {
                  setAreaId(event.target.value);
                  clearError("area");
                }}
                aria-invalid={errors.area ? true : undefined}
                aria-describedby={errors.area ? "area-error" : undefined}
                className="min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-border-strong bg-background px-3 pr-10 text-foreground outline-hidden focus-visible:border-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
              >
                <option value="">
                  {areas.status === "loading"
                    ? "Carregando…"
                    : "Selecione a área"}
                </option>
                {areas.status === "ready" &&
                  areas.areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-4 right-3.5 size-4 text-muted-foreground"
              />
            </div>
          )}
          <FieldError id="area-error" message={errors.area} />
        </div>

        <div className="flex flex-col-reverse gap-2 min-[481px]:flex-row min-[481px]:justify-end">
          <Button asChild variant="outline">
            <Link href="/users">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting || areas.status === "error"}
          >
            {submitting && (
              <Loader2 aria-hidden="true" className="animate-spin" />
            )}
            {submitting ? "Enviando…" : "Enviar convite"}
          </Button>
        </div>
      </form>
    </section>
  );
}
