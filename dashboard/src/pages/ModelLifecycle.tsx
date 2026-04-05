import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Robot, ArrowRight, Clock, ArrowsClockwise, ChartBar } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { MODELS } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

const PHASES = ['Development', 'Validation', 'Staging', 'Production', 'Monitoring'] as const;
type Phase = typeof PHASES[number];

const phaseColor: Record<Phase, string> = {
  Development: '#6366f1',
  Validation:  '#f59e0b',
  Staging:     '#3b82f6',
  Production:  '#22c55e',
  Monitoring:  '#8b5cf6',
};

const phaseIndex = (p: string) => PHASES.indexOf(p as Phase);

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

export default function ModelLifecycle() {
  const orgName = useSettingsStore(s => s.orgName);
  const chart = useChartTheme();
  const navigate = useNavigate();

  const avgDaysInPhase = Math.round(MODELS.reduce((a, m) => a + m.daysInPhase, 0) / MODELS.length);
  const pendingTransitions = MODELS.filter(m => m.lifecycleProgress < 80 && m.status !== 'production').length;

  const phaseDistribution = PHASES.map(p => ({
    phase: p,
    count: MODELS.filter(m => m.lifecyclePhase === p).length,
    color: phaseColor[p],
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Model Lifecycle</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — Phase tracking and transition management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Robot size={20} />} value={MODELS.length} label="Total Models" />
        <StatCard icon={<Clock size={20} />} value={avgDaysInPhase} label="Avg Days in Phase" />
        <StatCard icon={<ArrowRight size={20} />} value={pendingTransitions} label="Pending Transitions" />
        <StatCard icon={<ChartBar size={20} />} value={PHASES.length} label="Lifecycle Phases" />
      </div>

      {/* Phase Distribution Chart */}
      <Card className="p-4">
        <div className="text-sm font-medium text-[hsl(var(--text-1))] mb-4">Models per Lifecycle Phase</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={phaseDistribution} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="phase" stroke={chart.axis} tick={{ fontSize: 12 }} />
            <YAxis stroke={chart.axis} tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Models', angle: -90, position: 'insideLeft', style: { fill: chart.axis, fontSize: 11 } }} />
            <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }} />
            <Bar dataKey="count" radius={0}>
              {phaseDistribution.map((entry, idx) => (
                <rect key={idx} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Pipeline View */}
      <Card>
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="text-sm font-medium text-[hsl(var(--text-1))]">Model Lifecycle Pipeline</div>
        </div>

        {/* Phase Headers */}
        <div className="grid grid-cols-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
          {PHASES.map(phase => (
            <div key={phase} className="px-4 py-3 text-center" style={{ borderRight: `1px solid hsl(var(--border))` }}>
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: phaseColor[phase] }}>{phase}</div>
              <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">
                {MODELS.filter(m => m.lifecyclePhase === phase).length} models
              </div>
            </div>
          ))}
        </div>

        {/* Model Rows */}
        <div className="divide-y divide-[hsl(var(--border))]">
          {MODELS.map(model => {
            const currentPhaseIdx = phaseIndex(model.lifecyclePhase);
            return (
              <div
                key={model.id}
                className="p-4 hover:bg-[hsl(var(--bg-surface))/50] cursor-pointer transition-colors"
                onClick={() => navigate('/models/inventory')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Robot size={14} className="text-[hsl(var(--brand))]" />
                    <span className="text-sm font-medium text-[hsl(var(--text-1))]">{model.name}</span>
                    <span className="text-xs text-[hsl(var(--text-4))] font-mono">{model.id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[hsl(var(--text-4))]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {model.daysInPhase}d in {model.lifecyclePhase}
                    </span>
                    <span style={{ color: phaseColor[model.lifecyclePhase as Phase] }} className="font-medium">
                      {model.lifecyclePhase}
                    </span>
                  </div>
                </div>

                {/* Progress bar spanning all phases */}
                <div className="relative">
                  <div className="flex gap-0.5">
                    {PHASES.map((phase, idx) => {
                      const isCompleted = idx < currentPhaseIdx;
                      const isCurrent = idx === currentPhaseIdx;
                      return (
                        <div key={phase} className="flex-1 h-2 relative overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                          {isCompleted && (
                            <div className="absolute inset-0" style={{ background: phaseColor[phase], opacity: 0.7 }} />
                          )}
                          {isCurrent && (
                            <div className="absolute inset-0 origin-left" style={{ background: phaseColor[phase], width: `${model.lifecycleProgress % 20 * 5}%` }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Phase labels */}
                  <div className="flex gap-0.5 mt-1">
                    {PHASES.map((phase, idx) => (
                      <div key={phase} className="flex-1 text-center">
                        {idx === currentPhaseIdx && (
                          <div className="text-xs" style={{ color: phaseColor[phase] }}>▲</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
