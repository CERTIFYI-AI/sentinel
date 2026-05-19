import { supabase } from '@/lib/supabase';
import { fromDB, mutateDB } from '@/lib/dataSource';
import { logAction } from '@/lib/auditLogger';

const TABLE = 'notifications';

export const notificationsApi = {
  list: async (filters: Record<string, any> = {}) => {
    return fromDB(
      () => supabase.from(TABLE).select('*').match(filters).order('created_at', { ascending: false }).limit(50),
      []
    );
  },

  create: async (data: any) => {
    const result = await mutateDB(
      () => supabase.from(TABLE).insert(data).select().single(),
      () => ({ ...data, id: crypto.randomUUID() })
    );
    return result;
  },

  markRead: async (id: string) => {
    await mutateDB(
      () => supabase.from(TABLE).update({ is_read: true }).eq('id', id).select().single(),
      () => ({ id, is_read: true })
    );
  },

  markAllRead: async () => {
    await supabase.from(TABLE).update({ is_read: true }).eq('is_read', false);
  },

  subscribe: (callback: (payload: any) => void) => {
    if (!supabase) return { unsubscribe: () => {} };
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, callback)
      .subscribe();
    return { unsubscribe: () => { supabase.removeChannel(channel); } };
  },
};
