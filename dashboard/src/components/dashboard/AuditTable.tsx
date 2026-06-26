// dashboard/src/components/dashboard/AuditTable.tsx

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import type { AuditEntry } from "../../api/types";

interface AuditTableProps {
  entries: AuditEntry[];
}

function interventionVariant(i: AuditEntry["intervention"]): "default" | "secondary" | "destructive" | "outline" {
  switch (i) {
    case "none": return "secondary";
    case "regen": return "default";
    case "upgrade": return "outline";
    case "hitl": return "destructive";
  }
}

export function AuditTable({ entries }: AuditTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Prompt</TableHead>
          <TableHead>Trust</TableHead>
          <TableHead>Injection</TableHead>
          <TableHead>Intervention</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Latency</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="whitespace-nowrap text-xs">
              {new Date(e.timestamp).toLocaleString()}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-xs">{e.prompt}</TableCell>
            <TableCell className="font-mono text-xs">{(e.trust_score * 100).toFixed(0)}%</TableCell>
            <TableCell className="font-mono text-xs">{(e.injection_score * 100).toFixed(0)}%</TableCell>
            <TableCell>
              <Badge variant={interventionVariant(e.intervention)}>{e.intervention}</Badge>
            </TableCell>
            <TableCell className="text-xs">{e.model}</TableCell>
            <TableCell className="font-mono text-xs">{e.latency_ms}ms</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}