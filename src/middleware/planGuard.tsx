"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Loader2 } from "lucide-react";

type PlanGuardProps = {
  children: React.ReactNode;
  requiredPlan?: "any" | "paid";
};

export function PlanGuard({ children, requiredPlan = "paid" }: PlanGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { data: status, isLoading } = trpc.subscription.getStatus.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!isLoading && status) {
      if (requiredPlan === "paid" && !status.canAccessPremium) {
        router.replace("/upgrade");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [isLoading, status, requiredPlan, router]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-Order Component for protecting routes
 */
export function withPlanGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredPlan: "any" | "paid" = "paid"
) {
  return function ProtectedComponent(props: P) {
    return (
      <PlanGuard requiredPlan={requiredPlan}>
        <Component {...props} />
      </PlanGuard>
    );
  };
}
