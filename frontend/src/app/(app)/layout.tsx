import { AuthProvider } from "@/features/auth/auth-provider";
import { AppHeader } from "@/features/auth/components/app-header";
import { RequireRole } from "@/features/auth/require-role";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-[1100px] gap-6 px-4 pt-6 pb-16">
        <RequireRole>{children}</RequireRole>
      </main>
    </AuthProvider>
  );
}
