import type { Metadata } from "next";

import { AcceptInvitation } from "@/features/users/components/accept-invitation";

export const metadata: Metadata = {
  title: "Criar conta · Solicitações Internas",
};

export default async function AcceptInvitationPage({
  searchParams,
}: PageProps<"/accept-invitation">) {
  const { token } = await searchParams;

  return (
    <AcceptInvitation token={(Array.isArray(token) ? token[0] : token) ?? ""} />
  );
}
