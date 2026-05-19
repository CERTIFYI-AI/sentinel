import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ropaApi } from '@/api/ropa';
import { toast } from 'sonner';

export const useRopaRecords = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['ropa', filters], queryFn: () => ropaApi.list(filters) });

export const useRopaRecord = (id: string) =>
  useQuery({ queryKey: ['ropa', id], queryFn: () => ropaApi.getById(id), enabled: !!id });

export const useCreateRopaRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => ropaApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ropa'] }); toast.success('Processing Activity created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateRopaRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => ropaApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ropa'] }); toast.success('Processing Activity updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRopaRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => ropaApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ropa'] }); toast.success('Processing Activity removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
