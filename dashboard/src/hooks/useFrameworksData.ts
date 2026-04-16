import { useQuery } from '@tanstack/react-query'
import { fetchFrameworks } from '@/services/frameworkService'

export function useFrameworksData() {
  const { data: frameworks = [], isLoading, error } = useQuery({
    queryKey: ['frameworks'],
    queryFn: fetchFrameworks,
    staleTime: 60_000,
  })
  return { frameworks, isLoading, error }
}
