import { create } from 'zustand';
import { api } from './apiClient';

export type ModalMode = 'closed' | 'add' | 'edit' | 'detail' | 'delete';

export interface EntityState<T extends { id: string }> {
  items: T[];
  selectedItem: T | null;
  isLoading: boolean;
  isSubmitting: boolean;
  modalMode: ModalMode;
  search: string;
  filters: Record<string, string>;
  fetchItems: () => Promise<void>;
  createItem: (data: Partial<T>) => Promise<T>;
  updateItem: (id: string, data: Partial<T>) => Promise<T>;
  deleteItem: (id: string) => Promise<void>;
  openAdd: () => void;
  openEdit: (item: T) => void;
  openDetail: (item: T) => void;
  openDelete: (item: T) => void;
  closeAll: () => void;
  setSearch: (s: string) => void;
  setFilter: (key: string, value: string) => void;
}

export function createEntityStore<T extends { id: string }>(endpoint: string) {
  return create<EntityState<T>>((set, get) => ({
    items: [],
    selectedItem: null,
    isLoading: false,
    isSubmitting: false,
    modalMode: 'closed',
    search: '',
    filters: {},
    fetchItems: async () => {
      set({ isLoading: true });
      try {
        const params = { ...get().filters };
        if (get().search) params.search = get().search;
        const res = await api.get<T[] | { items: T[] }>(endpoint, params);
        const items = Array.isArray(res) ? res : (res as any).items ?? [];
        set({ items, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },
    createItem: async (data) => {
      set({ isSubmitting: true });
      try {
        const item = await api.post<T>(endpoint, data);
        set((s) => ({ items: [item, ...s.items], isSubmitting: false, modalMode: 'closed' }));
        return item;
      } catch (e) {
        set({ isSubmitting: false });
        throw e;
      }
    },
    updateItem: async (id, data) => {
      set({ isSubmitting: true });
      try {
        const item = await api.patch<T>(`${endpoint}/${id}`, data);
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? item : i)),
          selectedItem: item,
          isSubmitting: false,
          modalMode: 'closed',
        }));
        return item;
      } catch (e) {
        set({ isSubmitting: false });
        throw e;
      }
    },
    deleteItem: async (id) => {
      set({ isSubmitting: true });
      try {
        await api.del(`${endpoint}/${id}`);
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
          selectedItem: null,
          isSubmitting: false,
          modalMode: 'closed',
        }));
      } catch (e) {
        set({ isSubmitting: false });
        throw e;
      }
    },
    openAdd: () => set({ modalMode: 'add', selectedItem: null }),
    openEdit: (item) => set({ modalMode: 'edit', selectedItem: item }),
    openDetail: (item) => set({ modalMode: 'detail', selectedItem: item }),
    openDelete: (item) => set({ modalMode: 'delete', selectedItem: item }),
    closeAll: () => set({ modalMode: 'closed', selectedItem: null }),
    setSearch: (search) => set({ search }),
    setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  }));
}
