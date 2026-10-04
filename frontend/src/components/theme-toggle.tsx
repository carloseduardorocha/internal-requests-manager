"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is undefined until mounted, so server and first client render match.
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="min-h-11 gap-1.5 border-primary bg-transparent px-3 text-primary hover:bg-primary hover:text-primary-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Moon aria-hidden="true" className="dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
      <span className="dark:hidden">Escuro</span>
      <span className="hidden dark:inline">Claro</span>
    </Button>
  );
}
