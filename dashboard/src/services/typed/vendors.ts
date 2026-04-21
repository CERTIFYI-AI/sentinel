// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS3 — Typed vendor service.
import { z } from 'zod'
import { createService } from '../../lib/serviceFactory'

export const VendorSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  risk_tier: z.number().int().min(1).max(4).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_REVIEW', 'SUSPENDED']).default('ACTIVE'),
  description: z.string().optional(),
  contact_email: z.string().email().optional(),
  contract_expiry: z.string().optional(),
  created_at: z.string().optional(),
})

export type Vendor = z.infer<typeof VendorSchema>

export const vendorService = createService<typeof VendorSchema, Vendor>({
  table: 'vendors',
  schema: VendorSchema,
  orgField: 'org_id',
  softDelete: false,
})
