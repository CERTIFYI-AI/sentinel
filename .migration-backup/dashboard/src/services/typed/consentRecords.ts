// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS3 — Typed consent records service (reference implementation).
//
// Drop-in modern replacement for the legacy `consentRecordsService`. The
// legacy module stays in place until WS6 completes the org-wide
// migration to avoid breaking all 40+ call sites at once.

import { z } from "zod";
import { createService } from "@/lib/serviceFactory";

export const ConsentRecordSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  subject_id: z.string().min(1),
  purpose: z.string().min(1),
  status: z.enum(["granted", "withdrawn", "expired", "pending"]),
  type: z.enum(["marketing", "analytics", "operational", "legal", "other"]).nullable(),
  granted_at: z.string().datetime().nullable(),
  withdrawn_at: z.string().datetime().nullable(),
  expires_at: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
  deleted_at: z.string().datetime().nullable(),
});

export const ConsentRecordInputSchema = ConsentRecordSchema.pick({
  subject_id: true,
  purpose: true,
  status: true,
  type: true,
  granted_at: true,
  withdrawn_at: true,
  expires_at: true,
  metadata: true,
});

export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;
export type ConsentRecordInput = z.infer<typeof ConsentRecordInputSchema>;

export const consentRecordsService = createService<typeof ConsentRecordSchema, ConsentRecordInput>({
  table: "consent_records",
  schema: ConsentRecordSchema,
  inputSchema: ConsentRecordInputSchema,
  defaultOrder: { column: "created_at", ascending: false },
});
