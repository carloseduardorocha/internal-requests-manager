"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { PageSkeleton } from "@/features/auth/components/page-skeleton";

export default function RequestsPage() {
  const { user } = useAuth();

  return (
    <PageSkeleton
      title={user.role === "requester" ? "Minhas solicitações" : "Solicitações"}
    />
  );
}
