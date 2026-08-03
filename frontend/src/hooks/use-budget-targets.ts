"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { BudgetTarget } from "@csp/shared";
import { useCallback, useRef } from "react";

/** One row as the caller wants it saved (label carried for optimistic paint). */
export interface BudgetTargetDraft {
  userCategoryId: string;
  label: string;
  amount: number;
}

export const budgetTargetsKey = (month: number, year: number) =>
  ["budget-targets", month, year] as const;

/** Fetch a month's budget. Disabled until a real month/year is known. */
export function useBudgetTargets(month: number, year: number) {
  return useQuery<BudgetTarget[]>({
    queryKey: budgetTargetsKey(month, year),
    queryFn: () => api.get(`/budget-targets?month=${month}&year=${year}`),
    enabled: month >= 1 && month <= 12 && year > 0,
  });
}

/**
 * Replace a month's budget, debounced.
 *
 * The cache is written synchronously inside `save` rather than in the
 * mutation's `onMutate`, because the debounce means `onMutate` doesn't run
 * until 500ms after the click — checkboxes and amount edits would visibly lag.
 * `onError` restores the snapshot taken at the moment of the edit.
 */
export function useSetBudgetTargets(month: number, year: number) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rollbackRef = useRef<BudgetTarget[] | undefined>(undefined);
  const key = budgetTargetsKey(month, year);

  const mutation = useMutation({
    mutationFn: (drafts: BudgetTargetDraft[]) =>
      api.put<BudgetTarget[]>("/budget-targets", {
        month,
        year,
        targets: drafts.map((d) => ({
          userCategoryId: d.userCategoryId,
          amount: d.amount,
        })),
      }),
    onError: () => {
      if (rollbackRef.current) {
        queryClient.setQueryData(key, rollbackRef.current);
        rollbackRef.current = undefined;
      }
    },
    onSuccess: (data) => {
      rollbackRef.current = undefined;
      queryClient.setQueryData(key, data);
    },
  });

  const save = useCallback(
    (
      next:
        | BudgetTargetDraft[]
        | ((current: BudgetTargetDraft[]) => BudgetTargetDraft[])
    ) => {
      // Snapshot once per debounce window so a rollback returns to the last
      // server-confirmed state, not to a half-applied intermediate edit.
      if (rollbackRef.current === undefined) {
        rollbackRef.current = queryClient.getQueryData<BudgetTarget[]>(key);
      }

      const existing = queryClient.getQueryData<BudgetTarget[]>(key) ?? [];

      // Updater form reads the cache, not the caller's render-time snapshot.
      // Several toggles inside one render batch all close over the same stale
      // list, so passing an array would make each click clobber the last.
      const drafts =
        typeof next === "function"
          ? next(
              existing.map((t) => ({
                userCategoryId: t.userCategoryId,
                label: t.label,
                amount: t.amount,
              }))
            )
          : next;

      queryClient.setQueryData<BudgetTarget[]>(
        key,
        drafts.map((d) => {
          const prior = existing.find(
            (e) => e.userCategoryId === d.userCategoryId
          );
          return {
            id: prior?.id ?? `optimistic-${d.userCategoryId}`,
            userCategoryId: d.userCategoryId,
            label: d.label,
            month,
            year,
            amount: d.amount,
          };
        })
      );

      // Each call resets the timer, so the request carries the newest drafts.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => mutation.mutate(drafts), 500);
    },
    [mutation, queryClient, key, month, year]
  );

  return { ...mutation, save };
}
