// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.

import { useQuery } from '@tanstack/react-query'
import { fetchAssessmentTemplates, type AssessmentTemplate } from '../../services/assessmentTemplateService'

export function useAssessmentTemplates() {
  return useQuery({
    queryKey: ['vendor-assessment-templates'],
    queryFn: fetchAssessmentTemplates,
    staleTime: 60_000,
  })
}

export type { AssessmentTemplate }
