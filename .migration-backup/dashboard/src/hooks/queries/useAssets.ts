import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '@/api/assets';
import { toast } from 'sonner';

export const useAssets = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['assets', filters], queryFn: () => assetsApi.list(filters) });

export const useAsset = (id: string) =>
  useQuery({ queryKey: ['assets', id], queryFn: () => assetsApi.getById(id), enabled: !!id });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => assetsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => assetsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => assetsApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); toast.success('Asset removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
