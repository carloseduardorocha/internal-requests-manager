"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { homeFor } from "@/features/auth/routes";

export default function Index() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    router.replace(homeFor(user.role));
  }, [router, user.role]);

  return null;
}
