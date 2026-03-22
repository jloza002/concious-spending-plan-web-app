"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  SpendingPlan,
  LineItemInput,
  UpdateLineItemInput,
} from "@csp/shared";
import { useRef, useCallback } from "react";

/** Add a new line item to a plan section */
export function useAddLineItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LineItemInput) =>
      api.post<SpendingPlan>(`/plans/${planId}/items`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });
}

/** Update a line item with debounce + optimistic cache update */
export function useUpdateLineItem(planId: string) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Keep a pending-changes map so debounced values are applied optimistically immediately
  const pendingRef = useRef<Record<string, UpdateLineItemInput>>({});

  const mutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateLineItemInput;
    }) => api.put<SpendingPlan>(`/plans/${planId}/items/${itemId}`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });

  const debouncedUpdate = useCallback(
    (itemId: string, data: UpdateLineItemInput) => {
      // Apply optimistically to cache immediately so page doesn't jump on server response
      pendingRef.current[itemId] = { ...pendingRef.current[itemId], ...data };
      queryClient.setQueryData<SpendingPlan>(["plan", planId], (old) => {
        if (!old) return old;
        const updatedItems = old.lineItems.map((item) =>
          item.id === itemId ? { ...item, ...pendingRef.current[itemId] } : item
        );
        const investmentsTotal = updatedItems
          .filter((i) => i.section === "investments")
          .reduce((s, i) => s + i.amount, 0);
        const savingsTotal = updatedItems
          .filter((i) => i.section === "savings")
          .reduce((s, i) => s + i.amount, 0);
        const net = old.netMonthlyIncome;
        return {
          ...old,
          lineItems: updatedItems,
          calculations: {
            ...old.calculations,
            investmentsTotal,
            savingsTotal,
            investmentsPercentage: net > 0 ? investmentsTotal / net : 0,
            savingsPercentage: net > 0 ? savingsTotal / net : 0,
          },
        };
      });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const latestData = pendingRef.current[itemId] ?? data;
        delete pendingRef.current[itemId];
        mutation.mutate({ itemId, data: latestData });
      }, 500);
    },
    [mutation, planId, queryClient]
  );

  return { ...mutation, debouncedUpdate };
}

/** Delete a line item */
export function useDeleteLineItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete<SpendingPlan>(`/plans/${planId}/items/${itemId}`),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });
}
