import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { 
  Briefcase, 
  MagnifyingGlass, 
  Funnel,
  Warning,
  CheckSquare,
  Wrench
} from '@phosphor-icons/react';

const MOCK_TOOLS = [
  { id: 'TOOL-01', name: 'search_wiki', server: 'Internal Wiki Server', desc: 'Search corporate wiki for policy documents.', risk: 'low', requiresApproval: false, status: 'active' },
  { id: 'TOOL-02', name: 'get_customer_record', server: 'CRM Bridge', desc: 'Retrieve customer PII and purchase history by email.', risk: 'high', requiresApproval: true, status: 'active' },
  { id: 'TOOL-03', name: 'update_crm_status', server: 'CRM Bridge', desc: 'Mutate customer status in the CRM database.', risk: 'critical', requiresApproval: true, status: 'active' },
  { id: 'TOOL-04', name: 'list_jira_tickets', server: 'Jira Issue Tracker', desc: 'Get a list of open tickets for a project.', risk: 'medium', requiresApproval: false, status: 'active' },
  { id: 'TOOL-05', name: 'trigger_refund', server: 'Payment Gateway', desc: 'Initiate a financial refund to a customer.', risk: 'critical', requiresApproval: true, status: 'disabled' },
];

export default function ToolCatalog() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_TOOLS.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader 
          title="MCP Tool Catalog" 
          description="A unified registry of all tools discovered across your connected MCP servers. Assign risk levels and configure HITL approvals."
        />
        <Button variant="outline" className="border-[hsl(var(--brand))] text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))] hover:text-white rounded-none flex items-center gap-2">
          <Wrench weight="fill" /> Sync Tools
        </Button>
      </div>

      <Card className="border-[hsl(var(--border))] bg-surface-1 rounded-none">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-surface-2">
          <div className="relative w-80">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" />
            <Input 
              placeholder="Search tools or descriptions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface-1 border-[hsl(var(--border))] rounded-none h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] flex items-center gap-2 h-9">
              <Funnel /> Risk: All
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-surface-2 border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 font-medium">Tool Name & Desc</th>
                <th className="px-6 py-4 font-medium">Provider Server</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium text-center">HITL Approval</th>
                <th className="px-6 py-4 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => (
                <tr key={tool.id} className={`border-b border-[hsl(var(--border))] hover:bg-surface-2 transition-colors ${tool.status === 'disabled' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-3 rounded-none mt-1">
                        <Briefcase size={16} className="text-[hsl(var(--text-1))]" />
                      </div>
                      <div>
                        <p className="font-mono text-[hsl(var(--brand))] font-medium mb-1">{tool.name}</p>
                        <p className="text-xs text-[hsl(var(--text-2))] max-w-md">{tool.desc}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--text-2))]">
                    {tool.server}
                  </td>
                  <td className="px-6 py-4">
                    {tool.risk === 'critical' && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 rounded-none uppercase text-[10px]">Critical</Badge>}
                    {tool.risk === 'high' && <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 rounded-none uppercase text-[10px]">High</Badge>}
                    {tool.risk === 'medium' && <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 rounded-none uppercase text-[10px]">Medium</Badge>}
                    {tool.risk === 'low' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-none uppercase text-[10px]">Low</Badge>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-2">
                      <Switch checked={tool.requiresApproval} className="data-[state=checked]:bg-[hsl(var(--brand))]" />
                      {tool.requiresApproval && <CheckSquare size={16} className="text-[hsl(var(--brand))]" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tool.status === 'active' ? (
                       <Badge className="bg-emerald-500/10 text-emerald-500 border-0 rounded-none">Active</Badge>
                    ) : (
                       <Badge className="bg-surface-3 text-[hsl(var(--text-3))] border-0 rounded-none">Disabled</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
