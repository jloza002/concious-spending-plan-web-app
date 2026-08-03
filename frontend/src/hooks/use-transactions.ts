"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Transaction, CsvTransaction, ManualTransactionInput } from "@csp/shared";

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

/** Update a single transaction's category — optimistic update, no refetch */
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
    onMutate: async ({ transactionId, spendingCategory, spendingSubcategory }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const snapshots = queryClient.getQueriesData<Transaction[]>({ queryKey: ["transactions"] });
      queryClient.setQueriesData<Transaction[]>(
        { queryKey: ["transactions"] },
        (old) => old?.map((t) =>
          t.id === transactionId ? { ...t, spendingCategory, spendingSubcategory } : t
        )
      );
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
  });
}

/** Delete a single transaction — optimistic update, no refetch */
export function useDeleteTransaction(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      api.delete(`/transactions/${transactionId}`),
    onMutate: async (transactionId) => {
      await queryClient.cancelQueries({ queryKey: ["transactions", planId] });
      const previous = queryClient.getQueryData<Transaction[]>(["transactions", planId]);
      queryClient.setQueryData<Transaction[]>(
        ["transactions", planId],
        (old) => old?.filter((t) => t.id !== transactionId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", planId], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", planId, "deleted"] });
    },
  });
}

/** Delete several transactions at once — optimistic update, no refetch */
export function useBulkDeleteTransactions(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionIds: string[]) =>
      api.post(`/transactions/bulk-delete`, { transactionIds }),
    onMutate: async (transactionIds) => {
      await queryClient.cancelQueries({ queryKey: ["transactions", planId] });
      const previous = queryClient.getQueryData<Transaction[]>(["transactions", planId]);
      const idSet = new Set(transactionIds);
      queryClient.setQueryData<Transaction[]>(
        ["transactions", planId],
        (old) => old?.filter((t) => !idSet.has(t.id))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", planId], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", planId, "deleted"] });
    },
  });
}

/** Fetch soft-deleted transactions for a plan */
export function useDeletedTransactions(planId: string) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", planId, "deleted"],
    queryFn: () => api.get(`/plans/${planId}/transactions/deleted`),
    enabled: !!planId,
  });
}

/** Restore a soft-deleted transaction */
export function useRestoreTransaction(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      api.patch(`/transactions/${transactionId}/restore`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", planId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", planId, "deleted"] });
    },
  });
}

/** Add a manual transaction */
export function useAddTransaction(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ManualTransactionInput) =>
      api.post<Transaction>(`/plans/${planId}/transaction`, data),
    onSuccess: (newTransaction) => {
      queryClient.setQueryData<Transaction[]>(
        ["transactions", planId],
        (old) => (old ? [newTransaction, ...old] : [newTransaction])
      );
    },
  });
}

/** Update a transaction's type — optimistic update, no refetch */
export function useUpdateTransactionType(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, type }: { transactionId: string; type: string }) =>
      api.patch(`/transactions/${transactionId}/type`, { type }),
    onMutate: async ({ transactionId, type }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions", planId] });
      const previous = queryClient.getQueryData<Transaction[]>(["transactions", planId]);
      queryClient.setQueryData<Transaction[]>(
        ["transactions", planId],
        (old) => old?.map((t) => (t.id === transactionId ? { ...t, type: type as Transaction["type"] } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", planId], context.previous);
      }
    },
  });
}

/** Update a transaction's account type — optimistic update */
export function useUpdateTransactionAccountType(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      accountType,
    }: {
      transactionId: string;
      accountType: "credit_card" | "checking" | "savings" | null;
    }) => api.patch(`/transactions/${transactionId}/account-type`, { accountType }),
    onMutate: async ({ transactionId, accountType }) => {
      await queryClient.cancelQueries({ queryKey: ["transactions", planId] });
      const previous = queryClient.getQueryData<Transaction[]>(["transactions", planId]);
      queryClient.setQueryData<Transaction[]>(
        ["transactions", planId],
        (old) => old?.map((t) => (t.id === transactionId ? { ...t, accountType } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", planId], context.previous);
      }
    },
  });
}

/** Permanently delete all transactions for a plan */
export function useDeleteAllTransactions(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/plans/${planId}/transactions`),
    onSuccess: () => {
      queryClient.setQueryData(["transactions", planId], []);
      queryClient.setQueryData(["transactions", planId, "deleted"], []);
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
