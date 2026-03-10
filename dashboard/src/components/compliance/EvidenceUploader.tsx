import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/Badge";

interface Evidence {
  id: string;
  name: string;
  framework: string;
  controlId: string;
  uploadedAt: string;
  status: "pending" | "verified" | "rejected";
}

interface EvidenceUploaderProps {
  evidence: Evidence[];
  onUpload?: (file: File, framework: string, controlId: string) => void;
}

export function EvidenceUploader({ evidence, onUpload }: EvidenceUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    verified: "default",
    rejected: "destructive",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Evidence Vault</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={"border-2 border-dashed rounded-lg p-8 text-center transition-colors " + (dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25")}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && onUpload) onUpload(file, "", "");
          }}
        >
          <p className="text-muted-foreground text-sm">Drag and drop evidence files here</p>
          <Button variant="outline" size="sm" className="mt-2">Browse Files</Button>
        </div>
        <div className="space-y-2">
          {evidence.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-2 rounded border">
              <div>
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.framework} - {e.controlId}</p>
              </div>
              <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
