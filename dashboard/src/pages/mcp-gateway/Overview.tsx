import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/card';
import { 
  Database, 
  Robot, 
  ShieldCheck, 
  ArrowsLeftRight,
  LockKey,
  Checks,
  Pulse
} from '@phosphor-icons/react';
import { Badge } from '../../components/ui/badge';
import { useSettingsStore } from '../../stores/settingsStore';

export default function Overview() {
  const { orgName } = useSettingsStore();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="MCP Gateway Architecture" 
        description="Understand how the Model Context Protocol (MCP) Gateway routes, authenticates, and audits tool calls between your AI agents and enterprise backends."
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-[hsl(var(--border))] bg-surface-1 rounded-none flex items-center gap-4">
          <div className="p-3 bg-[hsl(var(--brand))] text-white">
            <Robot size={24} />
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--text-2))] uppercase tracking-wider">Active Agents</p>
            <p className="text-2xl font-bold">14</p>
          </div>
        </Card>
        <Card className="p-4 border-[hsl(var(--border))] bg-surface-1 rounded-none flex items-center gap-4">
          <div className="p-3 bg-emerald-500 text-white">
            <Database size={24} />
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--text-2))] uppercase tracking-wider">Connected Servers</p>
            <p className="text-2xl font-bold">8</p>
          </div>
        </Card>
        <Card className="p-4 border-[hsl(var(--border))] bg-surface-1 rounded-none flex items-center gap-4">
          <div className="p-3 bg-blue-500 text-white">
            <ArrowsLeftRight size={24} />
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--text-2))] uppercase tracking-wider">Daily Tool Calls</p>
            <p className="text-2xl font-bold">45.2k</p>
          </div>
        </Card>
        <Card className="p-4 border-[hsl(var(--border))] bg-surface-1 rounded-none flex items-center gap-4">
          <div className="p-3 bg-orange-500 text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--text-2))] uppercase tracking-wider">Blocked by Guardrails</p>
            <p className="text-2xl font-bold">1.2%</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Architecture Diagram */}
        <Card className="col-span-1 lg:col-span-2 p-6 border-[hsl(var(--border))] bg-surface-1 rounded-none">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Pulse size={20} className="text-[hsl(var(--brand))]" /> 
            Traffic Flow & Governance
          </h3>

          <div className="relative p-8 bg-surface-2 border border-[hsl(var(--border))]">
            
            <div className="flex justify-between items-center relative z-10">
              
              {/* Client Side (Agents) */}
              <div className="w-1/4 space-y-4">
                <h4 className="text-xs font-mono text-[hsl(var(--text-2))] uppercase text-center mb-4">1. AI Agents</h4>
                <div className="p-4 bg-surface-1 border border-[hsl(var(--border))] text-center">
                  <Robot size={32} className="mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm font-medium">Customer Support Bot</p>
                  <Badge className="mt-2 bg-blue-500/10 text-blue-500 border-0 rounded-none text-[10px]">READ-ONLY</Badge>
                </div>
                <div className="p-4 bg-surface-1 border border-[hsl(var(--border))] text-center">
                  <Robot size={32} className="mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm font-medium">Data Analyst Agent</p>
                  <Badge className="mt-2 bg-red-500/10 text-red-500 border-0 rounded-none text-[10px]">HIGH PRIVILEGE</Badge>
                </div>
              </div>

              {/* Middle: Gateway */}
              <div className="w-1/3 z-20">
                <div className="p-6 bg-[hsl(var(--brand))] text-white shadow-xl relative text-center">
                  <h2 className="text-xl font-bold mb-1">Sentinel MCP Gateway</h2>
                  <p className="text-xs opacity-80 mb-6">Centralized Routing & Zero-Trust</p>
                  
                  <div className="space-y-2 text-left bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-sm"><LockKey size={16}/> Identity & ACL Check</div>
                    <div className="flex items-center gap-2 text-sm"><ShieldCheck size={16}/> Payload Guardrails</div>
                    <div className="flex items-center gap-2 text-sm"><Checks size={16}/> Human-in-the-loop</div>
                  </div>
                </div>
              </div>

              {/* Backend Side (Servers) */}
              <div className="w-1/4 space-y-4">
                <h4 className="text-xs font-mono text-[hsl(var(--text-2))] uppercase text-center mb-4">3. Enterprise Backends</h4>
                <div className="p-4 bg-surface-1 border border-[hsl(var(--border))] text-center">
                  <Database size={32} className="mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm font-medium">CRM Database</p>
                  <Badge className="mt-2 bg-zinc-500/10 text-zinc-400 border-0 rounded-none text-[10px]">MCP v1.2</Badge>
                </div>
                <div className="p-4 bg-surface-1 border border-[hsl(var(--border))] text-center">
                  <Database size={32} className="mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm font-medium">Internal Wiki API</p>
                  <Badge className="mt-2 bg-zinc-500/10 text-zinc-400 border-0 rounded-none text-[10px]">MCP v1.2</Badge>
                </div>
              </div>

            </div>

            {/* Connecting Lines (Background) */}
            <div className="absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[hsl(var(--border))] via-[hsl(var(--brand))] to-[hsl(var(--border))] -translate-y-1/2 z-0 opacity-50 border-dashed"></div>
            
            {/* Animated Dots */}
            <div className="absolute top-1/2 left-[30%] w-2 h-2 rounded-full bg-[hsl(var(--brand))] -translate-y-1/2 z-0 animate-ping"></div>
            <div className="absolute top-1/2 right-[30%] w-2 h-2 rounded-full bg-[hsl(var(--brand))] -translate-y-1/2 z-0 animate-ping" style={{animationDelay: '0.5s'}}></div>

          </div>
        </Card>

        {/* Info Sidebar */}
        <div className="col-span-1 space-y-6">
          <Card className="p-6 border-[hsl(var(--border))] bg-surface-1 rounded-none">
            <h3 className="font-semibold mb-4">Why use the MCP Gateway?</h3>
            <div className="space-y-4 text-sm text-[hsl(var(--text-2))]">
              <p>
                By default, LLM agents connect directly to tools and databases. This creates a scattered, un-auditable mesh of credentials and permissions.
              </p>
              <p>
                The Sentinel MCP Gateway acts as a reverse proxy for all tool invocations. Agents authenticate with the Gateway, and the Gateway securely routes requests to your backend MCP servers.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-[hsl(var(--border))] bg-surface-1 rounded-none">
            <h3 className="font-semibold mb-4 text-[hsl(var(--brand))]">Key Capabilities</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-[hsl(var(--brand))] shrink-0 mt-0.5" />
                <span><strong className="text-[hsl(var(--text-1))]">Zero-Trust ACLs:</strong> Restrict which agents can call which tools at a granular level.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-[hsl(var(--brand))] shrink-0 mt-0.5" />
                <span><strong className="text-[hsl(var(--text-1))]">Prompt Injection Defense:</strong> Inspect tool payloads for malicious code before hitting your DB.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-[hsl(var(--brand))] shrink-0 mt-0.5" />
                <span><strong className="text-[hsl(var(--text-1))]">Human-in-the-Loop:</strong> Pause high-risk tool executions until a human approves them.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={18} className="text-[hsl(var(--brand))] shrink-0 mt-0.5" />
                <span><strong className="text-[hsl(var(--text-1))]">Unified Audit Trail:</strong> 100% visibility into exactly what data your agents are accessing.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Temporary inline icon since it wasn't imported at top
function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} fill="currentColor" viewBox="0 0 256 256" {...props}><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"></path></svg>;
}
