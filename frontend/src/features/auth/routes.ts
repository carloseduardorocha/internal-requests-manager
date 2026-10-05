import { LayoutDashboard, List, Plus, type LucideIcon } from "lucide-react";

import type { Role } from "@/lib/types";

export type AppRoute = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  // false keeps the entry out of the menu (it only declares who may open it).
  nav?: boolean;
};

// Single source of truth for authenticated routes: the navigation and
// RequireRole both read from it.
export const appRoutes: AppRoute[] = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: LayoutDashboard,
    roles: ["analyst", "admin"],
  },
  {
    href: "/requests",
    label: "Solicitações",
    icon: List,
    roles: ["requester", "analyst", "admin"],
  },
  {
    href: "/requests/new",
    label: "Nova solicitação",
    icon: Plus,
    roles: ["requester", "admin"],
    nav: false,
  },
];

export function homeFor(role: Role): string {
  return role === "requester" ? "/requests" : "/dashboard";
}

// Segment-prefix match: "/requests" matches "/requests/123" but not "/requestsx".
export function matchesRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function routesFor(role: Role): AppRoute[] {
  return appRoutes.filter(
    (route) => route.nav !== false && route.roles.includes(role),
  );
}

// The most specific (longest) matching entry wins, so the order of the map
// does not matter. Paths without an entry are open to any signed-in role.
export function canAccessIn(
  routes: AppRoute[],
  role: Role,
  pathname: string,
): boolean {
  const route = routes
    .filter((item) => matchesRoute(pathname, item.href))
    .reduce<AppRoute | null>(
      (best, item) =>
        best === null || item.href.length > best.href.length ? item : best,
      null,
    );
  return route ? route.roles.includes(role) : true;
}

export function canAccess(role: Role, pathname: string): boolean {
  return canAccessIn(appRoutes, role, pathname);
}
