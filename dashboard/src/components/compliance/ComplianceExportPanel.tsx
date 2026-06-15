import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

interface Props {
  frameworks: string[];
  onExport: (format: string, frameworkIds: string[]) => void;
}

export const ComplianceExportPanel: React.FC<Props> = ({ frameworks, onExport }) => {
  const [format, setFormat] = useState("pdf");
  const [selected, setSelected] = useState<string[]>(frameworks);

  const toggle = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  return (
    <Card className="rounded-none border border-border bg-card text-card-foreground">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-sm font-semibold leading-none tracking-tight text-card-foreground">
          Export Compliance Report
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Format</Label>
          <select
            value={format}
            onChange={e => setFormat(e.target.value)}
            className="flex h-9 w-full rounded-none border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground block">Frameworks</Label>
          <div className="space-y-1.5">
            {frameworks.map(fw => (
              <div key={fw} className="flex items-center space-x-2">
                <Checkbox
                  id={`fw-${fw}`}
                  checked={selected.includes(fw)}
                  onCheckedChange={() => toggle(fw)}
                />
                <Label
                  htmlFor={`fw-${fw}`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {fw}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => onExport(format, selected)}
          disabled={selected.length === 0}
          aria-label={`Export as ${format.toUpperCase()}`}
          className="w-full text-xs"
        >
          Export {format.toUpperCase()}
        </Button>

        <div className="text-[10px] text-muted-foreground font-medium leading-normal">
          Sentinel provides evidence, not a legal opinion. Reports require human review.
        </div>
      </CardContent>
    </Card>
  );
};
