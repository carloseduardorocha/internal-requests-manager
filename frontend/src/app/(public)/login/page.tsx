import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar · Solicitações Internas" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired, reset } = await searchParams;

  return <LoginForm expired={expired === "1"} reset={reset === "1"} />;
}
