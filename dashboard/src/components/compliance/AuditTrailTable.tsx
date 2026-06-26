import type { BadgeVariant } from '../../lib/compliance-types';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  outcome: "success" | "failure" | "info";
}

interface AuditTrailTableProps {
  entries: AuditEntry[];
}

const outcomeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  failure: "destructive",
  info: "secondary",
};

export function AuditTrailTable({ entries }: AuditTrailTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-left p-2 font-medium text-muted-foreground">Time</TableHead>
                <TableHead className="text-left p-2 font-medium text-muted-foreground">Action</TableHead>
                <TableHead className="text-left p-2 font-medium text-muted-foreground">User</TableHead>
                <TableHead className="text-left p-2 font-medium text-muted-foreground">Resource</TableHead>
                <TableHead className="text-left p-2 font-medium text-muted-foreground">Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} className="border-b last:border-0">
                  <TableCell className="p-2 text-xs text-muted-foreground whitespace-nowrap">{e.timestamp}</TableCell>
                  <TableCell className="p-2">{e.action}</TableCell>
                  <TableCell className="p-2 text-muted-foreground">{e.user}</TableCell>
                  <TableCell className="p-2 text-muted-foreground">{e.resource}</TableCell>
                  <TableCell className="p-2"><Badge variant={outcomeVariant[e.outcome]}>{e.outcome}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
