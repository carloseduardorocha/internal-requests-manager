"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AppHeaderSkeleton } from "@/features/auth/components/app-header-skeleton";
import { logout as logoutRequest, me } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    me()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch((error: unknown) => {
        // A 401/419 already redirected to the login: keep the skeleton.
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 419)
        ) {
          return;
        }
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Leave anyway: the session may already be gone.
    }
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => (user ? { user, logout } : null), [user, logout]);

  if (!value) {
    return (
      <AppHeaderSkeleton
        failed={failed}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
