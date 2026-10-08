"use client";

import { Loader2, Lock, TriangleAlert } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/field-error";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser } from "@/features/users/api";
import { failureMessage } from "@/features/users/api-error";
import { roleLabels, roles } from "@/features/users/labels";
import type { ManagedUser, UserUpdatePayload } from "@/features/users/types";
import { ApiError } from "@/lib/api";
import type { Area, Role } from "@/lib/types";

const NAME_MAX = 255;

type Field = "name" | "role" | "area_id";
type FieldErrors = Partial<Record<Field, string>>;

const FALLBACK_ALERT = "Não foi possível salvar. Tente novamente.";

// Read-only line with a lock: e-mail and, on the own account, the role.
function ReadOnlyField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <dl className="grid gap-0.5 rounded-lg border border-dashed border-border-strong bg-background px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[13px] font-bold">
        <Lock aria-hidden="true" className="size-3.5 text-muted-foreground" />
        {label}
      </dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
      <small className="text-xs text-muted-foreground">{note}</small>
    </dl>
  );
}

function EditUserForm({
  user,
  areas,
  onSavingChange,
  onSaved,
  onClose,
  saving,
}: {
  user: ManagedUser;
  areas: Area[];
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onSaved: (user: ManagedUser) => void;
  onClose: () => void;
}) {
  const canChangeRole = user.can.change_role;
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [areaId, setAreaId] = useState(String(user.area.id));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Name, then role, then area (the selects have ids to look up).
  function focusFirstError(found: FieldErrors) {
    if (found.name) nameRef.current?.focus();
    else if (found.role) document.getElementById("edit-role")?.focus();
    else if (found.area_id) document.getElementById("edit-area")?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    setAlert(null);

    if (trimmedName === "") {
      const found = { name: "Informe o nome." };
      setErrors(found);
      focusFirstError(found);
      return;
    }

    setErrors({});

    const payload: UserUpdatePayload = {
      name: trimmedName,
      area_id: Number(areaId),
      ...(canChangeRole ? { role } : {}),
    };

    onSavingChange(true);
    try {
      const updated = await updateUser(user.id, payload);
      onSaved(updated);
      toast.success("Usuário atualizado", {
        description: `Os dados de ${updated.name} foram salvos.`,
      });
      onSavingChange(false);
      onClose();
    } catch (error) {
      onSavingChange(false);

      if (error instanceof ApiError && error.status === 422) {
        const found: FieldErrors = {
          name: error.errors.name?.[0],
          area_id: error.errors.area_id?.[0],
        };
        let extra: string | null = null;

        if (error.errors.role?.[0]) {
          // On the own account the role is plain text: no field to show it.
          if (canChangeRole) found.role = error.errors.role[0];
          else extra = error.errors.role[0];
        }
        const known = ["name", "role", "area_id"];
        if (Object.keys(error.errors).some((key) => !known.includes(key))) {
          extra = error.message;
        }

        setErrors(found);
        setAlert(
          extra ?? (Object.values(found).some(Boolean) ? null : error.message),
        );
        focusFirstError(found);
        return;
      }

      const message = failureMessage(error);
      if (message !== null) setAlert(message || FALLBACK_ALERT);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-[18px]">
      {alert && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg bg-status-rejected-bg px-3 py-2.5 text-sm text-status-rejected-fg"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-[3px] size-4 shrink-0"
          />
          <span>{alert}</span>
        </div>
      )}

      <ReadOnlyField
        label="E-mail"
        value={user.email}
        note="O e-mail é o login da pessoa e não muda."
      />

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="edit-name" className="text-[13px] font-bold">
          Nome
        </Label>
        <Input
          id="edit-name"
          ref={nameRef}
          value={name}
          maxLength={NAME_MAX}
          disabled={saving}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "edit-name-error" : undefined}
        />
        <FieldError id="edit-name-error" message={errors.name} />
      </div>

      {canChangeRole ? (
        <div className="grid min-w-0 gap-1.5">
          <SelectField
            id="edit-role"
            label="Perfil"
            value={role}
            disabled={saving}
            invalid={Boolean(errors.role)}
            describedBy={errors.role ? "edit-role-error" : undefined}
            onChange={(event) => {
              setRole(event.target.value as Role);
              setErrors((current) => ({ ...current, role: undefined }));
            }}
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {roleLabels[item]}
              </option>
            ))}
          </SelectField>
          <FieldError id="edit-role-error" message={errors.role} />
        </div>
      ) : (
        <ReadOnlyField
          label="Perfil"
          value={roleLabels[user.role]}
          note="Você não pode alterar o próprio perfil."
        />
      )}

      <div className="grid min-w-0 gap-1.5">
        <SelectField
          id="edit-area"
          label="Área"
          value={areaId}
          disabled={saving}
          invalid={Boolean(errors.area_id)}
          describedBy={errors.area_id ? "edit-area-error" : undefined}
          onChange={(event) => {
            setAreaId(event.target.value);
            setErrors((current) => ({ ...current, area_id: undefined }));
          }}
        >
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </SelectField>
        <FieldError id="edit-area-error" message={errors.area_id} />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={saving}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Edits name, role and area in a modal over the list. The e-mail is only shown.
export function EditUserDialog({
  user,
  areas,
  open,
  onOpenChange,
  onSaved,
}: {
  user: ManagedUser;
  areas: Area[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: ManagedUser) => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="gap-[18px] sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Altere nome, perfil e área. Os pedidos já abertos mantêm a área
            antiga.
          </DialogDescription>
        </DialogHeader>
        <EditUserForm
          user={user}
          areas={areas}
          saving={saving}
          onSavingChange={setSaving}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
