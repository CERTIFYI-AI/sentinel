// @ts-nocheck
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { Certificate, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const TRUST_DIMENSIONS = ["Fairness","Explainability","Robustness","Privacy","Security","Accountability","Transparency","Reliability","Safety","Human Oversight"];
const FRAMEWORKS = ["EU AI Act","NIST AI RMF","ISO 42001","OECD AI Principles","Montreal Declaration"];
const EVAL_METHODS = ["Automated Scoring","Expert Panel","Third-Party Audit","Internal Review","User Survey","Red Teaming"];
const AI_SYSTEMS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Customer Support Orchestrator"];
const STATUSES = ["Draft","In Progress","Certified","Conditional","Failed","Revoked","Expired"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","AI Ethics Board"];

const SEED: any[] = [
  { id:"TE-001", systemName:"Credit Scoring Engine", version:"v3.2.1", overallScore:84, dimensions:{ Fairness:79, Explainability:88, Robustness:91, Privacy:86, Security:90, Accountability:82, Transparency:80, Reliability:88, Safety:85, "Human Oversight":75 }, framework:"NIST AI RMF", evalMethod:"Third-Party Audit", status:"Certified", validFrom:"2026-01-15", validUntil:"2027-01-14", owner:"Dr. Sarah Chen", certBody:"AI Assurance Labs", dimensionsEvaluated:["Fairness","Explainability","Robustness","Privacy","Security","Accountability","Transparency","Reliability","Safety","Human Oversight"], notes:"All dimensions pass. Minor recommendation on human oversight SLA.", createdAt:"2026-01-10", updatedAt:"2026-01-15", createdBy:"admin" },
  { id:"TE-002", systemName:"HR Screening Model", version:"v2.0.0", overallScore:58, dimensions:{ Fairness:42, Explainability:61, Robustness:72, Privacy:78, Security:85, Accountability:65, Transparency:55, Reliability:70, Safety:60, "Human Oversight":45 }, framework:"EU AI Act", evalMethod:"Expert Panel", status:"Failed", validFrom:"2025-11-01", validUntil:null, owner:"Emma Rodriguez", certBody:"Internal AI Ethics Board", dimensionsEvaluated:["Fairness","Explainability","Accountability","Transparency","Human Oversight"], notes:"Failed on Fairness (42/100) and Human Oversight (45/100). Suspended pending remediation.", createdAt:"2025-11-01", updatedAt:"2025-12-01", createdBy:"erodriguez" },
  { id:"TE-003", systemName:"Fraud Detection v3", version:"v3.0.8", overallScore:91, dimensions:{ Fairness:85, Explainability:90, Robustness:96, Privacy:92, Security:94, Accountability:89, Transparency:88, Reliability:95, Safety:93, "Human Oversight":88 }, framework:"ISO 42001", evalMethod:"Automated Scoring", status:"Certified", validFrom:"2025-09-01", validUntil:"2026-08-31", owner:"Alex Kumar", certBody:"AutoTrust Platform", dimensionsEvaluated:["Fairness","Robustness","Privacy","Security","Reliability","Safety"], notes:"High-performing system. Maintained certification in rollback scenario (v3.0.8).", createdAt:"2025-09-01", updatedAt:"2026-02-15", createdBy:"akumar" },
  { id:"TE-004", systemName:"GPT-4o Risk Scorer v2", version:"v2.1.0", overallScore:73, dimensions:{ Fairness:70, Explainability:65, Robustness:80, Privacy:75, Security:82, Accountability:72, Transparency:68, Reliability:77, Safety:71, "Human Oversight":70 }, framework:"OECD AI Principles", evalMethod:"Internal Review", status:"Conditional", validFrom:"2026-02-01", validUntil:"2026-08-01", owner:"Lisa Park", certBody:"Internal Audit", dimensionsEvaluated:["Fairness","Explainability","Transparency","Accountability"], notes:"Conditional certification: must re-evaluate Explainability (65) and Transparency (68) within 6 months.", createdAt:"2026-02-01", updatedAt:"2026-02-15", createdBy:"lpark" },
  { id:"TE-005", systemName:"NLP Classifier", version:"v1.4.2", overallScore:0, dimensions:{}, framework:"EU AI Act", evalMethod:"Red Teaming", status:"Draft", validFrom:null, validUntil:null, owner:"James Wilson", certBody:"TBD", dimensionsEvaluated:[], notes:"Trust evaluation not yet started. Planned for Q2 2026.", createdAt:"2026-04-01", updatedAt:"2026-04-01", createdBy:"jwilson" },
];

const EMPTY: any = { systemName:"", version:"", overallScore:0, framework:"NIST AI RMF", evalMethod:"Internal Review", status:"Draft", validFrom:"", validUntil:"", owner:"", certBody:"", dimensionsEvaluated:[], notes:"" };

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${score} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export default function TrustEngine() {
  const { data: items, setData: setItems } = useSupabaseTable('trustengine_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dimScores, setDimScores] = useState<Record<string, number>>({});

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.systemName.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage<any>(filtered, "systemName");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.systemName.trim()) { toast.error("System name is required"); return; }
    setSaving(true);
    const avgScore = Object.keys(dimScores).length > 0 ? Math.round(Object.values(dimScores).reduce((a, b) => a + Number(b), 0) / Object.keys(dimScores).length) : form.overallScore;
    setTimeout(() => {
      const status = draft ? "Draft" : (form.status || "In Progress");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, dimensions:dimScores, overallScore:avgScore, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Trust evaluation updated");
      } else {
        const id = `TE-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, dimensions:dimScores, overallScore:avgScore, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Trust evaluation created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setDimScores({}); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setDimScores(item.dimensions || {}); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Deleted"); };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Certificate size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Trust Engine</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">AI trustworthiness scoring and certification across key trust dimensions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setDimScores({}); setEditId(null); setModal("create"); }}><Plus size={14} />New Evaluation</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Evaluations",items.length],["Certified",items.filter(i=>i.status==="Certified").length],["Failed / Revoked",items.filter(i=>["Failed","Revoked"].includes(i.status)).length],["Avg Trust Score",`${Math.round(items.filter(i=>i.overallScore>0).reduce((a,i)=>a+i.overallScore,0)/Math.max(items.filter(i=>i.overallScore>0).length,1))}/100`]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search evaluations…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Certificate size={32} className="text-[hsl(var(--brand))]" />} title="No trust evaluations" description="Run a trust evaluation to assess your AI system's trustworthiness." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />New Evaluation</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="systemName" label="AI System" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="framework" label="Framework" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="evalMethod" label="Eval Method" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Trust Score</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Dimensions</th>
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="validFrom" label="Valid From" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="validUntil" label="Valid Until" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.systemName}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · {item.version}</p></td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{item.framework}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.evalMethod}</td>
                    <td className="px-3 py-2.5"><div className="flex items-center gap-2"><ScoreGauge score={item.overallScore} /><span className="text-sm font-bold text-[hsl(var(--text-1))]">{item.overallScore > 0 ? `${item.overallScore}/100` : "—"}</span></div></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.dimensionsEvaluated?.length || 0} dims</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.validFrom||"—"}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.validUntil||"—"}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 hover:bg-red-50 text-[hsl(0_72%_51%)]"><Trash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      <PaginationBar total={sp.total} page={sp.currentPage} perPage={sp.perPage} onPage={sp.setPage} onPerPage={sp.setPerPage} />

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Trust Evaluation":"New Trust Evaluation"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="System & Configuration">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="AI System Name" required value={form.systemName} onChange={setF("systemName")} placeholder="Credit Scoring Engine" />
              <TInput label="Version" value={form.version} onChange={setF("version")} placeholder="v3.2.1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS} />
              <TSelect label="Evaluation Method" value={form.evalMethod} onChange={setF("evalMethod")} options={EVAL_METHODS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
              <TInput label="Certifying Body" value={form.certBody} onChange={setF("certBody")} placeholder="AI Assurance Labs" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Valid From" type="date" value={form.validFrom} onChange={setF("validFrom")} />
              <TInput label="Valid Until" type="date" value={form.validUntil} onChange={setF("validUntil")} />
            </div>
            <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
          </FormSection>
          <FormSection title="Dimension Scores (0–100)">
            <TCheckGroup label="Dimensions to Evaluate" options={TRUST_DIMENSIONS} value={form.dimensionsEvaluated} onChange={setF("dimensionsEvaluated")} />
            <div className="grid grid-cols-2 gap-4 mt-3">
              {(form.dimensionsEvaluated||[]).map((dim: string) => (
                <TInput key={dim} label={`${dim} Score`} type="number" value={String(dimScores[dim] ?? "")} onChange={v => setDimScores(prev => ({ ...prev, [dim]: Number(v) }))} placeholder="0–100" />
              ))}
            </div>
          </FormSection>
          <FormSection title="Notes">
            <TTextarea label="Evaluation Notes" value={form.notes} onChange={setF("notes")} placeholder="Key findings, recommendations, conditions…" rows={4} maxLength={2000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update":"Create Evaluation"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={`${viewItem?.systemName??""} — Trust Evaluation`} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.framework}</span>
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.evalMethod}</span>
              </div>
              <div className="flex items-center gap-4 p-4 bg-raised border border-[hsl(var(--border))]">
                <ScoreGauge score={viewItem.overallScore} />
                <div>
                  <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{viewItem.overallScore > 0 ? `${viewItem.overallScore}/100` : "—"}</p>
                  <p className="text-xs text-[hsl(var(--text-3))]">Overall Trust Score</p>
                </div>
              </div>
              {Object.keys(viewItem.dimensions||{}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-3">Dimension Breakdown</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(viewItem.dimensions).map(([dim, score]: any) => {
                      const s = Number(score);
                      const color = s >= 80 ? "#22c55e" : s >= 65 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={dim} className="flex items-center gap-3 p-2 bg-raised border border-[hsl(var(--border))]">
                          <div className="flex-1">
                            <p className="text-xs text-[hsl(var(--text-2))]">{dim}</p>
                            <div className="w-full h-1 bg-[hsl(var(--border))] mt-1"><div style={{ width:`${s}%`, background:color, height:"100%" }} /></div>
                          </div>
                          <span className="text-sm font-bold" style={{ color }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Owner",viewItem.owner],["Cert Body",viewItem.certBody],["Valid From",viewItem.validFrom||"—"],["Valid Until",viewItem.validUntil||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v}</p></div>
                ))}
              </div>
              {viewItem.notes&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Notes</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.notes}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"initiated trust evaluation"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete trust evaluation for "${deleteTarget?.systemName}"?`} message="This action cannot be undone." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
