"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  SpendingPlan,
  PlanSummary,
  UpdatePlanInput,
  CreatePlanInput,
} from "@csp/shared";
import { useRef, useCallback } from "react";

/** Fetch all plans for the dashboard */
export function usePlans() {
  return useQuery<PlanSummary[]>({
    queryKey: ["plans"],
    queryFn: () => api.get("/plans"),
  });
}

/** Fetch a single plan with all data */
export function usePlan(planId: string) {
  return useQuery<SpendingPlan>({
    queryKey: ["plan", planId],
    queryFn: () => api.get(`/plans/${planId}`),
    enabled: !!planId,
  });
}

export interface CategorySummary {
  actual: Record<string, number>;
  planned: Record<string, number>;
  compareActual: Record<string, number>;
}

/**
 * Fixed-cost category totals across a set of plans, with an optional
 * comparison set — the dashboard's period-aware Spending vs Plan chart, Top
 * Movers card, and pie chart all read from this one endpoint.
 */
export function useCategorySummary(planIds: string[], comparePlanIds: string[]) {
  const key = [...planIds].sort().join(",");
  const compareKey = [...comparePlanIds].sort().join(",");
  return useQuery<CategorySummary>({
    queryKey: ["dashboard-category-summary", key, compareKey],
    queryFn: () =>
      api.get<CategorySummary>(
        `/dashboard/category-summary?planIds=${encodeURIComponent(planIds.join(","))}&comparePlanIds=${encodeURIComponent(comparePlanIds.join(","))}`
      ),
    enabled: planIds.length > 0,
  });
}

/** Create a new plan */
export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanInput) =>
      api.post<SpendingPlan>("/plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

/** Update plan top-level fields with debounce + optimistic cache update */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<UpdatePlanInput>({});

  const mutation = useMutation({
    mutationFn: (data: UpdatePlanInput) =>
      api.put<SpendingPlan>(`/plans/${planId}`, data),
    onSuccess: (data) => {
      // Preserve fields the user has edited while this request was in flight,
      // otherwise the textarea snaps back to stale server text mid-typing.
      queryClient.setQueryData<SpendingPlan>(["plan", planId], (old) => {
        if (!old || Object.keys(pendingRef.current).length === 0) return data;
        return { ...data, ...pendingRef.current };
      });
    },
  });

  const debouncedUpdate = useCallback(
    (data: UpdatePlanInput) => {
      // Apply field change optimistically so the input doesn't cause a layout jump
      pendingRef.current = { ...pendingRef.current, ...data };
      queryClient.setQueryData<SpendingPlan>(["plan", planId], (old) =>
        old ? { ...old, ...pendingRef.current } : old
      );

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const latest = pendingRef.current;
        pendingRef.current = {};
        mutation.mutate(latest);
      }, 500);
    },
    [mutation, planId, queryClient]
  );

  return { ...mutation, debouncedUpdate };
}

/** Add or remove a custom transaction type for a plan */
export function useManageTransactionType(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, type }: { action: "add" | "remove"; type: string }) =>
      api.patch<import("@csp/shared").SpendingPlan>(`/plans/${planId}/transaction-types`, { action, type }),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });
}

/** Delete a plan */
export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => api.delete(`/plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}
