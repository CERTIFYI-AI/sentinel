import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { 
  Database, 
  Plus, 
  MagnifyingGlass, 
  Funnel,
  CheckCircle,
  WarningCircle,
  XCircle,
  Plugs,
  DotsThree
} from '@phosphor-icons/react';

const MOCK_SERVERS = [
  { id: 'SRV-001', name: 'Internal Wiki Server', url: 'https://mcp.internal.acme.corp/wiki', status: 'healthy', toolsCount: 4, auth: 'Bearer Token', lastPing: '2 mins ago' },
  { id: 'SRV-002', name: 'CRM Bridge', url: 'https://mcp.internal.acme.corp/crm', status: 'healthy', toolsCount: 12, auth: 'mTLS', lastPing: '5 mins ago' },
  { id: 'SRV-003', name: 'Jira Issue Tracker', url: 'https://mcp.internal.acme.corp/jira', status: 'degraded', toolsCount: 3, auth: 'Basic Auth', lastPing: '1 hour ago' },
  { id: 'SRV-004', name: 'HR Data API', url: 'https://mcp.internal.acme.corp/hr', status: 'offline', toolsCount: 2, auth: 'Bearer Token', lastPing: '2 days ago' },
];

export default function Servers() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_SERVERS.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <PageHeader 
          title="MCP Servers" 
          description="Register and monitor backend Model Context Protocol servers that your AI agents can connect to."
        />
        <Button className="bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] rounded-none flex items-center gap-2">
          <Plus weight="bold" /> Add Server
        </Button>
      </div>

      <Card className="border-[hsl(var(--border))] bg-surface-1 rounded-none">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between bg-surface-2">
          <div className="relative w-64">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" />
            <Input 
              placeholder="Search servers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-surface-1 border-[hsl(var(--border))] rounded-none h-9"
            />
          </div>
          <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] flex items-center gap-2 h-9">
            <Funnel /> Filter
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-surface-2 border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-6 py-4 font-medium">Server Name</th>
                <th className="px-6 py-4 font-medium">Endpoint URL</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Auth Type</th>
                <th className="px-6 py-4 font-medium text-center">Tools Discovered</th>
                <th className="px-6 py-4 font-medium">Last Ping</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((server) => (
                <tr key={server.id} className="border-b border-[hsl(var(--border))] hover:bg-surface-2 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-3 rounded-none">
                        <Database size={16} className="text-[hsl(var(--brand))]" />
                      </div>
                      <span className="font-medium text-[hsl(var(--text-1))]">{server.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[hsl(var(--text-2))]">
                    {server.url}
                  </td>
                  <td className="px-6 py-4">
                    {server.status === 'healthy' && (
                      <Badge className="bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] border-0 rounded-none gap-1 px-2 py-1">
                        <CheckCircle weight="fill" /> Healthy
                      </Badge>
                    )}
                    {server.status === 'degraded' && (
                      <Badge className="bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))] border-0 rounded-none gap-1 px-2 py-1">
                        <WarningCircle weight="fill" /> Degraded
                      </Badge>
                    )}
                    {server.status === 'offline' && (
                      <Badge className="bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))] border-0 rounded-none gap-1 px-2 py-1">
                        <XCircle weight="fill" /> Offline
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--text-2))]">
                    {server.auth}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge className="bg-surface-3 text-[hsl(var(--text-1))] border border-[hsl(var(--border))] rounded-none font-mono">
                      {server.toolsCount}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[hsl(var(--text-3))] text-xs">
                    {server.lastPing}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none">
                        <Plugs size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] rounded-none">
                        <DotsThree size={20} weight="bold" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[hsl(var(--text-3))]">
                    No MCP servers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
