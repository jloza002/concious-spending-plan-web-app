"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Transaction, CsvTransaction } from "@csp/shared";

/** Fetch transactions for a plan */
export function useTransactions(planId: string) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", planId],
    queryFn: () => api.get(`/plans/${planId}/transactions`),
    enabled: !!planId,
  });
}

/** Import CSV transactions */
export function useImportTransactions(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactions: CsvTransaction[]) =>
      api.post(`/plans/${planId}/import`, { transactions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", planId] });
    },
  });
}

/** Update a single transaction's category */
export function useAssignCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      spendingCategory,
      spendingSubcategory,
    }: {
      transactionId: string;
      spendingCategory: string | null;
      spendingSubcategory: string | null;
    }) =>
      api.put(`/transactions/${transactionId}`, {
        spendingCategory,
        spendingSubcategory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/** Auto-categorize transactions using memory */
export function useAutoCategorize(planId: string) {
  return useMutation({
    mutationFn: (descriptions: string[]) =>
      api.post<Record<string, { spendingCategory: string; spendingSubcategory: string; timesUsed: number }>>(
        `/plans/${planId}/auto-categorize`,
        { descriptions }
      ),
  });
}
