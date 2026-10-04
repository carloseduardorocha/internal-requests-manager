import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar · Solicitações Internas" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expired } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex justify-end px-4 py-3">
        <ThemeToggle />
      </div>
      <main className="mx-auto grid w-full max-w-[420px] flex-1 content-start gap-5 px-4 pt-2 pb-12 md:pt-[6vh]">
        <div className="flex items-center justify-center gap-3">
          <BrandLogo />
          <span className="border-l border-border-strong pl-3 font-heading text-[17px] font-extrabold">
            Solicitações Internas
          </span>
        </div>
        <LoginForm expired={expired === "1"} />
      </main>
    </div>
  );
}
