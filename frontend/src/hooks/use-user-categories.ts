"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UserCategory } from "@csp/shared";

/** Fetch the user's category library. */
export function useUserCategories() {
  return useQuery<UserCategory[]>({
    queryKey: ["user-categories"],
    queryFn: () => api.get("/user-categories"),
  });
}

/** Add a category to the user's library (cascades to all unlocked plans). */
export function useAddUserCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { section: UserCategory["section"]; label: string }) =>
      api.post<UserCategory>("/user-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });
}

/** Rename a category in the library (cascades to all unlocked plans). */
export function useRenameUserCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newLabel }: { id: string; newLabel: string }) =>
      api.patch<UserCategory>(`/user-categories/${id}`, { newLabel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/** Delete a category from the library (cascades to all unlocked plans). */
export function useDeleteUserCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/user-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/** Lock or unlock a plan. */
export function useTogglePlanLock(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isLocked: boolean) =>
      api.patch(`/plans/${planId}/lock`, { isLocked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
