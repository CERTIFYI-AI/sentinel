import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-gray-500">Time</th>
                <th className="text-left p-2 font-medium text-gray-500">Action</th>
                <th className="text-left p-2 font-medium text-gray-500">User</th>
                <th className="text-left p-2 font-medium text-gray-500">Resource</th>
                <th className="text-left p-2 font-medium text-gray-500">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-2 text-xs text-gray-500 whitespace-nowrap">{e.timestamp}</td>
                  <td className="p-2">{e.action}</td>
                  <td className="p-2 text-gray-500">{e.user}</td>
                  <td className="p-2 text-gray-500">{e.resource}</td>
                  <td className="p-2"><Badge variant={outcomeVariant[e.outcome]}>{e.outcome}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
