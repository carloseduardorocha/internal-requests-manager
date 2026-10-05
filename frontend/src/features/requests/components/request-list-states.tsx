import {
  Inbox,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/types";

const PANEL =
  "overflow-hidden rounded-lg border border-border bg-card text-card-foreground";

// Icon, title, text and an optional action: empty, no results and error.
export function StateMessage({
  icon: Icon,
  title,
  text,
  tone = "neutral",
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  tone?: "neutral" | "error";
  children?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2.5 px-5 py-12 text-center text-muted-foreground">
      <Icon
        aria-hidden="true"
        className={`size-9 ${tone === "error" ? "text-destructive" : ""}`}
      />
      <b className="text-base text-foreground">{title}</b>
      <p className="max-w-[360px]">{text}</p>
      {children}
    </div>
  );
}

export function RequestListSkeleton() {
  return (
    <div aria-busy="true" className={`${PANEL} divide-y divide-border`}>
      <span className="sr-only">Carregando solicitações…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid gap-2.5 p-4">
          <div className="h-3.5 w-3/5 animate-pulse rounded-md bg-border" />
          <div className="h-2.5 w-[35%] animate-pulse rounded-md bg-border" />
        </div>
      ))}
    </div>
  );
}

// Nothing was ever created (no filters): the text depends on who is looking.
export function RequestListEmpty({
  role,
  canCreate,
}: {
  role: Role;
  canCreate: boolean;
}) {
  const own = role === "requester";

  return (
    <div className={PANEL}>
      <StateMessage
        icon={Inbox}
        title={
          own
            ? "Você ainda não abriu nenhuma solicitação"
            : "Nenhuma solicitação por aqui"
        }
        text={
          own
            ? "Abra um pedido e acompanhe o andamento por aqui."
            : "Quando alguém abrir um pedido, ele aparece nesta lista."
        }
      >
        {canCreate && (
          <Button asChild>
            <Link href="/requests/new">
              <Plus aria-hidden="true" />
              Nova solicitação
            </Link>
          </Button>
        )}
      </StateMessage>
    </div>
  );
}

export function RequestListNoResults({
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
        title="Nenhuma solicitação encontrada"
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

export function RequestListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={PANEL}>
      <StateMessage
        icon={TriangleAlert}
        tone="error"
        title="Não foi possível carregar as solicitações"
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
