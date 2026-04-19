import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tabletopApi } from '@/api/tabletop';
import { toast } from 'sonner';

export const useTabletopExercises = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['tabletop', filters], queryFn: () => tabletopApi.list(filters) });

export const useTabletopExercise = (id: string) =>
  useQuery({ queryKey: ['tabletop', id], queryFn: () => tabletopApi.getById(id), enabled: !!id });

export const useCreateTabletopExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => tabletopApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabletop'] }); toast.success('Exercise created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateTabletopExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => tabletopApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabletop'] }); toast.success('Exercise updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteTabletopExercise = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => tabletopApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tabletop'] }); toast.success('Exercise removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
