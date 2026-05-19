// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// WS0.5 — Thin wrapper over react-hook-form + zod. Exposes a typed
// handle and a hand-rolled resolver so we don't take a hard dep on
// the @hookform/resolvers/zod generic signature (which churns across
// zod 3/4 + rhf 7 majors).

import { useForm, type UseFormProps, type UseFormReturn, type FieldValues, type Resolver } from "react-hook-form";
import type { z, ZodType } from "zod";

export type SchemaValues<S extends ZodType> = z.infer<S>;

/**
 * Build a react-hook-form Resolver from a zod schema.
 * Matches the Resolver contract: returns { values, errors }.
 */
function zodResolverFactory<S extends ZodType>(schema: S): Resolver<FieldValues> {
  return async (values) => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data as FieldValues, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "_root";
      if (!errors[path]) errors[path] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errors as never };
  };
}

export function useFormWithSchema<S extends ZodType>(
  schema: S,
  options?: Omit<UseFormProps<FieldValues>, "resolver">,
): UseFormReturn<FieldValues> {
  return useForm<FieldValues>({
    ...(options ?? {}),
    resolver: zodResolverFactory(schema),
  });
}

/** Flatten nested rhf errors to field → message for banner UIs. */
export function flattenFormErrors(
  errs: Record<string, { message?: string } | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errs)) {
    if (v?.message) out[k] = v.message;
  }
  return out;
}
