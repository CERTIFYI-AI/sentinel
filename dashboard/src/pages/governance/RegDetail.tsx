import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { ArrowLeft, FileText, Calendar, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const regDetail = { name: "EU AI Act Article 6", region: "EU", status: "enacted", impact: "high", effectiveDate: "2025-08-01", description: "Classification of high-risk AI systems and requirements for providers and deployers.", requirements: ["Risk assessment documentation", "Data governance measures", "Technical documentation", "Record-keeping obligations", "Transparency to users", "Human oversight measures"], timeline: [{date:"2024-02",event:"Final text approved"},{date:"2024-08",event:"Published in Official Journal"},{date:"2025-02",event:"Prohibited AI practices apply"},{date:"2025-08",event:"High-risk obligations apply"}] };

export default function RegDetail() {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4"><Button variant="outline" size="sm" onClick={()=>navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1"/>Back</Button><h1 className="text-2xl font-bold">{regDetail.name}</h1><Badge className={regDetail.status==="enacted"?"bg-green-500":"bg-yellow-500"}>{regDetail.status}</Badge></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><Globe className="h-5 w-5 text-blue-500 mb-2"/><p className="text-sm text-muted-foreground">Region</p><p className="text-xl font-bold">{regDetail.region}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><Calendar className="h-5 w-5 text-green-500 mb-2"/><p className="text-sm text-muted-foreground">Effective Date</p><p className="text-xl font-bold">{regDetail.effectiveDate}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><FileText className="h-5 w-5 text-orange-500 mb-2"/><p className="text-sm text-muted-foreground">Impact</p><Badge className="bg-red-500">{regDetail.impact}</Badge></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle>Description</CardTitle></CardHeader><CardContent><p className="text-sm">{regDetail.description}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Requirements</CardTitle></CardHeader><CardContent><ul className="space-y-2">{regDetail.requirements.map((r,i)=>(<li key={i} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 bg-green-500 rounded-full"/>{r}</li>))}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent><div className="space-y-3">{regDetail.timeline.map((t,i)=>(<div key={i} className="flex items-center gap-4 text-sm"><Badge variant="outline">{t.date}</Badge><span>{t.event}</span></div>))}</div></CardContent></Card>
    </div>
  );
}
