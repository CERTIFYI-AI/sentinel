// src/components/settings/sections/AuditLogSettings.tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Scroll } from "@phosphor-icons/react";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  detail: string;
}

export function AuditLogSettings() {
  const { data: entries = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["settings-audit-log"],
    queryFn: () => api<AuditEntry[]>("/api/settings/audit-log"),
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Scroll className="h-5 w-5" />  Gear Audit Log</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead><TableHead>Details</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-sm">{e.actor}</TableCell>
                    <TableCell><Badge variant="outline">{e.action}</Badge></TableCell>
                    <TableCell className="text-sm">{e.resource}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
