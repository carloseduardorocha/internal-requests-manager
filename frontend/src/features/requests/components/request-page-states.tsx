import { RefreshCw, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/features/requests/components/request-list-states";

const CARD = "rounded-lg border border-border bg-card shadow-sm";

export function RequestDetailSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3">
      <span className="sr-only">Carregando solicitação…</span>
      <div className="h-3.5 w-30 animate-pulse rounded-md bg-border" />
      <div className="h-6 w-[70%] animate-pulse rounded-md bg-border" />
      <div className={`${CARD} grid gap-2.5 p-5`}>
        <div className="h-3.5 animate-pulse rounded-md bg-border" />
        <div className="h-3.5 w-4/5 animate-pulse rounded-md bg-border" />
        <div className="h-3.5 w-1/2 animate-pulse rounded-md bg-border" />
      </div>
    </div>
  );
}

export function RequestNotFound() {
  return (
    <div className={CARD}>
      <StateMessage
        icon={Search}
        title="Solicitação não encontrada"
        text="Ela pode ter sido excluída, ou o endereço está errado."
      >
        <Button asChild variant="outline">
          <Link href="/requests">Ver a lista</Link>
        </Button>
      </StateMessage>
    </div>
  );
}

export function RequestLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={CARD}>
      <StateMessage
        icon={TriangleAlert}
        tone="error"
        title="Não foi possível carregar a solicitação"
        text="Verifique a conexão e tente de novo."
      >
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Tentar de novo
        </Button>
      </StateMessage>
    </div>
  );
}
