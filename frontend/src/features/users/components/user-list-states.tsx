import { RefreshCw, Search, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StateMessage } from "@/features/requests/components/request-list-states";

const PANEL =
  "overflow-hidden rounded-lg border border-border bg-card text-card-foreground";

export function UserListSkeleton() {
  return (
    <div aria-busy="true" className={`${PANEL} divide-y divide-border`}>
      <span className="sr-only">Carregando usuários…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid gap-2.5 p-4">
          <div className="h-3.5 w-[45%] animate-pulse rounded-md bg-border" />
          <div className="h-2.5 w-[30%] animate-pulse rounded-md bg-border" />
        </div>
      ))}
    </div>
  );
}

export function UserListNoResults({
  search,
  onClear,
}: {
  search: string;
  onClear: () => void;
}) {
  return (
    <div className={PANEL}>
      <StateMessage
        icon={Search}
        title="Nenhum usuário encontrado"
        text={
          search
            ? `Nada corresponde à pesquisa “${search}”. Tente outros termos ou limpe os filtros.`
            : "Nada corresponde aos filtros escolhidos. Tente outras opções ou limpe os filtros."
        }
      >
        <Button variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      </StateMessage>
    </div>
  );
}

export function UserListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={PANEL}>
      <StateMessage
        icon={TriangleAlert}
        tone="error"
        title="Não foi possível carregar os usuários"
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
