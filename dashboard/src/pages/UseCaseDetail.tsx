import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, CheckCircle, Warning, XCircle } from "@phosphor-icons/react";

export default function UseCaseDetail() {
  const { id } = useParams();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/use-cases"><Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Use Case Detail</h1>
          <p className="text-[hsl(var(--text-3))]">ID: {id}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Overview</CardTitle></CardHeader><CardContent className="space-y-3">
          <div><span className="text-sm text-[hsl(var(--text-3))]">Status</span><div><Badge>Pending Review</Badge></div></div>
          <div><span className="text-sm text-[hsl(var(--text-3))]">Risk Level</span><div className="font-medium text-[hsl(var(--text-1))]">High</div></div>
          <div><span className="text-sm text-[hsl(var(--text-3))]">Owner</span><div className="font-medium text-[hsl(var(--text-1))]">ML Team</div></div>
          <div><span className="text-sm text-[hsl(var(--text-3))]">Created</span><div className="text-[hsl(var(--text-2))]">2024-01-15</div></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader><CardContent className="space-y-2">
          <div className="flex items-center gap-2"><CheckCircle weight="fill" className="text-[hsl(var(--s-ok-fg))]" /><span className="text-sm">Data privacy review complete</span></div>
          <div className="flex items-center gap-2"><Warning weight="fill" className="text-[hsl(var(--s-wn-fg))]" /><span className="text-sm">Bias audit pending</span></div>
          <div className="flex items-center gap-2"><XCircle weight="fill" className="text-[hsl(var(--s-er-fg))]" /><span className="text-sm">Explainability documentation missing</span></div>
        </CardContent></Card>
      </div>
      <div className="flex gap-3">
        <Button>Approve</Button>
        <Button variant="outline">Request Changes</Button>
        <Button variant="destructive">Reject</Button>
      </div>
    </div>
  );
}
