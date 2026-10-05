"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { BackLink } from "@/features/requests/components/back-link";
import { RequestDetail } from "@/features/requests/components/request-detail";
import {
  RequestDetailSkeleton,
  RequestLoadError,
  RequestNotFound,
} from "@/features/requests/components/request-page-states";
import { useInternalRequest } from "@/features/requests/hooks/use-internal-request";
import { isValidRequestId } from "@/features/requests/request-id";

function RequestDetailContent({ id }: { id: string }) {
  const { loading, notFound, data, reload } = useInternalRequest(id);
  const refocus = useRef(false);

  // After an action the detail reloads under the closed dialog: the focus goes
  // to the justification field (the next step) or to the title, instead of
  // falling back to the body.
  useEffect(() => {
    if (!refocus.current || loading) return;
    refocus.current = false;
    (
      document.getElementById("justification") ??
      document.getElementById("request-title")
    )?.focus();
  }, [loading]);

  function handleRefresh() {
    refocus.current = true;
    reload();
  }

  if (data) return <RequestDetail request={data} onRefresh={handleRefresh} />;
  if (loading) return <RequestDetailSkeleton />;
  if (notFound) return <RequestNotFound />;
  return <RequestLoadError onRetry={reload} />;
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <>
      <BackLink toList>Voltar para a lista</BackLink>
      {isValidRequestId(id) ? (
        <RequestDetailContent id={id} />
      ) : (
        <RequestNotFound />
      )}
    </>
  );
}
