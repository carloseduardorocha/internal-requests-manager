"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/features/auth/auth-provider";
import { UserMenu } from "@/features/auth/components/user-menu";
import { matchesRoute, routesFor } from "@/features/auth/routes";

export function AppHeader() {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-header text-header-foreground">
      <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 py-3">
        <BrandLogo />
        <span
          aria-hidden="true"
          className="mx-1 hidden h-7 w-px bg-border-strong min-[481px]:block"
        />
        <strong className="hidden font-heading text-base min-[481px]:inline">
          Solicitações Internas
        </strong>
        <nav aria-label="Principal" className="ml-3 hidden gap-1 md:flex">
          {routesFor(user.role).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={matchesRoute(pathname, href) ? "page" : undefined}
              className="relative inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-muted-foreground no-underline outline-hidden transition-colors after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-sm after:bg-transparent after:transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:text-primary aria-[current=page]:after:bg-primary aria-[current=page]:hover:text-primary-hover aria-[current=page]:hover:after:bg-primary-hover"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <span className="flex-1" />
        <UserMenu />
      </div>
    </header>
  );
}
