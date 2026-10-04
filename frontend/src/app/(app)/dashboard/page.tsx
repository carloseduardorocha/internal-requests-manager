import { PageSkeleton } from "@/features/auth/components/page-skeleton";

// Role restriction (analyst and admin) comes from the route map via RequireRole.
export default function DashboardPage() {
  return <PageSkeleton title="Painel" />;
}
