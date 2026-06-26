import { useState, useMemo } from "react";
import { Gear, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const INTEGRATION_TYPES = ["AI Model API","Data Source","Notification","SIEM / Logging","Identity Provider","Storage","Webhook","GRC Platform","CI/CD Pipeline"];
const ENVIRONMENTS = ["Production","Staging","Development","Test"];
const STATUSES = ["Healthy","Degraded","Down","Maintenance","Unconfigured"];
const AUTH_TYPES = ["API Key","OAuth 2.0","mTLS","Bearer Token","Basic Auth","IAM Role","SAML 2.0"];
const OWNERS = ["Platform Engineering","Security","Data Science","IT Operations","DevOps","Risk & Compliance"];

const SEED: any[] = [
  { id:"INT-001", name:"OpenAI GPT-4o Integration", type:"AI Model API", environment:"Production", status:"Healthy", endpoint:"https://api.openai.com/v1", authType:"API Key", lastHealthCheck:"2026-04-18T11:00:00Z", responseTimeMs:245, uptime99:99.98, enabled:true, owner:"Platform Engineering", description:"Primary LLM integration. Rate limited to 500 RPM. Monitoring via Datadog.", createdAt:"2025-06-01", updatedAt:"2026-04-18", createdBy:"admin" },
  { id:"INT-002", name:"Sentinel DB — PostgreSQL", type:"Data Source", environment:"Production", status:"Healthy", endpoint:"postgresql://sentinel-db.internal:5432/sentinel", authType:"IAM Role", lastHealthCheck:"2026-04-18T11:01:00Z", responseTimeMs:12, uptime99:99.99, enabled:true, owner:"IT Operations", description:"Primary application database. Read-replica for reporting.", createdAt:"2024-01-01", updatedAt:"2026-04-18", createdBy:"admin" },
  { id:"INT-003", name:"Slack Notification Webhook", type:"Notification", environment:"Production", status:"Healthy", endpoint:"https://hooks.slack.com/services/T04.../B.../XXX", authType:"Bearer Token", lastHealthCheck:"2026-04-18T10:55:00Z", responseTimeMs:318, uptime99:99.5, enabled:true, owner:"DevOps", description:"Incident and alert notifications to #ai-grc-alerts Slack channel.", createdAt:"2025-03-01", updatedAt:"2026-01-15", createdBy:"devops_team" },
  { id:"INT-004", name:"Splunk SIEM Integration", type:"SIEM / Logging", environment:"Production", status:"Degraded", endpoint:"https://splunk.internal:8088/services/collector", authType:"API Key", lastHealthCheck:"2026-04-18T10:58:00Z", responseTimeMs:1240, uptime99:97.2, enabled:true, owner:"Security", description:"Audit log forwarding to Splunk SIEM. Latency spike since 2026-04-16 maintenance window.", createdAt:"2024-06-01", updatedAt:"2026-04-16", createdBy:"security_team" },
  { id:"INT-005", name:"GitHub Actions CI/CD", type:"CI/CD Pipeline", environment:"Production", status:"Healthy", endpoint:"https://api.github.com", authType:"API Key", lastHealthCheck:"2026-04-18T11:00:00Z", responseTimeMs:180, uptime99:99.7, enabled:true, owner:"DevOps", description:"CI/CD pipeline for automated model validation and bias testing before deployment.", createdAt:"2025-01-01", updatedAt:"2026-03-01", createdBy:"admin" },
  { id:"INT-006", name:"Okta SSO — SAML Integration", type:"Identity Provider", environment:"Production", status:"Healthy", endpoint:"https://org.okta.com/app/saml", authType:"SAML 2.0", lastHealthCheck:"2026-04-18T11:00:00Z", responseTimeMs:98, uptime99:99.9, enabled:true, owner:"IT Operations", description:"Enterprise SSO for all dashboard users. MFA enforced.", createdAt:"2024-01-01", updatedAt:"2026-01-20", createdBy:"admin" },
  { id:"INT-007", name:"Legacy JIRA Integration", type:"GRC Platform", environment:"Staging", status:"Unconfigured", endpoint:"", authType:"Basic Auth", lastHealthCheck:null, responseTimeMs:null, uptime99:null, enabled:false, owner:"Risk & Compliance", description:"Planned integration for ticketing. Not yet configured.", createdAt:"2026-04-01", updatedAt:"2026-04-01", createdBy:"riskteam" },
];

const EMPTY: any = { name:"", type:"AI Model API", environment:"Production", status:"Unconfigured", endpoint:"", authType:"API Key", enabled:false, owner:"Platform Engineering", description:"" };

function HealthDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = { Healthy:"#22c55e", Degraded:"#f59e0b", Down:"#ef4444", Maintenance:"#3b82f6", Unconfigured:"#9ca3af" };
  const color = colorMap[status] ?? "#9ca3af";
  return <span className="inline-flex items-center gap-1.5"><span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block" }} /><span className="text-xs font-medium" style={{ color }}>{status}</span></span>;
}

