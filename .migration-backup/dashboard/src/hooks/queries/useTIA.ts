import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tiaApi } from '@/api/tia';
import { toast } from 'sonner';

export const useTias = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['tia', filters], queryFn: () => tiaApi.list(filters) });

export const useTia = (id: string) =>
  useQuery({ queryKey: ['tia', id], queryFn: () => tiaApi.getById(id), enabled: !!id });

export const useCreateTia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => tiaApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tia'] }); toast.success('Transfer Assessment created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateTia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => tiaApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tia'] }); toast.success('Transfer Assessment updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteTia = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => tiaApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tia'] }); toast.success('Transfer Assessment removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
