// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS3 — Typed model inventory service.
import { z } from 'zod'
import { createService } from '../../lib/serviceFactory'

export const ModelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  type: z.string().optional(),
  status: z.string(),
  riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  accuracy: z.number().min(0).max(1).optional(),
  vendorId: z.string().optional(),
  datasetId: z.string().optional(),
  ownerId: z.string(),
  tenantId: z.string(),
})

export type Model = z.infer<typeof ModelSchema>

export const modelService = createService<typeof ModelSchema, Model>({
  table: 'Model',
  schema: ModelSchema,
  orgField: 'tenantId',
  softDelete: false,
})
