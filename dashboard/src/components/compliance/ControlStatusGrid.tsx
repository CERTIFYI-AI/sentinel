import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface Control {
  id: string;
  name: string;
  status: "PASS" | "FAIL" | "NA";
  signal?: string;
  remediation?: string;
}

interface ControlStatusGridProps {
  controls: Control[];
  framework: string;
}

export function ControlStatusGrid({ controls, framework }: ControlStatusGridProps) {
  const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    PASS: "default",
    FAIL: "destructive",
    NA: "secondary",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{framework} Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {controls.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-100/50 transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium">{c.id}: {c.name}</p>
                {c.status === "PASS" && c.signal && <p className="text-xs text-gray-500">Signal: {c.signal}</p>}
                {c.status === "FAIL" && c.remediation && <p className="text-xs text-destructive">Fix: {c.remediation}</p>}
                {c.status === "NA" && <p className="text-xs text-gray-500">Requires organizational process</p>}
              </div>
              <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
