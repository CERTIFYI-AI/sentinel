/**
 * TrainingUpdateAgent — lessons-learned + refresher training assignments.
 */
import type { AgentContext, AgentResult } from '../lib/governance/types/events'
import { safeInsert } from '../lib/governance/agentHelpers'

export async function trainingUpdateAgent(ctx: AgentContext): Promise<AgentResult> {
  const p = ctx.event.payload as Record<string, unknown>
  const course = await safeInsert<{ id: string }>('training_courses', {
    org_id: ctx.orgId,
    title: `Lessons from incident ${p.incidentId ?? p.riskId ?? ctx.event.id}`,
    category: 'Post-Incident',
    status: 'DRAFT',
    content_url: null,
    estimated_minutes: 20,
    generated_from_event_id: ctx.event.id,
  })
  await safeInsert('training_assignments', {
    org_id: ctx.orgId,
    course_id: course?.id,
    audience: 'affected_teams',
    mandatory: true,
    due_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  })
  await ctx.emit('TRAINING_UPDATED', 'training', {
    incidentId: p.incidentId, courseIds: [course?.id], lessonId: course?.id,
  })
  return { status: 'succeeded', output: { courseId: course?.id } }
}
