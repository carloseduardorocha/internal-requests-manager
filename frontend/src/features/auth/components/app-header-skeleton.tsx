import { TriangleAlert } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

type AppHeaderSkeletonProps = {
  failed: boolean;
  onRetry: () => void;
};

// Shown while /api/me loads (or when it fails for a reason other than 401/419).
export function AppHeaderSkeleton({ failed, onRetry }: AppHeaderSkeletonProps) {
  return (
    <>
      <header className="border-b border-border bg-header text-header-foreground">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-3">
          <BrandLogo />
          <span className="flex-1" />
          {!failed && (
            <span
              aria-hidden="true"
              className="h-11 w-24 animate-pulse rounded-lg bg-accent md:w-52"
            />
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-4 pt-6 pb-16">
        {failed ? (
          <div
            role="alert"
            className="grid place-items-center gap-3 px-5 py-12 text-center text-muted-foreground"
          >
            <TriangleAlert aria-hidden="true" className="size-8" />
            <p>Não foi possível carregar sua conta.</p>
            <Button type="button" variant="outline" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <div
            role="status"
            aria-label="Carregando"
            className="h-8 w-64 animate-pulse rounded-lg bg-accent"
          />
        )}
      </main>
    </>
  );
}
