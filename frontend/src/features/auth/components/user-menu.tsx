"use client";

import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { matchesRoute, routesFor } from "@/features/auth/routes";
import { roleLabels } from "@/features/users/labels";

const itemClass =
  "min-h-11 cursor-pointer gap-2 rounded-lg px-3 font-bold text-foreground focus:bg-accent focus:text-accent-foreground";

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const isDark = resolvedTheme === "dark";
  const roleLine = `${roleLabels[user.role]} · ${user.area.name}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu da conta de ${user.name}`}
        className="inline-flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-transparent pr-2 pl-1 text-foreground outline-hidden transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full bg-accent text-[13px] font-extrabold text-accent-foreground"
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <b>{user.name}</b>
          <small className="block text-xs text-muted-foreground">
            {roleLine}
          </small>
        </span>
        <ChevronDown aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 min-w-60 rounded-lg border border-border bg-card p-1 shadow-lg ring-0"
      >
        <div className="mb-1 border-b border-border px-3 pt-2 pb-2.5">
          <b>{user.name}</b>
          <small className="block text-xs text-muted-foreground">
            {user.email}
          </small>
          <small className="block text-xs text-muted-foreground">
            {roleLine}
          </small>
        </div>
        {routesFor(user.role).map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            asChild
            className={`${itemClass} md:hidden`}
          >
            <Link
              href={href}
              aria-current={matchesRoute(pathname, href) ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className={itemClass}
          onSelect={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          {isDark ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-0 my-1 bg-border" />
        <DropdownMenuItem
          className={`${itemClass} text-destructive focus:bg-status-rejected-bg focus:text-status-rejected-fg`}
          onSelect={() => void logout()}
        >
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
