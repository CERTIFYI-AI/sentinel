// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
import { z } from 'zod'
import { createService } from '../lib/serviceFactory'

export const RiskSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  category: z.string().optional(),
  severity: z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).default('MEDIUM'),
  likelihood: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  status: z.enum(['OPEN','IN_PROGRESS','MITIGATED','ACCEPTED','CLOSED']).default('OPEN'),
  description: z.string().optional(),
  mitigation: z.string().optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
  trend_direction: z.enum(['improving','worsening','stable','new']).optional(),
  trend_delta: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Risk = z.infer<typeof RiskSchema>
export const risksService = createService<typeof RiskSchema, Risk>({ table: 'risks', schema: RiskSchema, orgField: 'org_id' })
