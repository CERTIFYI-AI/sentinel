// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// Generic TanStack Query hooks for any resource service.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Result } from '../types/errors'
import type { ListOptions } from '../lib/serviceFactory'

type Service<T> = {
  list: (opts: ListOptions) => Promise<Result<T[]>>
  get: (id: string, orgId: string) => Promise<Result<T>>
  create: (input: Partial<T>) => Promise<Result<T>>
  update: (id: string, orgId: string, input: Partial<T>) => Promise<Result<T>>
  remove: (id: string, orgId: string) => Promise<Result<void>>
}

export function useList<T>(
  key: string,
  service: Service<T>,
  opts: ListOptions,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [key, 'list', opts],
    queryFn: async () => {
      const result = await service.list(opts)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!opts.orgId && (options?.enabled ?? true),
    staleTime: 30_000,
  })
}

export function useDetail<T>(
  key: string,
  service: Service<T>,
  id: string,
  orgId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [key, 'detail', id],
    queryFn: async () => {
      const result = await service.get(id, orgId)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!id && !!orgId && (options?.enabled ?? true),
    staleTime: 30_000,
  })
}

export function useCreate<T>(key: string, service: Service<T>, orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<T>) => {
      const result = await service.create(input)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] })
      toast.success(`${key} created successfully`)
    },
    onError: (e: Error) => toast.error(`Failed to create ${key}: ${e.message}`),
  })
}

export function useUpdate<T>(key: string, service: Service<T>, orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<T> }) => {
      const result = await service.update(id, orgId, input)
      if (!result.ok) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] })
      toast.success(`${key} updated successfully`)
    },
    onError: (e: Error) => toast.error(`Failed to update ${key}: ${e.message}`),
  })
}

export function useDelete<T>(key: string, service: Service<T>, orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await service.remove(id, orgId)
      if (!result.ok) throw new Error(result.error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] })
      toast.success(`${key} deleted`)
    },
    onError: (e: Error) => toast.error(`Failed to delete ${key}: ${e.message}`),
  })
}
