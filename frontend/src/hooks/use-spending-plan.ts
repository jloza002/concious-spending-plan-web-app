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

/** Update plan top-level fields with debounce */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mutation = useMutation({
    mutationFn: (data: UpdatePlanInput) =>
      api.put<SpendingPlan>(`/plans/${planId}`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });

  const debouncedUpdate = useCallback(
    (data: UpdatePlanInput) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        mutation.mutate(data);
      }, 500);
    },
    [mutation]
  );

  return { ...mutation, debouncedUpdate };
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
