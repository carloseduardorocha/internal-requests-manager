"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { canAccess, homeFor } from "@/features/auth/routes";

// Sends the user to their own home when their role cannot see the current route.
export function RequireRole({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccess(user.role, pathname);

  useEffect(() => {
    if (!allowed) router.replace(homeFor(user.role));
  }, [allowed, router, user.role]);

  return allowed ? children : null;
}
