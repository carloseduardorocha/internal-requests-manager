import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/features/requests/types";

export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-between gap-3"
    >
      <Button
        variant="outline"
        aria-label="Página anterior"
        disabled={meta.current_page <= 1}
        onClick={() => onPageChange(meta.current_page - 1)}
        className="px-3.5"
      >
        <ChevronLeft aria-hidden="true" />
        <span className="max-[480px]:hidden">Anterior</span>
      </Button>
      <span className="text-[13px] text-muted-foreground">
        Página {meta.current_page} de {meta.last_page}
      </span>
      <Button
        variant="outline"
        aria-label="Próxima página"
        disabled={meta.current_page >= meta.last_page}
        onClick={() => onPageChange(meta.current_page + 1)}
        className="px-3.5"
      >
        <span className="max-[480px]:hidden">Próxima</span>
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
