import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { biaApi } from '@/api/bia';
import { toast } from 'sonner';

export const useBiaRecords = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['bia', filters], queryFn: () => biaApi.list(filters) });

export const useBiaRecord = (id: string) =>
  useQuery({ queryKey: ['bia', id], queryFn: () => biaApi.getById(id), enabled: !!id });

export const useCreateBiaRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => biaApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bia'] }); toast.success('BIA Record created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateBiaRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => biaApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bia'] }); toast.success('BIA Record updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteBiaRecord = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => biaApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bia'] }); toast.success('BIA Record removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
