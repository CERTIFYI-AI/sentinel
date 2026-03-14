import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table';

const LEVELS = ["Critical", "High", "Medium", "Low", "Minimal"] as const;
const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Certain"] as const;

interface RiskCell {
  impact: typeof LEVELS[number];
  likelihood: typeof LIKELIHOOD[number];
  count: number;
}

interface RiskHeatMapProps {
  data: RiskCell[];
}

const colorMap: Record<string, string> = {
  "Critical-Certain": "bg-destructive text-destructive-foreground",
  "Critical-Likely": "bg-destructive text-destructive-foreground",
  "High-Certain": "bg-destructive text-destructive-foreground",
  "High-Likely": "bg-destructive/80 text-destructive-foreground",
  "Medium-Possible": "bg-warning text-warning-foreground",
  "Low-Unlikely": "bg-emerald-50 text-[#1A6B5A]",
  "Minimal-Rare": "bg-muted text-muted-foreground",
};

function getCellColor(impact: string, likelihood: string): string {
  const key = impact + "-" + likelihood;
  if (colorMap[key]) return colorMap[key];
  const impactIdx = LEVELS.indexOf(impact as typeof LEVELS[number]);
  const likeIdx = LIKELIHOOD.indexOf(likelihood as typeof LIKELIHOOD[number]);
  const score = (4 - impactIdx) + likeIdx;
  if (score >= 6) return "bg-destructive text-destructive-foreground";
  if (score >= 4) return "bg-destructive/60 text-white";
  if (score >= 2) return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

export function RiskHeatMap({ data }: RiskHeatMapProps) {
  const grid = new Map<string, number>();
  data.forEach((d) => grid.set(d.impact + "-" + d.likelihood, d.count));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risk Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="p-1"></TableHead>
                {LIKELIHOOD.map((l) => (
                  <TableHead key={l} className="p-1 text-center font-medium text-muted-foreground">{l}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEVELS.map((impact) => (
                <TableRow key={impact}>
                  <TableCell className="p-1 font-medium text-muted-foreground whitespace-nowrap">{impact}</TableCell>
                  {LIKELIHOOD.map((like) => {
                    const count = grid.get(impact + "-" + like) ?? 0;
                    return (
                      <TableCell key={like} className="p-1">
                        <div className={"rounded p-2 text-center font-mono " + getCellColor(impact, like)}>
                          {count}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
