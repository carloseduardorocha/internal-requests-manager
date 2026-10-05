"use client";

import { useParams } from "next/navigation";

import { BackLink } from "@/features/requests/components/back-link";
import { RequestDetail } from "@/features/requests/components/request-detail";
import {
  RequestDetailSkeleton,
  RequestLoadError,
  RequestNotFound,
} from "@/features/requests/components/request-page-states";
import { useInternalRequest } from "@/features/requests/hooks/use-internal-request";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { loading, error, notFound, data, reload } = useInternalRequest(id);

  let body;
  if (loading) body = <RequestDetailSkeleton />;
  else if (notFound) body = <RequestNotFound />;
  else if (error || !data) body = <RequestLoadError onRetry={reload} />;
  else body = <RequestDetail request={data} onConflict={reload} />;

  return (
    <>
      <BackLink href="/requests">Voltar para a lista</BackLink>
      {body}
    </>
  );
}
