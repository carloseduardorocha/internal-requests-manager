import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha · Solicitações Internas",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
