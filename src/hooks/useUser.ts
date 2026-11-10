import { trpc } from "@/lib/trpc-client";

export function useUser() {
  const query = trpc.user.getProfile.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { profile, subscription, ...userData } = query.data || {};

  return {
    user: query.data ? userData : null,
    profile: profile || null,
    subscription: subscription || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
