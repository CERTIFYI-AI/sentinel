import { useState, useMemo } from "react";
import { Robot, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, WifiHigh } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useAgentsData } from "@/hooks/useAgentsData";

const AGENT_TYPES = ["LLM","Rule-Based","Hybrid","Multi-Agent","Classical ML","Robotic Process Automation"];
const AUTH_METHODS = ["API Key","OAuth 2.0","mTLS","Bearer Token","Basic Auth","SAML"];
const SCAN_FREQS = ["Real-time","Hourly","Daily","Weekly","Monthly","Manual"];
const DISCOVERY_METHODS = ["Automated Scan","API Discovery","Network Probe","Manual Registration","SDK Integration","Webhook"];
const OWNER_TEAMS = ["Platform Engineering","Data Science","Security","Risk & Compliance","Business Intelligence","Legal Tech","DevOps"];
const STATUSES = ["Discovered","Confirmed","Monitored","Suspended","Decommissioned","Under Review"];
const RISK_LEVELS = ["Critical","High","Medium","Low","Informational"];

const SEED: any[] = [
  { id:"AGT-001", name:"OpenAI GPT-4o Gateway", type:"LLM", endpoint:"https://api.openai.com/v1", authMethod:"API Key", status:"Confirmed", lastSeen:"2026-04-18T10:22:00Z", riskScore:"Low", discoveryMethod:"API Discovery", ownerTeam:"Platform Engineering", scanFreq:"Daily", enabled:true, description:"Primary LLM gateway for all product features. Routes to GPT-4o with rate limiting.", tags:["production","llm","openai"], createdAt:"2025-06-01", updatedAt:"2026-04-18", createdBy:"admin" },
  { id:"AGT-002", name:"Fraud Detection Agent v3", type:"Classical ML", endpoint:"https://ml.internal/fraud/v3", authMethod:"mTLS", status:"Monitored", lastSeen:"2026-04-18T09:45:00Z", riskScore:"High", discoveryMethod:"Network Probe", ownerTeam:"Data Science", scanFreq:"Real-time", enabled:true, description:"Real-time fraud detection agent processing 50K transactions per minute.", tags:["production","fraud","ml"], createdAt:"2025-03-15", updatedAt:"2026-04-15", createdBy:"dsci_team" },
  { id:"AGT-003", name:"HR Screening Bot", type:"Hybrid", endpoint:"https://hr-bot.internal/api", authMethod:"OAuth 2.0", status:"Suspended", lastSeen:"2026-02-28T14:10:00Z", riskScore:"Critical", discoveryMethod:"Automated Scan", ownerTeam:"Legal Tech", scanFreq:"Weekly", enabled:false, description:"Suspended pending bias audit remediation. DO NOT re-enable without CISO sign-off.", tags:["suspended","hr","high-risk"], createdAt:"2024-11-01", updatedAt:"2026-02-28", createdBy:"ltech_team" },
  { id:"AGT-004", name:"Customer Support Orchestrator", type:"Multi-Agent", endpoint:"https://support.internal/agent", authMethod:"Bearer Token", status:"Confirmed", lastSeen:"2026-04-18T11:01:00Z", riskScore:"Medium", discoveryMethod:"SDK Integration", ownerTeam:"Business Intelligence", scanFreq:"Hourly", enabled:true, description:"Multi-agent orchestrator routing customer queries to specialized sub-agents.", tags:["production","support","orchestrator"], createdAt:"2025-09-01", updatedAt:"2026-04-10", createdBy:"bi_team" },
  { id:"AGT-005", name:"Shadow AI — Slack Integration", type:"LLM", endpoint:"https://unknown.slack.ai/hook", authMethod:"Webhook", status:"Under Review", lastSeen:"2026-04-17T16:30:00Z", riskScore:"High", discoveryMethod:"Network Probe", ownerTeam:"Security", scanFreq:"Daily", enabled:false, description:"Unregistered AI integration discovered via network monitoring. Origin: employee Slack workspace.", tags:["shadow-ai","unregistered","review"], createdAt:"2026-04-17", updatedAt:"2026-04-17", createdBy:"auto-discovery" },
];

const EMPTY: any = { name:"", type:"LLM", endpoint:"", authMethod:"API Key", status:"Discovered", riskScore:"Medium", discoveryMethod:"Manual Registration", ownerTeam:"", scanFreq:"Daily", enabled:true, description:"", tags:[] };

