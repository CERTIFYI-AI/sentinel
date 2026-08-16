// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// React Query wrappers over vendorDocumentService. The upload mutation
// resolves only after the object is in Storage AND the row is in the table —
// a toast here means the artefact genuinely exists.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchVendorDocuments, uploadVendorDocument, reviewVendorDocument,
  updateVendorDocument, deleteVendorDocument,
  type VendorDocumentRecord,
} from '@/services/vendorDocumentService'

export function useVendorDocuments(vendorId?: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['vendor-documents', vendorId ?? 'all'],
    queryFn: () => fetchVendorDocuments(vendorId),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor-documents'] })
  const fail = (fallback: string) => (e: unknown) =>
    toast.error(e instanceof Error ? e.message : fallback)

  const upload = useMutation({
    mutationFn: (p: Parameters<typeof uploadVendorDocument>[0]) => uploadVendorDocument(p),
    onSuccess: (saved) => { invalidate(); toast.success(`${saved.fileName ?? 'Document'} uploaded`) },
    onError: fail('Upload failed'),
  })

  const review = useMutation({
    mutationFn: (p: { id: string; decision: 'accepted' | 'rejected'; notes?: string }) =>
      reviewVendorDocument(p),
    onSuccess: (saved) => { invalidate(); toast.success(`Document ${saved.status}`) },
    onError: fail('Failed to record review'),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VendorDocumentRecord> }) =>
      updateVendorDocument(id, patch),
    onSuccess: () => { invalidate(); toast.success('Document updated') },
    onError: fail('Failed to update document'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendorDocument(id),
    onSuccess: () => { invalidate(); toast.success('Document removed') },
    onError: fail('Failed to remove document'),
  })

  return {
    documents: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    upload, review, update, remove,
  }
}
