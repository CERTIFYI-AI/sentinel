// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * createResourceQueries — TanStack Query v5 hook factory.
 *
 * Given a Service<Row, Input>, return a bundle of typed hooks:
 *   useList, useDetail, useCreate, useUpdate, useDelete, useBulk.
 *
 * Rationale: repeating ~150 LOC of boilerplate for every one of 80 resources
 * is a maintenance nightmare. Centralizing the query/mutation shapes lets us
 * evolve cache invalidation, retry policy, and error handling in ONE place.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { isErr, type AppError, type Result } from "../result";
import type { CursorPage, ListOptions, Service } from "../service/createService";

export interface ResourceQueries<Row extends { id: string }, Input> {
  keys: {
    all: () => readonly [string];
    lists: () => readonly [string, "list"];
    list: (opts?: ListOptions) => readonly unknown[];
    detail: (id: string) => readonly [string, "detail", string];
  };
  useList: (opts?: ListOptions) => UseQueryResult<CursorPage<Row>, AppError>;
  useDetail: (id: string | null | undefined) => UseQueryResult<Row, AppError>;
  useCreate: () => UseMutationResult<Row, AppError, Input>;
  useUpdate: () => UseMutationResult<Row, AppError, { id: string; patch: Partial<Input> }>;
  useDelete: () => UseMutationResult<true, AppError, string>;
  useBulk: () => UseMutationResult<
    { succeeded: string[]; failed: { id: string; error: AppError }[] },
    AppError,
    { ids: readonly string[]; patch: Partial<Input> }
  >;
}

/** Unwrap Result into the value or throw for TanStack Query's error channel. */
function toQueryFn<T>(r: Result<T, AppError>): T {
  if (isErr(r)) throw r.error;
  return r.value;
}

export function createResourceQueries<Row extends { id: string }, Input>(
  service: Service<Row, Input>,
  resourceKey: string,
): ResourceQueries<Row, Input> {
  const keys = {
    all: () => [resourceKey] as const,
    lists: () => [resourceKey, "list"] as const,
    list: (opts?: ListOptions) =>
      [
        resourceKey,
        "list",
        opts?.cursor ?? null,
        opts?.limit ?? null,
        opts?.orderBy ?? null,
        opts?.orderDir ?? null,
        opts?.filters ?? null,
        opts?.search ?? null,
      ] as const,
    detail: (id: string) => [resourceKey, "detail", id] as const,
  };

  function useList(opts?: ListOptions): UseQueryResult<CursorPage<Row>, AppError> {
    return useQuery<CursorPage<Row>, AppError>({
      queryKey: keys.list(opts),
      queryFn: async ({ signal }) => {
        const merged: ListOptions = { ...(opts ?? {}), signal };
        const r = await service.list(merged);
        return toQueryFn(r);
      },
      staleTime: 30_000,
    });
  }

  function useDetail(
    id: string | null | undefined,
  ): UseQueryResult<Row, AppError> {
    return useQuery<Row, AppError>({
      queryKey: keys.detail(id ?? "__none__"),
      queryFn: async ({ signal }) => {
        if (!id) throw new Error("id required");
        const r = await service.get(id, { signal });
        return toQueryFn(r);
      },
      enabled: Boolean(id),
      staleTime: 30_000,
    });
  }

  function useCreate(): UseMutationResult<Row, AppError, Input> {
    const qc = useQueryClient();
    return useMutation<Row, AppError, Input>({
      mutationFn: async (input) => {
        const r = await service.create(input);
        return toQueryFn(r);
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: keys.lists() });
      },
    });
  }

  function useUpdate(): UseMutationResult<
    Row,
    AppError,
    { id: string; patch: Partial<Input> }
  > {
    const qc = useQueryClient();
    return useMutation<Row, AppError, { id: string; patch: Partial<Input> }>({
      mutationFn: async ({ id, patch }) => {
        const r = await service.update(id, patch);
        return toQueryFn(r);
      },
      onSuccess: (_data, vars) => {
        void qc.invalidateQueries({ queryKey: keys.lists() });
        void qc.invalidateQueries({ queryKey: keys.detail(vars.id) });
      },
    });
  }

  function useDelete(): UseMutationResult<true, AppError, string> {
    const qc = useQueryClient();
    return useMutation<true, AppError, string>({
      mutationFn: async (id) => {
        const r = await service.remove(id);
        return toQueryFn(r);
      },
      onSuccess: (_data, id) => {
        void qc.invalidateQueries({ queryKey: keys.lists() });
        void qc.invalidateQueries({ queryKey: keys.detail(id) });
      },
    });
  }

  function useBulk(): UseMutationResult<
    { succeeded: string[]; failed: { id: string; error: AppError }[] },
    AppError,
    { ids: readonly string[]; patch: Partial<Input> }
  > {
    const qc = useQueryClient();
    return useMutation<
      { succeeded: string[]; failed: { id: string; error: AppError }[] },
      AppError,
      { ids: readonly string[]; patch: Partial<Input> }
    >({
      mutationFn: async ({ ids, patch }) => {
        const r = await service.bulk(ids, patch);
        return toQueryFn(r);
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: keys.lists() });
      },
    });
  }

  return { keys, useList, useDetail, useCreate, useUpdate, useDelete, useBulk };
}
