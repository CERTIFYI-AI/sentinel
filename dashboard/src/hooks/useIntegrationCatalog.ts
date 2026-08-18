// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the integration catalogue and the evidence it
// collects.
//
// The catalogue is global reference data, so it is cached longer than org
// state. Connecting or disconnecting a product writes the org's own
// `integrations` row and invalidates both queries, so the catalogue's
// "Connected" badges and the connector list stay in step.

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchIntegrationCatalog,
  isConnectable,
  reconcileWithServer,
  type CatalogEntry,
} from '@/services/integrationCatalogService'
import { fetchServerAvailableSlugs } from '@/services/integrationConnectService'
import {
  createIntegration,
  softDeleteIntegration,
  fetchIntegrations,
  type IntegrationRecord,
} from '@/services/integrationsService'
import {
  fetchEvidenceForControl,
  fetchFindingsForIntegration,
} from '@/services/integrationFindingsService'
import { logAction } from '@/lib/auditLogger'

/**
 * The published catalogue of evidence sources, reconciled against the server.
 *
 * Two queries, deliberately: the catalogue row carries the operator prose and
 * the intended rollout state, while `GET /v1/integrations/available` is the
 * server's own answer to "what will I accept?". They are maintained in
 * different places and deploy separately, so the second corrects the first —
 * see `reconcileWithServer`. The availability probe never blocks or fails the
 * page: unreachable means "no information", not "nothing is connectable".
 */
export function useIntegrationCatalog() {
  const q = useQuery({
    queryKey: ['integration_catalog'],
    queryFn: fetchIntegrationCatalog,
    staleTime: 10 * 60_000, // reference data; refetching it often is waste
  })
  const available = useQuery({
    queryKey: ['integration_adapters_available'],
    queryFn: fetchServerAvailableSlugs,
    staleTime: 10 * 60_000,
    // Resolves to null rather than throwing when the backend is absent, so a
    // retry storm would buy nothing.
    retry: false,
  })

  const data = useMemo(
    () => reconcileWithServer(q.data ?? [], available.data ?? null),
    [q.data, available.data],
  )

  return {
    data,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
  }
}

/** A catalogue entry paired with the org's instance of it, when connected. */
export interface CatalogEntryWithState {
  entry: CatalogEntry
  connected: IntegrationRecord | null
}

/**
 * The catalogue joined to what this org has actually connected.
 *
 * The join is on `catalogSlug`, the one id-space shared between the two
 * tables — never on name, which would silently mis-pair products.
 */
export function useCatalogWithConnections() {
  const catalog = useIntegrationCatalog()
  const connections = useQuery({
    queryKey: ['integrations'],
    queryFn: fetchIntegrations,
    staleTime: 20_000,
  })

  const rows = useMemo<CatalogEntryWithState[]>(() => {
    const bySlug = new Map<string, IntegrationRecord>()
    for (const i of connections.data ?? []) {
      if (i.catalogSlug) bySlug.set(i.catalogSlug, i)
    }
    return (catalog.data ?? []).map(entry => ({
      entry,
      connected: bySlug.get(entry.slug) ?? null,
    }))
  }, [catalog.data, connections.data])

  return {
    rows,
    isLoading: catalog.isLoading || connections.isLoading,
    isError: catalog.isError || connections.isError,
    error: (catalog.error ?? (connections.error as Error | null)) as Error | null,
  }
}

/**
 * Enable (connect) or disable (disconnect) a catalogue product for this org.
 *
 * Connecting creates the org's `integrations` row carrying `catalog_slug`;
 * the server-side worker picks it up from there. Credentials are NOT handled
 * here — they are written encrypted by the backend, and the browser never
 * holds them (see `sentinel/integrations/crypto.py`). The row therefore starts
 * as `configuring`, which is the honest state: linked, not yet collecting.
 *
 * Disabling soft-deletes the row. Findings already collected are retained —
 * disconnecting a source must not erase the evidence trail it produced
 * (EU AI Act Art. 12).
 */
export function useCatalogConnection() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['integrations'] })
    qc.invalidateQueries({ queryKey: ['integration_catalog'] })
  }

  const connect = useMutation({
    mutationFn: async (entry: CatalogEntry) => {
      if (!isConnectable(entry)) {
        // Defence in depth: the UI hides the affordance, and the server-side
        // worker refuses unknown slugs. This makes the rule explicit here too.
        throw new Error(
          `${entry.name} is catalogued for reference only — no adapter ships for it yet, so it cannot collect evidence.`,
        )
      }
      const created = await createIntegration({
        name: entry.name,
        provider: entry.name,
        category: 'other',
        status: 'configuring',
        description: entry.whyNeeded ?? undefined,
        direction: 'inbound',
        health: 'unknown',
        catalogSlug: entry.slug,
        config: {},
      })
      await logAction({
        module: 'integrations',
        entityType: 'integration',
        entityId: created.id,
        entityName: entry.name,
        action: 'connect',
        newValues: { catalogSlug: entry.slug, status: 'configuring' },
      })
      return created
    },
    onSuccess: invalidate,
  })

  const disconnect = useMutation({
    mutationFn: async (record: IntegrationRecord) => {
      await softDeleteIntegration(record.id)
      await logAction({
        module: 'integrations',
        entityType: 'integration',
        entityId: record.id,
        entityName: record.name,
        action: 'disconnect',
        oldValues: { catalogSlug: record.catalogSlug, status: record.status },
      })
    },
    onSuccess: invalidate,
  })

  return { connect, disconnect }
}

/** Findings collected by one connected integration. */
export function useIntegrationFindings(integrationId: string | null) {
  const q = useQuery({
    queryKey: ['integration_findings', integrationId],
    queryFn: () => fetchFindingsForIntegration(integrationId as string),
    enabled: Boolean(integrationId),
    staleTime: 30_000,
  })
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
  }
}

/** Automated evidence supporting one control. */
export function useControlEvidence(controlId: string | null) {
  const q = useQuery({
    queryKey: ['control_finding_evidence', controlId],
    queryFn: () => fetchEvidenceForControl(controlId as string),
    enabled: Boolean(controlId),
    staleTime: 30_000,
  })
  return {
    data: q.data ?? [],
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error as Error | null,
  }
}
