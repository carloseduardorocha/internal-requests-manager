"use client";

import { useId } from "react";

import { SelectionCheckbox } from "@/components/selection-checkbox";
import { cn } from "@/lib/utils";
import { UserRowActions } from "@/features/users/components/user-row-actions";
import { AccountStatusBadge } from "@/features/users/components/account-status-badge";
import { useAuth } from "@/features/auth/auth-provider";
import { roleLabels } from "@/features/users/labels";
import type { ManagedUser } from "@/features/users/types";
import type { Area } from "@/lib/types";

const COLUMNS = "md:grid-cols-[32px_minmax(0,1fr)_120px_150px_130px_44px]";

// The checked rows of the page; the state lives in the page.
export type UserListSelection = {
  isSelected: (id: number) => boolean;
  onToggle: (id: number) => void;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
};

function UserRow({
  user,
  areas,
  isSelf,
  selected,
  onToggle,
  onUpdated,
}: {
  user: ManagedUser;
  areas: Area[];
  isSelf: boolean;
  selected: boolean;
  onToggle: () => void;
  onUpdated: (user: ManagedUser) => void;
}) {
  const deactivated = user.status === "deactivated";

  return (
    <div
      className={cn(
        "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3.5 pr-2 pl-4 hover:bg-accent md:py-3",
        COLUMNS,
        selected && "bg-accent shadow-[inset_3px_0_0_var(--primary)]",
      )}
    >
      {/* The own account has no checkbox; the column stays empty to align. */}
      <div className="col-start-1 row-start-1 self-start pt-0.5 md:self-center md:pt-0">
        {!isSelf && (
          <SelectionCheckbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Selecionar ${user.name}`}
          />
        )}
      </div>
      <div className="col-start-2 row-start-1 grid min-w-0 gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold [overflow-wrap:anywhere]">
          <span className={deactivated ? "text-muted-foreground" : undefined}>
            {user.name}
          </span>
          {isSelf && (
            <span className="rounded-full border border-border-strong px-2 text-xs font-bold text-muted-foreground">
              Você
            </span>
          )}
        </div>
        <div className="text-[13px] [overflow-wrap:anywhere] text-muted-foreground">
          {user.email}
        </div>
      </div>
      <div className="col-start-2 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground md:contents">
        <span className="inline-flex gap-1 md:col-start-3 md:row-start-1">
          <b className="font-bold text-foreground md:font-normal">
            {roleLabels[user.role]}
          </b>
          <span aria-hidden="true" className="md:hidden">
            ·
          </span>
        </span>
        <span className="md:col-start-4 md:row-start-1">{user.area.name}</span>
        <span className="md:col-start-5 md:row-start-1">
          <AccountStatusBadge status={user.status} />
        </span>
      </div>
      <div className="col-start-3 row-span-2 row-start-1 self-start md:col-start-6 md:row-span-1 md:self-center">
        <UserRowActions user={user} areas={areas} onUpdated={onUpdated} />
      </div>
    </div>
  );
}

export function UserList({
  users,
  areas,
  selection,
  onUpdated,
}: {
  users: ManagedUser[];
  areas: Area[];
  selection: UserListSelection;
  onUpdated: (user: ManagedUser) => void;
}) {
  const { user: me } = useAuth();
  const selectAllId = useId();

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      <div
        className={`grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 bg-background py-2.5 pr-2 pl-4 text-xs leading-[18px] font-bold tracking-[0.05em] text-muted-foreground uppercase ${COLUMNS}`}
      >
        <SelectionCheckbox
          id={selectAllId}
          checked={
            selection.allSelected
              ? true
              : selection.someSelected
                ? "indeterminate"
                : false
          }
          onCheckedChange={selection.onToggleAll}
          aria-label="Selecionar todas desta página"
        />
        {/* The checkbox already has the accessible name; the text only widens its click area. */}
        <label
          htmlFor={selectAllId}
          aria-hidden="true"
          className="cursor-pointer text-[13px] tracking-normal normal-case md:hidden"
        >
          Selecionar todas desta página
        </label>
        <span aria-hidden="true" className="hidden md:inline">
          Usuário
        </span>
        <span aria-hidden="true" className="hidden md:inline">
          Perfil
        </span>
        <span aria-hidden="true" className="hidden md:inline">
          Área
        </span>
        <span aria-hidden="true" className="hidden md:inline">
          Situação
        </span>
        <span aria-hidden="true" className="hidden md:inline" />
      </div>
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          areas={areas}
          isSelf={user.id === me.id}
          selected={selection.isSelected(user.id)}
          onToggle={() => selection.onToggle(user.id)}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}
