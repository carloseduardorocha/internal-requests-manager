"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { BackLink } from "@/features/requests/components/back-link";
import { RequestForm } from "@/features/requests/components/request-form";
import {
  RequestDetailSkeleton,
  RequestLoadError,
  RequestNotFound,
} from "@/features/requests/components/request-page-states";
import { useInternalRequest } from "@/features/requests/hooks/use-internal-request";

const NOT_OPEN_MESSAGE =
  "Este pedido não está mais Aberto e não pode ser alterado.";

export default function EditRequestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading, error, notFound, data, reload } = useInternalRequest(id);
  const blocked = data !== null && !data.can.update;

  // The API decides (`can.update` covers role, owner and Open status).
  useEffect(() => {
    if (!blocked) return;
    toast.error("Não foi possível editar", {
      id: "request-not-editable",
      description: NOT_OPEN_MESSAGE,
    });
    router.replace(`/requests/${id}`);
  }, [blocked, id, router]);

  if (loading || blocked) {
    return (
      <>
        <BackLink href={`/requests/${id}`}>Voltar para a solicitação</BackLink>
        <RequestDetailSkeleton />
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <BackLink href="/requests">Voltar para a lista</BackLink>
        <RequestNotFound />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <BackLink href={`/requests/${id}`}>Voltar para a solicitação</BackLink>
        <RequestLoadError onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <BackLink href={`/requests/${data.id}`}>
        Voltar para a solicitação
      </BackLink>
      <div>
        <h1 className="font-heading text-[26px] font-extrabold">
          Editar solicitação #{data.id}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Só é possível editar enquanto a solicitação está Aberta.
        </p>
      </div>
      <RequestForm request={data} />
    </>
  );
}
