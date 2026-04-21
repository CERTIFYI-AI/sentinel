// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS3 — Typed incidents service (reference implementation).

import { z } from "zod";
import { createService } from "@/lib/serviceFactory";

export const IncidentSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["new", "triaged", "investigating", "contained", "resolved", "closed"]),
  detected_at: z.string().datetime().nullable(),
  resolved_at: z.string().datetime().nullable(),
  assignee_id: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
  deleted_at: z.string().datetime().nullable(),
});

export const IncidentInputSchema = IncidentSchema.pick({
  title: true,
  description: true,
  severity: true,
  status: true,
  detected_at: true,
  resolved_at: true,
  assignee_id: true,
  metadata: true,
});

export type Incident = z.infer<typeof IncidentSchema>;
export type IncidentInput = z.infer<typeof IncidentInputSchema>;

export const incidentsService = createService<typeof IncidentSchema, IncidentInput>({
  table: "incidents",
  schema: IncidentSchema,
  inputSchema: IncidentInputSchema,
  defaultOrder: { column: "detected_at", ascending: false },
});
