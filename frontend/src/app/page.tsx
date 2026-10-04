import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

// Provisional home page: confirms the environment is up. Replaced by the login screen.
export default function Home() {
  return (
    <>
      <header className="border-b border-border bg-header text-header-foreground">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-3">
          <BrandLogo />
          <span
            aria-hidden="true"
            className="mx-1 hidden h-7 w-px bg-border-strong sm:block"
          />
          <strong className="hidden font-heading text-base sm:inline">
            Solicitações Internas
          </strong>
          <span className="flex-1" />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] px-4 pt-6 pb-16">
        <h1 className="font-heading text-[26px] font-extrabold">
          Solicitações Internas
        </h1>
        <p className="mt-2 text-muted-foreground">O ambiente está no ar.</p>
      </main>
    </>
  );
}
