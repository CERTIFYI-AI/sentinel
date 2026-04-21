// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// Generic typed service factory — generates list/get/create/update/delete/bulk
// for any Supabase table. Enforces org_id scoping on every query.
import type { ZodSchema } from 'zod'
import { supabase } from './supabase'
import { ok, err, type Result } from '../types/errors'

export interface ServiceConfig<_TSchema extends ZodSchema, T> {
  table: string
  schema: _TSchema
  orgField: string      // column name for org/tenant scoping
  softDelete?: boolean  // use deleted_at instead of hard DELETE
  defaultOrder?: { column: string; ascending: boolean }
}

export interface ListOptions {
  orgId: string
  limit?: number
  offset?: number
  filters?: Record<string, unknown>
  search?: string
  order?: { column: string; ascending: boolean }
}

export function createService<TSchema extends ZodSchema, T extends Record<string, unknown>>(
  config: ServiceConfig<TSchema, T>
) {
  const { table, schema, orgField, softDelete = false } = config

  async function list(opts: ListOptions): Promise<Result<T[]>> {
    let q = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq(orgField, opts.orgId)

    if (softDelete) q = q.is('deleted_at', null)

    if (opts.filters) {
      Object.entries(opts.filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q = q.eq(k, v)
      })
    }

    const order = opts.order ?? config.defaultOrder ?? { column: 'created_at', ascending: false }
    q = q.order(order.column, { ascending: order.ascending })

    if (opts.limit) q = q.limit(opts.limit)
    if (opts.offset !== undefined && opts.limit !== undefined) {
      q = q.range(opts.offset, opts.offset + opts.limit - 1)
    }

    const { data, error } = await q
    if (error) return err('LIST_FAILED', error.message)
    return ok((data ?? []) as T[])
  }

  async function get(id: string, orgId: string): Promise<Result<T>> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq(orgField, orgId)
      .single()
    if (error) return err('GET_FAILED', error.message)
    if (!data) return err('NOT_FOUND', `${table} ${id} not found`)
    return ok(data as T)
  }

  async function create(input: Partial<T>): Promise<Result<T>> {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Validation failed', parsed.error.message)
    }
    const { data, error } = await supabase
      .from(table)
      .insert(parsed.data as Record<string, unknown>)
      .select()
      .single()
    if (error) return err('CREATE_FAILED', error.message)
    return ok(data as T)
  }

  async function update(id: string, orgId: string, input: Partial<T>): Promise<Result<T>> {
    const partial = schema.partial().safeParse(input)
    if (!partial.success) {
      return err('VALIDATION_ERROR', 'Validation failed', partial.error.message)
    }
    const { data, error } = await supabase
      .from(table)
      .update({ ...(partial.data as Record<string, unknown>), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq(orgField, orgId)
      .select()
      .single()
    if (error) return err('UPDATE_FAILED', error.message)
    return ok(data as T)
  }

  async function remove(id: string, orgId: string): Promise<Result<void>> {
    if (softDelete) {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq(orgField, orgId)
      if (error) return err('DELETE_FAILED', error.message)
      return ok(undefined)
    }
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq(orgField, orgId)
    if (error) return err('DELETE_FAILED', error.message)
    return ok(undefined)
  }

  async function bulk(operation: 'create' | 'update' | 'delete', items: Partial<T>[], orgId: string): Promise<Result<T[]>> {
    if (operation === 'create') {
      const { data, error } = await supabase.from(table).insert(items as Record<string, unknown>[]).select()
      if (error) return err('BULK_FAILED', error.message)
      return ok((data ?? []) as T[])
    }
    // Simplified bulk delete
    if (operation === 'delete') {
      const ids = items.map(i => (i as Record<string, unknown>)['id'] as string).filter(Boolean)
      const { error } = await supabase.from(table).delete().in('id', ids).eq(orgField, orgId)
      if (error) return err('BULK_DELETE_FAILED', error.message)
      return ok([])
    }
    return ok([])
  }

  return { list, get, create, update, remove, bulk }
}
