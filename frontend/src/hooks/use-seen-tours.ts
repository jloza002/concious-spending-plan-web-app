"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface MeResponse {
  id: string;
  seenTours?: string[];
}

/**
 * Which product tours the signed-in user has already seen. Stored on the account
 * (server-side) so tours don't re-run on every new browser/device.
 */
export function useSeenTours() {
  return useQuery<string[]>({
    queryKey: ["seen-tours"],
    queryFn: async () => {
      const me = await api.get<MeResponse>("/users/me");
      return me.seenTours ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Record that a tour has been seen (account-scoped). */
export function useMarkTourSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tourId: string) => api.post<{ seenTours: string[] }>("/users/me/seen-tour", { tourId }),
    onMutate: async (tourId) => {
      await queryClient.cancelQueries({ queryKey: ["seen-tours"] });
      const prev = queryClient.getQueryData<string[]>(["seen-tours"]);
      queryClient.setQueryData<string[]>(["seen-tours"], (old) =>
        old ? (old.includes(tourId) ? old : [...old, tourId]) : [tourId]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["seen-tours"], ctx.prev);
    },
    onSuccess: (data) => {
      if (data?.seenTours) queryClient.setQueryData(["seen-tours"], data.seenTours);
    },
  });
}
