import { BackLink } from "@/features/requests/components/back-link";
import { RequestForm } from "@/features/requests/components/request-form";

// Who can create is declared in `appRoutes` and enforced by RequireRole.
export default function NewRequestPage() {
  return (
    <>
      <BackLink href="/requests">Voltar para a lista</BackLink>
      <div>
        <h1 className="font-heading text-[26px] font-extrabold">
          Nova solicitação
        </h1>
        <p className="mt-1 text-muted-foreground">
          A área, a data e o status Aberta são preenchidos automaticamente.
        </p>
      </div>
      <RequestForm />
    </>
  );
}
