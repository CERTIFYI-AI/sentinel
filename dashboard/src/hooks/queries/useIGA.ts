import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { igaApi } from '@/api/iga';
import { toast } from 'sonner';

export const useAccessReviews = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['access-reviews', filters], queryFn: () => igaApi.list(filters) });

export const useAccessReview = (id: string) =>
  useQuery({ queryKey: ['access-reviews', id], queryFn: () => igaApi.getById(id), enabled: !!id });

export const useCreateAccessReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => igaApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-reviews'] }); toast.success('Access Review created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateAccessReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => igaApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-reviews'] }); toast.success('Access Review updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteAccessReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => igaApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-reviews'] }); toast.success('Access Review removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