export default function System() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (typeFilter === "all" || i.type === typeFilter);
  }), [items, search, statusFilter, typeFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Integration name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Unconfigured" : (form.status || "Unconfigured");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Integration updated");
      } else {
        const id = `INT-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, lastHealthCheck:null, responseTimeMs:null, uptime99:null, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Integration added");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Integration removed"); };

  const testConnection = (item: any) => {
    toast.promise(new Promise(res => setTimeout(res, 1500)), { loading:`Testing ${item.name}…`, success:"Connection successful!", error:"Connection failed" });
  };

  const uniqueTypes = [...new Set(items.map(i=>i.type))];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Gear size={24} weight="duotone" className="text-[hsl(var(--brand))]" />System Integrations</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Monitor and manage all system integrations, APIs, and data connections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Add Integration</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Integrations",items.length],["Healthy",items.filter(i=>i.status==="Healthy").length],["Degraded / Down",items.filter(i=>["Degraded","Down"].includes(i.status)).length],["Enabled",items.filter(i=>i.enabled).length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search integrations…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Types</option>{uniqueTypes.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Removed selected"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Gear size={32} className="text-[hsl(var(--brand))]" />} title="No integrations configured" description="Add an integration to connect external systems." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Add Integration</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Integration" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="environment" label="Env" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Health" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="responseTimeMs" label="Latency" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="uptime99" label="Uptime" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="lastHealthCheck" label="Last Check" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Enabled</th>
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · {item.owner}</p></td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.type}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.environment}</td>
                    <td className="px-3 py-2.5"><HealthDot status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--text-3))]">{item.responseTimeMs != null ? `${item.responseTimeMs}ms` : "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--text-3))]">{item.uptime99 != null ? `${item.uptime99}%` : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.lastHealthCheck?.slice(0,16).replace("T"," ")||"—"}</td>
                    <td className="px-3 py-2.5"><span className={`text-xs px-1.5 py-0.5 ${item.enabled?"text-green-600 bg-green-50 border border-green-200":"text-gray-400 bg-gray-100 border border-gray-200"}`}>{item.enabled?"Yes":"No"}</span></td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => testConnection(item)} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]" title="Test"><ArrowClockwise size={14} /></button>
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
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

      <PaginationBar total={sp.total} page={sp.page} perPage={sp.perPage} onPage={sp.setPage} onPerPage={sp.setPerPage} />

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Integration":"Add System Integration"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Integration Details">
            <TInput label="Integration Name" required value={form.name} onChange={setF("name")} placeholder="OpenAI GPT-4o Integration" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Integration Type" value={form.type} onChange={setF("type")} options={INTEGRATION_TYPES} />
              <TSelect label="Environment" value={form.environment} onChange={setF("environment")} options={ENVIRONMENTS} />
            </div>
            <TInput label="Endpoint URL" value={form.endpoint} onChange={setF("endpoint")} placeholder="https://api.example.com/v1" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Authentication Type" value={form.authType} onChange={setF("authType")} options={AUTH_TYPES} />
              <TSelect label="Health Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TSelect label="Owning Team" value={form.owner} onChange={setF("owner")} options={OWNERS} />
            <TTextarea label="Description" value={form.description} onChange={setF("description")} placeholder="Describe the integration purpose and configuration notes…" rows={3} maxLength={1000} />
            <TToggle label="Integration Enabled" value={form.enabled} onChange={setF("enabled")} hint="Disable to pause the integration without removing it" />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Integration":"Add Integration"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <HealthDot status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.type}</span>
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.environment}</span>
                {viewItem.enabled?<span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5">Enabled</span>:<span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5">Disabled</span>}
              </div>
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                <div>
                  <p className="text-xs text-[hsl(var(--text-4))]">Endpoint URL</p>
                  <p className="font-mono text-sm text-[hsl(var(--text-2))] break-all">{viewItem.endpoint||"Not configured"}</p>
                </div>
                <button onClick={() => testConnection(viewItem)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]"><ArrowClockwise size={12} />Test</button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {[["Auth Type",viewItem.authType],["Owner",viewItem.owner],["Latency",viewItem.responseTimeMs!=null?`${viewItem.responseTimeMs}ms`:"—"],["Uptime",viewItem.uptime99!=null?`${viewItem.uptime99}%`:"—"],["Last Check",viewItem.lastHealthCheck?.slice(0,16)||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v}</p></div>
                ))}
              </div>
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"configured this integration"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Remove</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Remove "${deleteTarget?.name}"?`} message="This integration configuration will be permanently deleted." type="danger" confirmLabel="Remove" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
