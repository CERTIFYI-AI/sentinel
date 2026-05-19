// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
import { z } from 'zod'
import { createService } from '../lib/serviceFactory'

export const IncidentSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  severity: z.enum(['P0','P1','P2','P3','P4']).default('P3'),
  status: z.enum(['OPEN','INVESTIGATING','CONTAINED','RESOLVED','CLOSED']).default('OPEN'),
  category: z.string().optional(),
  description: z.string().optional(),
  affected_models: z.array(z.string()).optional(),
  reported_by: z.string().optional(),
  assigned_to: z.string().optional(),
  resolved_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})
export type Incident = z.infer<typeof IncidentSchema>
export const incidentsService = createService<typeof IncidentSchema, Incident>({ table: 'incidents', schema: IncidentSchema, orgField: 'org_id' })
