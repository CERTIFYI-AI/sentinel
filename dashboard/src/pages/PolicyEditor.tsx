import { useState } from "react";
import { PageWrapper } from "../components/layout/PageWrapper";
import { PolicyVersionDiff } from "../components/compliance/PolicyVersionDiff";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

const samplePolicies = [
  { id: "1", name: "AI Usage Policy", version: "2.1", updatedAt: "2025-01-15", author: "Compliance Team" },
  { id: "2", name: "Data Retention Policy", version: "1.3", updatedAt: "2025-01-10", author: "Legal" },
  { id: "3", name: "Model Deployment Policy", version: "3.0", updatedAt: "2025-01-08", author: "ML Ops" },
];

export default function PolicyEditor() {
  const [selected, setSelected] = useState(samplePolicies[0]);
  return (
    <PageWrapper title="Policy Editor" description="Create and manage governance policies" actions={<Button>New Policy</Button>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {samplePolicies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={"w-full text-left p-2 rounded text-sm transition-colors " + (selected.id === p.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs opacity-70">v{p.version} &middot; {p.updatedAt}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="md:col-span-2">
          <PolicyVersionDiff
            current={{ version: selected.version, content: "This policy governs the use of AI systems within the organization. All deployments must pass compliance checks before production release.", updatedAt: selected.updatedAt, author: selected.author }}
            previous={{ version: "1.0", content: "This policy governs AI usage. Deployments require approval.", updatedAt: "2024-12-01", author: "Admin" }}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
