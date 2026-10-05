import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CARD } from "@/features/dashboard/components/stat-cards";
import { StateMessage } from "@/features/requests/components/request-list-states";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-border ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-6">
      <span className="sr-only">Carregando o painel…</span>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className={`${CARD} ${index === 0 ? "col-span-2 border-l-4 border-l-brand md:col-span-1" : ""}`}
          >
            <Bar className="h-3.5 w-3/5" />
            <Bar className="mt-2 h-7 w-2/5" />
          </div>
        ))}
      </div>
      <div className={`${CARD} min-h-0 gap-4.5 p-5`}>
        <Bar className="h-3.5 w-30" />
        {Array.from({ length: 3 }, (_, index) => (
          <Bar key={index} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={`${CARD} min-h-0 p-0`}>
      <StateMessage
        icon={TriangleAlert}
        tone="error"
        title="Não foi possível carregar o painel"
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
