import { supabase } from '@/lib/supabase';
import { fromDB, mutateDB } from '@/lib/dataSource';
import { logAction } from '@/lib/auditLogger';

const TABLE = 'risks';
const MODULE = 'risks';

export const risksApi = {
  list: async (filters: Record<string, any> = {}) => {
    const fallback: any[] = [];
    return fromDB(
      () => supabase.from(TABLE).select('*').match(filters).order('created_at', { ascending: false }),
      fallback
    );
  },

  getById: async (id: string) => {
    const result = await fromDB(
      () => supabase.from(TABLE).select('*').eq('id', id).limit(1),
      []
    );
    return result[0] ?? null;
  },

  create: async (data: any) => {
    const result = await mutateDB(
      () => supabase.from(TABLE).insert(data).select().single(),
      () => ({ ...data, id: crypto.randomUUID() })
    );
    await logAction({ module: MODULE, entityType: 'risks', entityId: result?.id, entityName: result?.name || result?.title, action: 'create', newValues: result });
    return result;
  },

  update: async (id: string, data: any) => {
    const result = await mutateDB(
      () => supabase.from(TABLE).update(data).eq('id', id).select().single(),
      () => ({ id, ...data })
    );
    await logAction({ module: MODULE, entityType: 'risks', entityId: id, action: 'update', newValues: data });
    return result;
  },

  delete: async (id: string, name?: string) => {
    await mutateDB(
      () => supabase.from(TABLE).delete().eq('id', id) as any,
      () => null as any
    );
    await logAction({ module: MODULE, entityType: 'risks', entityId: id, entityName: name, action: 'delete' });
  },
};
