import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regulatorFilingsApi } from '@/api/regulatorFilings';
import { toast } from 'sonner';

export const useRegulatorFilings = (filters?: Record<string, any>) =>
  useQuery({ queryKey: ['regulator-filings', filters], queryFn: () => regulatorFilingsApi.list(filters) });

export const useRegulatorFiling = (id: string) =>
  useQuery({ queryKey: ['regulator-filings', id], queryFn: () => regulatorFilingsApi.getById(id), enabled: !!id });

export const useCreateRegulatorFiling = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => regulatorFilingsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulator-filings'] }); toast.success('Filing created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateRegulatorFiling = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => regulatorFilingsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulator-filings'] }); toast.success('Filing updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRegulatorFiling = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => regulatorFilingsApi.delete(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['regulator-filings'] }); toast.success('Filing removed'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
