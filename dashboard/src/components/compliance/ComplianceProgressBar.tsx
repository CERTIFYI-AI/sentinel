import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface FrameworkProgress {
  framework: string;
  pass: number;
  fail: number;
  na: number;
  total: number;
}

interface ComplianceProgressBarProps {
  frameworks: FrameworkProgress[];
}

export function ComplianceProgressBar({ frameworks }: ComplianceProgressBarProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Compliance Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {frameworks.map((fw) => {
            const pct = fw.total > 0 ? Math.round((fw.pass / fw.total) * 100) : 0;
            return (
              <div key={fw.framework} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{fw.framework}</span>
                  <span className="text-gray-500">{pct}% ({fw.pass}/{fw.total})</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-[#1A6B5A]" style={{ width: (fw.pass / fw.total * 100) + "%" }} />
                  <div className="h-full bg-destructive" style={{ width: (fw.fail / fw.total * 100) + "%" }} />
                  <div className="h-full bg-muted-foreground/30" style={{ width: (fw.na / fw.total * 100) + "%" }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#1A6B5A] rounded" /> Pass</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-destructive rounded" /> Fail</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-muted-foreground/30 rounded" /> N/A</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
