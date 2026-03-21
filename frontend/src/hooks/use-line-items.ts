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

/** Update a line item with debounce */
export function useUpdateLineItem(planId: string) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        mutation.mutate({ itemId, data });
      }, 500);
    },
    [mutation]
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
