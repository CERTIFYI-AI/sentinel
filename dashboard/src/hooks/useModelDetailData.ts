import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchModelDocuments, addModelDocument, deleteModelDocument,
  fetchModelActivity, logModelActivity,
  fetchAlertConfig, saveAlertConfig,
  type ModelDocument, type ModelActivity, type AlertConfig,
} from '@/services/modelDetailService'

// Per-model backend data for the Model Detail page: documents, activity log and
// alert configuration. Success/error toasts are owned by the page.
export function useModelDetailData(modelId: string | undefined) {
  const qc = useQueryClient()
  const enabled = !!modelId

  const documents = useQuery({
    queryKey: ['model-documents', modelId],
    queryFn: () => fetchModelDocuments(modelId!),
    enabled, staleTime: 30_000,
  })
  const activity = useQuery({
    queryKey: ['model-activity', modelId],
    queryFn: () => fetchModelActivity(modelId!),
    enabled, staleTime: 30_000,
  })
  const alertConfig = useQuery({
    queryKey: ['model-alert-config', modelId],
    queryFn: () => fetchAlertConfig(modelId!),
    enabled, staleTime: 30_000,
  })

  const invalidateActivity = () => qc.invalidateQueries({ queryKey: ['model-activity', modelId] })

  const addDoc = useMutation({
    mutationFn: (doc: Omit<ModelDocument, 'id' | 'createdAt'>) => addModelDocument(doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-documents', modelId] }),
  })
  const removeDoc = useMutation({
    mutationFn: (id: string) => deleteModelDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-documents', modelId] }),
  })
  const addActivity = useMutation({
    mutationFn: (a: Omit<ModelActivity, 'id' | 'createdAt'>) => logModelActivity(a),
    onSuccess: invalidateActivity,
  })
  const saveAlerts = useMutation({
    mutationFn: (cfg: AlertConfig) => saveAlertConfig(cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-alert-config', modelId] }),
  })

  return {
    documents: documents.data ?? [],
    documentsError: documents.error,
    activity: activity.data ?? [],
    activityError: activity.error,
    alertConfig: alertConfig.data ?? null,
    isLoading: documents.isLoading || activity.isLoading,
    addDocument: addDoc.mutateAsync,
    removeDocument: removeDoc.mutateAsync,
    logActivity: addActivity.mutateAsync,
    saveAlertConfig: saveAlerts.mutateAsync,
  }
}
