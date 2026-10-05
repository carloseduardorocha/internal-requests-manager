"use client";

import {
  DashboardError,
  DashboardSkeleton,
} from "@/features/dashboard/components/dashboard-states";
import { PriorityDistribution } from "@/features/dashboard/components/priority-distribution";
import { StatCards } from "@/features/dashboard/components/stat-cards";
import { useDashboard } from "@/features/dashboard/hooks/use-dashboard";

// Role restriction (analyst and admin) comes from the route map via RequireRole.
export default function DashboardPage() {
  const { loading, error, data, reload } = useDashboard();

  let body;
  if (loading) {
    body = <DashboardSkeleton />;
  } else if (error || !data) {
    body = <DashboardError onRetry={reload} />;
  } else {
    body = (
      <div className="grid gap-6">
        <StatCards data={data} />
        <PriorityDistribution data={data} />
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="font-heading text-[26px] font-extrabold">Painel</h1>
        <p className="mt-1 text-muted-foreground">
          Visão geral das solicitações da empresa.
        </p>
      </div>
      <div aria-live="polite">{body}</div>
    </>
  );
}
