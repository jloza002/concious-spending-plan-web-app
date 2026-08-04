"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  SpendingPlan,
  LineItemInput,
  UpdateLineItemInput,
} from "@csp/shared";
import { useRef, useCallback } from "react";

/**
 * Add a new line item to a plan section. The backend adds (or revives) a
 * matching entry in the user's category library as a side effect, so the
 * library query is invalidated too — otherwise a second add computed from a
 * stale library (e.g. "New Item 2" still looking free right after the first
 * add created it) collides server-side and silently does nothing.
 */
export function useAddLineItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LineItemInput) =>
      api.post<SpendingPlan>(`/plans/${planId}/items`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
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

/** Reorder line items */
export function useReorderLineItems(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.patch<SpendingPlan>(`/plans/${planId}/items/reorder`, { items }),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });
}

/** Rename a line item — also updates all transactions referencing the old label */
export function useRenameCategory(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, newLabel }: { itemId: string; newLabel: string }) =>
      api.patch<SpendingPlan>(`/plans/${planId}/items/${itemId}/rename`, { newLabel }),
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
      queryClient.invalidateQueries({ queryKey: ["transactions", planId] });
    },
  });
}

/** Delete a line item — optimistic so the open category dropdown updates instantly */
export function useDeleteLineItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete<SpendingPlan>(`/plans/${planId}/items/${itemId}`),
    // Remove the line item from the cache synchronously, inside the click
    // handler, so the dropdown reflects the deletion immediately. Doing it only
    // in onSuccess (after the network round-trip, in a microtask) painted late
    // and made the row look like it "didn't delete".
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ["plan", planId] });
      const previous = queryClient.getQueryData<SpendingPlan>(["plan", planId]);
      queryClient.setQueryData<SpendingPlan>(["plan", planId], (old) =>
        old ? { ...old, lineItems: old.lineItems.filter((i) => i.id !== itemId) } : old
      );
      return { previous };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(["plan", planId], context.previous);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
      // A deleted category clears matching transactions server-side.
      queryClient.invalidateQueries({ queryKey: ["transactions", planId] });
    },
  });
}

/** Toggle a line item's excluded flag — optimistic so totals update instantly */
export function useToggleExcludeLineItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, excluded }: { itemId: string; excluded: boolean }) =>
      api.put<SpendingPlan>(`/plans/${planId}/items/${itemId}`, { excluded }),
    onMutate: async ({ itemId, excluded }) => {
      await queryClient.cancelQueries({ queryKey: ["plan", planId] });
      const previous = queryClient.getQueryData<SpendingPlan>(["plan", planId]);
      queryClient.setQueryData<SpendingPlan>(["plan", planId], (old) =>
        old
          ? { ...old, lineItems: old.lineItems.map((i) => (i.id === itemId ? { ...i, excluded } : i)) }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["plan", planId], context.previous);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["plan", planId], data);
    },
  });
}
