import { BackLink } from "@/features/requests/components/back-link";
import { InvitationForm } from "@/features/users/components/invitation-form";

// Who can invite is declared in `appRoutes` and enforced by RequireRole.
export default function InviteUserPage() {
  return (
    <>
      <BackLink href="/users">Voltar para usuários</BackLink>
      <div>
        <h1 className="font-heading text-[26px] font-extrabold">
          Convidar usuário
        </h1>
        <p className="mt-1 text-muted-foreground">
          A pessoa recebe um e-mail com o link para criar a conta. O link vale
          por 7 dias.
        </p>
      </div>
      <InvitationForm />
    </>
  );
}