export default function AgentDiscovery() {
  const { items: sbItems, isLoading, saveAgents, removeAgents } = useAgentsData()
  const [localItems, setLocalItems] = useState<any[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const items = [...localItems, ...sbItems.filter((i:any) => !localItems.find((l:any) => l.id === i.id))].filter((i:any) => !deletedIds.has(i.id))
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.endpoint.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (draft = false) => {
    if (!form.name.trim()) { toast.error("Agent name is required"); return; }
    if (!form.endpoint.trim()) { toast.error("Endpoint URL is required"); return; }
    setSaving(true);
    const status = draft ? "Draft" : (form.status || "Discovered");
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);
    try {
      const result = await saveAgents({ ...form, status, updatedAt: today });
      if (modal === "edit" && editId) {
        setLocalItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: today } : i));
      } else {
        setLocalItems(p => [{ ...form, status, id: result?.id || `AGT-${Date.now()}`, lastSeen: nowIso, createdAt: today, updatedAt: today, createdBy: 'admin' }, ...p]);
      }
      toast.success(draft ? "Draft saved" : "Agent saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save agent");
    } finally {
      setSaving(false);
      setModal(null); setForm(EMPTY); setEditId(null);
    }
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = async () => {
    if (deleteTarget) {
      setDeletedIds(p => new Set([...p, deleteTarget.id]))
      try { await removeAgents(deleteTarget.id) } catch {}
      setDeleteTarget(null)
      toast.success("Agent removed")
    }
  };

  function HealthDot({ status }: { status: string }) {
    const color = status === "Confirmed" || status === "Monitored" ? "#22c55e" : status === "Under Review" || status === "Discovered" ? "hsl(var(--s-wn-tx))" : "hsl(var(--s-er-tx))";
    return <span className="inline-flex items-center gap-1.5"><span style={{ width:8, height:8, borderRadius:"50%", background:color, display:"inline-block" }} /><span className="text-xs" style={{ color }}>{status}</span></span>;
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Robot size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Agent Discovery</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Discover, inventory and monitor all AI agents in your environment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Register Agent</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Agents",items.length],["Active",items.filter(i=>i.enabled).length],["Critical / High Risk",items.filter(i=>["Critical","High"].includes(i.riskScore)).length],["Unconfirmed",items.filter(i=>["Discovered","Under Review"].includes(i.status)).length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search agents…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { Array.from(sp.selectedIds).forEach(id => removeAgents(id as string)); sp.clearSelected(); toast.success("Deleted selected"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Robot size={32} className="text-[hsl(var(--brand))]" />} title="No agents found" description="Register an agent or run a scan to discover AI agents in your environment." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} />Register Agent</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Agent Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Endpoint URL</th>
                  <Th col="discoveryMethod" label="Discovery" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="lastSeen" label="Last Seen" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="riskScore" label="Risk" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Enabled</th>
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p></td>
                    <td className="px-3 py-2.5"><span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{item.type}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] font-mono max-w-[200px] truncate">{item.endpoint}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.discoveryMethod}</td>
                    <td className="px-3 py-2.5"><HealthDot status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.lastSeen?.slice(0,10)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.riskScore} /></td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 ${item.enabled ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-100"}`}>
                        {item.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Agent":"Register New Agent"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Agent Identity">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Agent Name" required value={form.name} onChange={setF("name")} placeholder="OpenAI GPT-4o Gateway" />
              <TSelect label="Agent Type" value={form.type} onChange={setF("type")} options={AGENT_TYPES} />
            </div>
            <TInput label="Endpoint URL" required value={form.endpoint} onChange={setF("endpoint")} placeholder="https://api.openai.com/v1" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Auth Method" value={form.authMethod} onChange={setF("authMethod")} options={AUTH_METHODS} />
              <TSelect label="Discovery Method" value={form.discoveryMethod} onChange={setF("discoveryMethod")} options={DISCOVERY_METHODS} />
            </div>
          </FormSection>
          <FormSection title="Ownership & Scanning">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Owner Team" value={form.ownerTeam} onChange={setF("ownerTeam")} options={OWNER_TEAMS} />
              <TSelect label="Scan Frequency" value={form.scanFreq} onChange={setF("scanFreq")} options={SCAN_FREQS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
              <TSelect label="Risk Score" value={form.riskScore} onChange={setF("riskScore")} options={RISK_LEVELS} />
            </div>
            <TToggle label="Agent Enabled" value={form.enabled} onChange={setF("enabled")} hint="Disable to pause monitoring without deleting the record" />
          </FormSection>
          <FormSection title="Description">
            <TTextarea label="Description" value={form.description} onChange={setF("description")} placeholder="Describe this agent's function and data handling…" rows={4} maxLength={2000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Agent":"Register Agent"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <StatusBadge status={viewItem.riskScore} />
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.type}</span>
                {viewItem.enabled ? <span className="text-xs text-green-600 px-1.5 py-0.5 bg-green-50 border border-green-200">Enabled</span> : <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 border border-gray-200">Disabled</span>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Auth Method",viewItem.authMethod],["Discovery Method",viewItem.discoveryMethod],["Owner Team",viewItem.ownerTeam],["Scan Frequency",viewItem.scanFreq],["Last Seen",viewItem.lastSeen?.slice(0,16)]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              <div><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">Endpoint URL</p><p className="font-mono text-sm text-[hsl(var(--text-2))] break-all">{viewItem.endpoint}</p></div>
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              <div>
                <p className="text-xs text-[hsl(var(--text-4))] mb-1.5 font-semibold uppercase tracking-wider">Connection Health</p>
                <div className="flex items-center gap-4 p-3 bg-raised border border-[hsl(var(--border))]">
                  <WifiHigh size={20} className={viewItem.enabled ? "text-green-500" : "text-gray-400"} />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--text-1))]">{viewItem.enabled ? "Connected & Reachable" : "Monitoring Paused"}</p>
                    <p className="text-xs text-[hsl(var(--text-3))]">Last ping: {viewItem.lastSeen?.slice(0,16)}</p>
                  </div>
                </div>
              </div>
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"registered this agent"},{date:viewItem.updatedAt,actor:"system",action:"last seen / updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Remove</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Remove "${deleteTarget?.name}"?`} message="This agent will be removed from the inventory. This action cannot be undone." type="danger" confirmLabel="Remove" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
