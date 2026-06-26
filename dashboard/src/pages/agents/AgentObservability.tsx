// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Terminal, Activity, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { useEventBus } from '@/lib/hooks/useEventBus';

export default function AgentObservability() {
  const [logs, setLogs] = useState<any[]>([]);
  const { on } = useEventBus();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEvent = (payload: any) => {
      setLogs(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        payload
      }].slice(-100)); // keep last 100 logs
    };

    // Subscribing to generic agent events
    on('MODEL_REGISTERED', handleEvent);
    on('RISK_DETECTED', handleEvent);
    on('INCIDENT_CREATED', handleEvent);
    on('BIAS_AUDIT_FAILED', handleEvent);
    on('VENDOR_RISK_HIGH', handleEvent);
    on('AGENT_ACTION_COMPLETED', handleEvent);
    on('AGENT_ACTION_FAILED', handleEvent);
    
    // Seed some initial logs for display
    setLogs([
      { id: '1', timestamp: new Date(Date.now() - 60000).toISOString(), payload: { sourceModule: 'riskAssessmentAgent', type: 'MODEL_REGISTERED', status: 'completed' } },
      { id: '2', timestamp: new Date(Date.now() - 30000).toISOString(), payload: { sourceModule: 'complianceImpactAgent', type: 'RISK_DETECTED', status: 'processing' } },
      { id: '3', timestamp: new Date().toISOString(), payload: { sourceModule: 'vendorRiskAgent', type: 'VENDOR_RISK_HIGH', status: 'failed' } }
    ]);
  }, [on]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <PageHeader 
        title="Agent Observability" 
        description="Real-time telemetry and execution logs for autonomous agents."
        icon={Terminal}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
              10 <Activity className="h-4 w-4 text-[hsl(var(--brand))]" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase">Events Processed (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
              1,432 <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase">Avg Execution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
              245ms <Clock className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase">Failures / Retries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
              3 <ShieldAlert className="h-4 w-4 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/90 border-[hsl(var(--border))] flex flex-col h-[600px] font-mono shadow-2xl">
        <CardHeader className="border-b border-white/10 bg-black py-3">
          <CardTitle className="text-xs font-semibold text-emerald-500 uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Telemetry Stream
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 text-sm text-gray-300">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 p-2 hover:bg-white/5 rounded transition-colors">
              <span className="text-gray-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-blue-400 w-48 shrink-0 truncate">
                [{log.payload.sourceModule || 'system'}]
              </span>
              <span className={`w-24 shrink-0 font-bold ${log.payload.status === 'failed' ? 'text-red-400' : log.payload.status === 'processing' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {log.payload.status?.toUpperCase() || 'INFO'}
              </span>
              <span className="text-gray-100 flex-1 break-all">
                {log.payload.type || 'EXECUTION_LOG'} - {JSON.stringify(log.payload)}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </CardContent>
      </Card>
    </div>
  );
}
