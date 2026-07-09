import { useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { FileText, MagnifyingGlass, Export, Plus, Eye, Clock, CheckCircle, Warning, PencilSimple, ChatDots, ShieldCheck, User, Bell, X, Trash } from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from 'sonner';

type DocType = 'Policy' | 'Procedure' | 'Standard' | 'Guideline' | 'Template';
type DocStatus = 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Archived' | 'Expired' | 'Active' | 'Inactive' | 'Pending' | 'Disabled' | 'Need to Review' | 'Rejected';

const CATEGORIES = ['Access','Data security','Backup','Business continuity','Disaster recovery','HR','Risk','Patch management','Change management','Information security','Compliance','Security','AI Governance','Privacy','Ethics'];
const ALL_STATUSES: DocStatus[] = ['Active','Inactive','Pending','Approved','Disabled','Need to Review','Rejected','Draft','In Review','Published','Archived','Expired'];
const REVIEW_FREQUENCIES = ['Weekly','Monthly','Quarterly','Biannually','Yearly'];
const FRAMEWORKS_LIST = ['EU AI Act','NIST AI RMF','ISO 42001','ISO 27001','SOC 2','GDPR','OECD AI Principles','OWASP LLM Top 10','Singapore Model AI','UNESCO Ethics of AI','Google SAIF','MITRE ATLAS'];
const OWNERS_LIST = ['Sarah Chen','David Kim','Priya Sharma','James Wilson','Michael Torres','Emily Rodriguez','Legal Team','Ops Team','Ushnika Shrestha','Abil Rai'];
const REVIEWERS_LIST = ['Sarah Chen','David Kim','Priya Sharma','James Wilson','Michael Torres','Emily Rodriguez','Abil Rai','Ushnika Shrestha'];

interface Document { id:string; title:string; type:DocType; version:string; owner:string; status:DocStatus; lastUpdated:string; nextReview:string; frameworks:string[]; description:string; pages:number; fileSize:string; department:string; category:string; reviewer:string; reviewFrequency:string; expiryDate:string; enableNotifications:boolean; notificationDays:number; documentSource:string; externalLink:string; versionHistory:{version:string;date:string;author:string;changes:string}[]; approvals:{role:string;name:string;date:string;status:'Approved'|'Pending'|'Rejected'}[]; linkedControls:{controlId:string;title:string;framework:string;status:string}[]; comments:{author:string;date:string;text:string}[]; }

const EMPTY_FORM = { title:'', type:'Policy' as DocType, version:'1.0', owner:'', status:'Draft' as DocStatus, description:'', frameworks:[] as string[], category:'', reviewer:'', reviewFrequency:'Quarterly', expiryDate:'', enableNotifications:false, notificationDays:30, documentSource:'template', externalLink:'', department:'' };

const SEED_DOCS: Document[] = [
  { id:'DOC-001', title:'AI Acceptable Use Policy', type:'Policy', version:'v3.2', owner:'Sarah Chen', status:'Published', lastUpdated:'2026-02-15', nextReview:'2026-08-15', frameworks:['ISO 27001','EU AI Act'], description:'Establishes acceptable use boundaries for all AI/ML systems.', pages:24, fileSize:'1.8 MB', department:'AI Governance', category:'AI Governance', reviewer:'James Wilson', reviewFrequency:'Quarterly', expiryDate:'2027-02-15', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[{version:'v3.2',date:'2026-02-15',author:'Sarah Chen',changes:'Updated EU AI Act compliance requirements'}], approvals:[{role:'CISO',name:'James Wilson',date:'2026-02-14',status:'Approved'}], linkedControls:[{controlId:'CTL-001',title:'AI System Inventory',framework:'ISO 27001',status:'Implemented'}], comments:[{author:'James Wilson',date:'2026-02-14',text:'Approved. Recommend quarterly review.'}] },
  { id:'DOC-002', title:'Data Classification Standard', type:'Standard', version:'v2.1', owner:'David Kim', status:'Published', lastUpdated:'2026-01-20', nextReview:'2026-07-20', frameworks:['ISO 27001','GDPR'], description:'Defines data classification taxonomy.', pages:18, fileSize:'1.2 MB', department:'Information Security', category:'Data security', reviewer:'James Wilson', reviewFrequency:'Quarterly', expiryDate:'2027-01-20', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[{version:'v2.1',date:'2026-01-20',author:'David Kim',changes:'Added AI training data classification tier'}], approvals:[{role:'CISO',name:'James Wilson',date:'2026-01-19',status:'Approved'}], linkedControls:[{controlId:'CTL-005',title:'Data Classification',framework:'ISO 27001',status:'Implemented'}], comments:[] },
  { id:'DOC-003', title:'Model Deployment Procedure', type:'Procedure', version:'v2.0', owner:'Priya Sharma', status:'Published', lastUpdated:'2026-03-01', nextReview:'2026-09-01', frameworks:['NIST AI RMF'], description:'Step-by-step procedure for deploying AI/ML models.', pages:32, fileSize:'2.4 MB', department:'ML Engineering', category:'AI Governance', reviewer:'James Wilson', reviewFrequency:'Quarterly', expiryDate:'2027-03-01', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[{version:'v2.0',date:'2026-03-01',author:'Priya Sharma',changes:'Added automated bias testing gate'}], approvals:[{role:'CTO',name:'Robert Chang',date:'2026-02-28',status:'Approved'}], linkedControls:[{controlId:'CTL-010',title:'Model Validation',framework:'NIST AI RMF',status:'Implemented'}], comments:[] },
  { id:'DOC-004', title:'Incident Response Plan', type:'Procedure', version:'v4.1', owner:'James Wilson', status:'Published', lastUpdated:'2026-02-28', nextReview:'2026-05-28', frameworks:['SOC 2','ISO 27001'], description:'Comprehensive incident response plan covering AI-specific incidents.', pages:45, fileSize:'3.1 MB', department:'Security Operations', category:'Security', reviewer:'Emily Rodriguez', reviewFrequency:'Quarterly', expiryDate:'2027-02-28', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[{version:'v4.1',date:'2026-02-28',author:'James Wilson',changes:'Added AI-specific incident triage criteria'}], approvals:[{role:'CISO',name:'James Wilson',date:'2026-02-27',status:'Approved'}], linkedControls:[], comments:[] },
  { id:'DOC-005', title:'Vendor Assessment Guideline', type:'Guideline', version:'v1.3', owner:'Michael Torres', status:'In Review', lastUpdated:'2026-03-10', nextReview:'2026-09-10', frameworks:['SOC 2'], description:'Guidelines for assessing third-party AI vendors.', pages:20, fileSize:'1.5 MB', department:'Procurement', category:'Risk', reviewer:'James Wilson', reviewFrequency:'Yearly', expiryDate:'2027-03-10', enableNotifications:true, notificationDays:60, documentSource:'template', externalLink:'', versionHistory:[{version:'v1.3',date:'2026-03-10',author:'Michael Torres',changes:'Added LLM provider evaluation checklist'}], approvals:[{role:'CISO',name:'James Wilson',date:'2026-03-12',status:'Pending'}], linkedControls:[], comments:[] },
  { id:'DOC-006', title:'AI Ethics Framework', type:'Policy', version:'v2.0', owner:'Emily Rodriguez', status:'In Review', lastUpdated:'2026-03-15', nextReview:'2026-09-15', frameworks:['EU AI Act','NIST AI RMF'], description:'Establishes ethical principles for AI development and deployment.', pages:28, fileSize:'2.0 MB', department:'AI Governance', category:'Ethics', reviewer:'James Wilson', reviewFrequency:'Yearly', expiryDate:'2027-03-15', enableNotifications:false, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[{version:'v2.0',date:'2026-03-15',author:'Emily Rodriguez',changes:'Major revision for EU AI Act'}], approvals:[{role:'CEO',name:'Thomas Wright',date:'2026-03-18',status:'Pending'}], linkedControls:[], comments:[] },
  { id:'DOC-007', title:'Data Retention Policy', type:'Policy', version:'v3.0', owner:'Legal Team', status:'Published', lastUpdated:'2025-12-01', nextReview:'2026-06-01', frameworks:['GDPR'], description:'Defines data retention schedules and disposal procedures.', pages:16, fileSize:'1.1 MB', department:'Legal', category:'Data security', reviewer:'James Wilson', reviewFrequency:'Yearly', expiryDate:'2026-12-01', enableNotifications:true, notificationDays:60, documentSource:'template', externalLink:'', versionHistory:[], approvals:[], linkedControls:[], comments:[] },
  { id:'DOC-008', title:'Access Control Standard', type:'Standard', version:'v2.5', owner:'David Kim', status:'In Review', lastUpdated:'2026-03-20', nextReview:'2026-09-20', frameworks:['ISO 27001','SOC 2'], description:'Defines access control requirements for all systems.', pages:22, fileSize:'1.6 MB', department:'Information Security', category:'Access', reviewer:'James Wilson', reviewFrequency:'Quarterly', expiryDate:'2027-03-20', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[], approvals:[], linkedControls:[], comments:[] },
  { id:'DOC-009', title:'Change Management Procedure', type:'Procedure', version:'v1.8', owner:'Ops Team', status:'Published', lastUpdated:'2026-01-15', nextReview:'2026-07-15', frameworks:['SOC 2'], description:'Defines the change management process for all IT and AI systems.', pages:19, fileSize:'1.3 MB', department:'IT Operations', category:'Change management', reviewer:'James Wilson', reviewFrequency:'Quarterly', expiryDate:'2027-01-15', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[], approvals:[], linkedControls:[], comments:[] },
  { id:'DOC-010', title:'Business Continuity Plan', type:'Procedure', version:'v2.2', owner:'Sarah Chen', status:'Expired', lastUpdated:'2025-09-01', nextReview:'2026-03-01', frameworks:['ISO 27001'], description:'Business continuity and disaster recovery plan.', pages:38, fileSize:'2.8 MB', department:'Business Operations', category:'Business continuity', reviewer:'James Wilson', reviewFrequency:'Yearly', expiryDate:'2026-03-01', enableNotifications:true, notificationDays:30, documentSource:'template', externalLink:'', versionHistory:[], approvals:[], linkedControls:[], comments:[] },
];

function statusStyle(s: DocStatus) {
  const map: Record<string,{bg:string;color:string}> = { Published:{bg:'hsla(var(--s-ok-tx),0.1)',color:'hsl(var(--s-ok-tx))'}, Active:{bg:'hsla(var(--s-ok-tx),0.1)',color:'hsl(var(--s-ok-tx))'}, Approved:{bg:'hsla(var(--s-ok-tx),0.15)',color:'hsl(var(--s-ok-tx))'}, 'In Review':{bg:'hsla(var(--s-wn-tx),0.1)',color:'hsl(var(--s-wn-tx))'}, Pending:{bg:'hsla(var(--s-wn-tx),0.1)',color:'hsl(var(--s-wn-tx))'}, 'Need to Review':{bg:'hsla(var(--s-wn-tx),0.1)',color:'hsl(var(--s-wn-tx))'}, Draft:{bg:'hsla(var(--s-in-tx),0.1)',color:'hsl(var(--s-in-tx))'}, Expired:{bg:'hsla(var(--destructive),0.1)',color:'hsl(var(--destructive))'}, Rejected:{bg:'hsla(var(--destructive),0.1)',color:'hsl(var(--destructive))'}, Disabled:{bg:'hsla(var(--text-4),0.1)',color:'hsl(var(--text-4))'}, Inactive:{bg:'hsla(var(--text-4),0.1)',color:'hsl(var(--text-4))'}, Archived:{bg:'hsla(var(--text-4),0.1)',color:'hsl(var(--text-4))'} };
  return map[s] || {bg:'hsl(var(--bg-muted))',color:'hsl(var(--text-1))'};
}
function typeStyle(t: DocType) {
  const map: Record<string,{bg:string;color:string}> = { Policy:{bg:'hsla(var(--brand),0.1)',color:'hsl(var(--brand))'}, Procedure:{bg:'hsla(var(--s-in-tx),0.1)',color:'hsl(var(--s-in-tx))'}, Standard:{bg:'hsla(var(--s-ok-tx),0.1)',color:'hsl(var(--s-ok-tx))'}, Guideline:{bg:'hsla(var(--s-wn-tx),0.1)',color:'hsl(var(--s-wn-tx))'}, Template:{bg:'hsla(var(--text-4),0.1)',color:'hsl(var(--text-4))'} };
  return map[t] || {bg:'hsl(var(--bg-muted))',color:'hsl(var(--text-1))'};
}
function exportCSV(docs: Document[]) {
  const h = ['Doc ID','Title','Type','Version','Owner','Status','Last Updated','Next Review','Frameworks'];
  const rows = docs.map(d => [d.id,d.title,d.type,d.version,d.owner,d.status,d.lastUpdated,d.nextReview,d.frameworks.join('; ')]);
  const csv = [h,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='documents-export.csv'; a.click(); URL.revokeObjectURL(url);
  toast.success('Exported document library to CSV');
}

// ── Form Field Component ──
function FormField({ label, required, children, hint }: { label:string; required?:boolean; children:React.ReactNode; hint?:string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" style={{color:'hsl(var(--text-1))'}}>{label}{required && <span style={{color:'hsl(var(--destructive))'}}>*</span>}</label>
      {children}
      {hint && <p className="text-[10px]" style={{color:'hsl(var(--text-4))'}}>{hint}</p>}
    </div>
  );
}

export default function DocumentManagement() {
  const { orgName } = useSettingsStore();
  const [docs, setDocs] = useState<Document[]>(SEED_DOCS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document|null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState<any>({...EMPTY_FORM});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document|null>(null);

  const allCategories = [...CATEGORIES, ...customCategories];
  const setF = (k:string) => (v:any) => setForm((f:any) => ({...f,[k]:v}));

  const filtered = useMemo(() => docs.filter(doc => {
    const q = search.toLowerCase();
    const ms = !q || doc.title.toLowerCase().includes(q) || doc.id.toLowerCase().includes(q) || doc.owner.toLowerCase().includes(q) || doc.frameworks.some(f => f.toLowerCase().includes(q));
    const mt = filterType === 'all' || doc.type === filterType;
    const mst = filterStatus === 'all' || doc.status === filterStatus;
    return ms && mt && mst;
  }), [docs, search, filterType, filterStatus]);

  const totalDocuments = docs.length;
  const pendingReview = docs.filter(d => d.status === 'In Review').length;
  const expired = docs.filter(d => d.status === 'Expired').length;
  const publishedThisQ = docs.filter(d => d.status === 'Published' && new Date(d.lastUpdated) >= new Date('2026-01-01')).length;

  const openCreate = () => { setForm({...EMPTY_FORM}); setEditId(null); setFormOpen(true); };
  const openEdit = (doc: Document) => {
    setForm({ title:doc.title, type:doc.type, version:doc.version, owner:doc.owner, status:doc.status, description:doc.description, frameworks:[...doc.frameworks], category:doc.category||'', reviewer:doc.reviewer||'', reviewFrequency:doc.reviewFrequency||'Quarterly', expiryDate:doc.expiryDate||'', enableNotifications:doc.enableNotifications||false, notificationDays:doc.notificationDays||30, documentSource:doc.documentSource||'template', externalLink:doc.externalLink||'', department:doc.department||'' });
    setEditId(doc.id); setFormOpen(true);
  };
  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Policy name is required'); return; }
    if (!form.owner) { toast.error('Policy owner is required'); return; }
    if (!form.reviewer) { toast.error('Reviewer is required'); return; }
    setSaving(true);
    setTimeout(() => {
      const now = new Date().toISOString().slice(0,10);
      if (editId) {
        setDocs(p => p.map(d => d.id === editId ? {...d, ...form, lastUpdated:now, version: bumpVersion(d.version)} : d));
        toast.success('Policy document updated successfully');
      } else {
        const id = `DOC-${String(docs.length+1).padStart(3,'0')}`;
        const newDoc: Document = { ...form, id, lastUpdated:now, nextReview:form.expiryDate||now, pages:0, fileSize:'0 KB', versionHistory:[], approvals:[], linkedControls:[], comments:[] };
        setDocs(p => [...p, newDoc]);
        toast.success('New policy document created successfully');
      }
      setSaving(false); setFormOpen(false); setEditId(null); setForm({...EMPTY_FORM});
    }, 600);
  };
  const handleDelete = () => {
    if (deleteTarget) {
      setDocs(p => p.filter(d => d.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
    }
  };
  const bumpVersion = (v:string) => {
    const num = v.replace('v','');
    const parts = num.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = (parseInt(parts[1]) || 0) + 1;
    return `v${major}.${minor}`;
  };
  const toggleFramework = (fw:string) => {
    const cur = form.frameworks || [];
    if (cur.includes(fw)) setForm((f:any) => ({...f, frameworks:cur.filter((x:string)=>x!==fw)}));
    else setForm((f:any) => ({...f, frameworks:[...cur,fw]}));
  };
  const addCategory = () => {
    const trimmed = newCat.trim();
    if (trimmed && !allCategories.includes(trimmed)) {
      setCustomCategories(p => [...p, trimmed]);
      setForm((f:any) => ({...f, category:trimmed}));
    }
    setNewCat('');
  };

  const openDetail = (doc: Document) => { setSelectedDoc(doc); setDrawerTab('overview'); setSheetOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'hsl(var(--text-1))'}}> Document Management</h1>
          <p className="text-sm mt-1" style={{color:'hsl(var(--text-4))'}}>{orgName} &middot; Policy library and document lifecycle management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} style={{borderRadius:0}}><Export size={14} />Export CSV</Button>
          <Button size="sm" onClick={openCreate} style={{borderRadius:0,background:'hsl(var(--brand))',color:'hsl(var(--bg-surface))'}}><Plus size={14} />New Document</Button>
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[['Total Documents',totalDocuments,FileText,'hsl(var(--text-1))'],['Pending Review',pendingReview,Clock,'hsl(var(--s-wn-tx))'],['Expired',expired,Warning,'hsl(var(--destructive))'],['Published This Quarter',publishedThisQ,CheckCircle,'hsl(var(--s-ok-tx))']].map(([l,v,Icon,c]:any) => (
          <Card key={l} style={{borderRadius:0,background:'hsl(var(--bg-surface))',border:'1px solid hsl(var(--border))'}}><CardContent className="px-4 py-3 flex items-center justify-between"><div><p className="text-xs font-medium" style={{color:'hsl(var(--text-4))'}}>{l}</p><p className="text-2xl font-bold mt-1" style={{color:c}}>{v}</p></div><Icon size={28} weight="duotone" style={{color:c,opacity:0.7}} /></CardContent></Card>
        ))}
      </div>
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm"><MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:'hsl(var(--text-4))'}} /><Input placeholder="Search documents..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-8 h-8 text-sm" style={{borderRadius:0}} /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-40 h-8 text-xs" style={{borderRadius:0}}><SelectValue placeholder="Type" /></SelectTrigger><SelectContent style={{borderRadius:0}}><SelectItem value="all">All Types</SelectItem><SelectItem value="Policy">Policy</SelectItem><SelectItem value="Procedure">Procedure</SelectItem><SelectItem value="Standard">Standard</SelectItem><SelectItem value="Guideline">Guideline</SelectItem><SelectItem value="Template">Template</SelectItem></SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40 h-8 text-xs" style={{borderRadius:0}}><SelectValue placeholder="Status" /></SelectTrigger><SelectContent style={{borderRadius:0}}><SelectItem value="all">All Statuses</SelectItem>{ALL_STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <span className="text-xs ml-auto" style={{color:'hsl(var(--text-4))'}}>{filtered.length} of {docs.length} documents</span>
      </div>
      {/* Table */}
      <Card style={{borderRadius:0,background:'hsl(var(--bg-surface))',border:'1px solid hsl(var(--border))'}}><CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{color:'hsl(var(--text-4))'}}><FileText size={40} /><p className="mt-3 text-sm font-medium">No documents match your filters</p><Button size="sm" className="mt-3" onClick={openCreate}><Plus size={14} />Add New Policy</Button></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr style={{borderBottom:'1px solid hsl(var(--border))',background:'hsl(var(--bg-muted))'}}>
            {['Doc ID','Title','Type','Version','Owner','Status','Last Updated','Next Review','Frameworks',''].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{color:'hsl(var(--text-4))'}}>{h}</th>)}
          </tr></thead><tbody>
            {filtered.map(doc => { const ss=statusStyle(doc.status); const ts=typeStyle(doc.type); return (
              <tr key={doc.id} className="cursor-pointer" style={{borderBottom:'1px solid hsl(var(--border))',borderLeft:doc.status==='Expired'?'4px solid hsl(var(--destructive))':'none'}} onMouseEnter={e=>(e.currentTarget.style.background='hsl(var(--bg-muted))')} onMouseLeave={e=>(e.currentTarget.style.background='')} onClick={()=>openDetail(doc)}>
                <td className="px-3 py-2"><span className="font-mono text-xs font-medium" style={{color:'hsl(var(--brand))'}}>{doc.id}</span></td>
                <td className="px-3 py-2" style={{maxWidth:240}}><span className="text-sm font-medium" style={{color:'hsl(var(--text-1))'}}>{doc.title}</span></td>
                <td className="px-3 py-2"><Badge style={{background:ts.bg,color:ts.color,borderRadius:0,fontSize:11}}>{doc.type}</Badge></td>
                <td className="px-3 py-2"><span className="text-xs font-mono" style={{color:'hsl(var(--text-1))'}}>{doc.version}</span></td>
                <td className="px-3 py-2"><span className="text-xs" style={{color:'hsl(var(--text-1))'}}>{doc.owner}</span></td>
                <td className="px-3 py-2"><Badge style={{background:ss.bg,color:ss.color,borderRadius:0,fontSize:11}}>{doc.status}</Badge></td>
                <td className="px-3 py-2"><span className="text-xs" style={{color:'hsl(var(--text-1))'}}>{doc.lastUpdated}</span></td>
                <td className="px-3 py-2"><span className="text-xs" style={{color:doc.status==='Expired'?'hsl(var(--destructive))':'hsl(var(--text-1))',fontWeight:doc.status==='Expired'?600:400}}>{doc.nextReview}</span></td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{doc.frameworks.map(fw=><Badge key={fw} variant="outline" style={{borderRadius:0,fontSize:10,color:'hsl(var(--text-3))',borderColor:'hsl(var(--border))'}}>{fw}</Badge>)}</div></td>
                <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                  <div className="flex gap-1">
                    <button onClick={()=>openEdit(doc)} className="p-1 hover:bg-raised" title="Edit"><PencilSimple size={14} style={{color:'hsl(var(--text-4))'}} /></button>
                    <button onClick={()=>setDeleteTarget(doc)} className="p-1 hover:bg-[hsl(var(--s-er-bg))]" title="Delete"><Trash size={14} style={{color:'hsl(var(--s-er-tx))'}} /></button>
                  </div>
                </td>
              </tr>
            ); })}
          </tbody></table></div>
        )}
      </CardContent></Card>

      {/* ── Add/Edit Policy Form Sheet ── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="w-[620px] sm:max-w-[620px] overflow-y-auto p-0" style={{borderRadius:0}}>
          <div className="sticky top-0 z-10 px-6 py-4 border-b" style={{background:'hsl(var(--bg-surface))',borderColor:'hsl(var(--border))'}}>
            <SheetTitle className="text-lg font-bold" style={{color:'hsl(var(--text-1))'}}>{editId ? 'Edit Policy Document' : 'Add New Policy'}</SheetTitle>
            <p className="text-xs mt-1" style={{color:'hsl(var(--text-4))'}}>Fill in the details below to {editId ? 'update' : 'add a new'} policy document.</p>
          </div>
          <div className="space-y-4">
            {/* Section: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{color:'hsl(var(--text-4))'}}>Policy Information</h3>
              <FormField label="Policy Name" required hint="Enter a clear, descriptive name for the policy.">
                <Input value={form.title} onChange={e=>setF('title')(e.target.value)} placeholder="e.g. Data Privacy Policy" className="h-9 text-sm" style={{borderRadius:0}} />
              </FormField>
              <FormField label="Policy Description" hint="Provide a brief description of the policy scope and objectives.">
                <textarea value={form.description} onChange={e=>setF('description')(e.target.value)} placeholder="Describe the policy..." rows={3} className="w-full px-3 py-2 text-sm border resize-none" style={{borderRadius:0,borderColor:'hsl(var(--border))',background:'hsl(var(--bg-surface))',color:'hsl(var(--text-1))'}} />
              </FormField>
              {/* Linked Frameworks */}
              <FormField label="Linked Frameworks" hint="Link to compliance frameworks for audit traceability.">
                <div className="flex flex-wrap gap-1.5">
                  {FRAMEWORKS_LIST.map(fw => (
                    <button key={fw} onClick={()=>toggleFramework(fw)} className="px-2 py-1 text-[11px] border transition-colors" style={{borderRadius:0, background:(form.frameworks||[]).includes(fw)?'hsl(var(--brand))':'transparent', color:(form.frameworks||[]).includes(fw)?'hsl(var(--bg-surface))':'hsl(var(--text-2))', borderColor:(form.frameworks||[]).includes(fw)?'hsl(var(--brand))':'hsl(var(--border))'}}>{fw}</button>
                  ))}
                </div>
              </FormField>
              {/* Category */}
              <FormField label="Policy Category" hint="Assign a category to organize documents efficiently.">
                <Select value={form.category} onValueChange={setF('category')}>
                  <SelectTrigger className="h-9 text-sm" style={{borderRadius:0}}><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent style={{borderRadius:0}}>
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 mt-2">
                  <Input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="New category name" className="h-8 text-xs flex-1" style={{borderRadius:0}} onKeyDown={e => e.key==='Enter' && (e.preventDefault(), addCategory())} />
                  <Button variant="outline" size="sm" onClick={addCategory} style={{borderRadius:0}} disabled={!newCat.trim()}>+ Add</Button>
                </div>
              </FormField>
            </div>
            {/* Section: Ownership */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{color:'hsl(var(--text-4))'}}>Ownership & Review</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Policy Owner" required>
                  <Select value={form.owner} onValueChange={setF('owner')}><SelectTrigger className="h-9 text-sm" style={{borderRadius:0}}><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent style={{borderRadius:0}}>{OWNERS_LIST.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                </FormField>
                <FormField label="Status" required>
                  <Select value={form.status} onValueChange={setF('status')}><SelectTrigger className="h-9 text-sm" style={{borderRadius:0}}><SelectValue /></SelectTrigger><SelectContent style={{borderRadius:0}}>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </FormField>
              </div>
              <FormField label="Version" hint="Version number will be automatically updated on edits.">
                <Input value={form.version} onChange={e=>setF('version')(e.target.value)} placeholder="1.0" className="h-9 text-sm" style={{borderRadius:0}} />
              </FormField>
            </div>
            {/* Section: Document Source */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{color:'hsl(var(--text-4))'}}>Document Source</h3>
              <div className="flex gap-2">
                {[['template','Policy Template'],['upload','Upload File'],['link','External Link']].map(([val,label]) => (
                  <button key={val} onClick={()=>setF('documentSource')(val)} className="flex-1 px-3 py-2.5 text-xs font-medium border transition-colors text-center" style={{borderRadius:0, background:form.documentSource===val?'hsl(var(--brand))':'transparent', color:form.documentSource===val?'hsl(var(--bg-surface))':'hsl(var(--text-2))', borderColor:form.documentSource===val?'hsl(var(--brand))':'hsl(var(--border))'}}>{label}</button>
                ))}
              </div>
              {form.documentSource === 'template' && <p className="text-xs" style={{color:'hsl(var(--text-4))'}}>Choose from existing policy templates in the system.</p>}
              {form.documentSource === 'upload' && <div className="border-2 border-dashed p-6 text-center" style={{borderColor:'hsl(var(--border))',borderRadius:0}}><p className="text-xs" style={{color:'hsl(var(--text-4))'}}>Drag and drop a file here, or click to browse</p><Button variant="outline" size="sm" className="mt-2" style={{borderRadius:0}}>Browse Files</Button></div>}
              {form.documentSource === 'link' && <FormField label="External Link"><Input value={form.externalLink} onChange={e=>setF('externalLink')(e.target.value)} placeholder="https://..." className="h-9 text-sm" style={{borderRadius:0}} /></FormField>}
            </div>
            {/* Section: Review Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{color:'hsl(var(--text-4))'}}>Review & Notifications</h3>
              <FormField label="Reviewer" required>
                <Select value={form.reviewer} onValueChange={setF('reviewer')}><SelectTrigger className="h-9 text-sm" style={{borderRadius:0}}><SelectValue placeholder="Select reviewer" /></SelectTrigger><SelectContent style={{borderRadius:0}}>{REVIEWERS_LIST.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
              </FormField>
              <FormField label="Policy Review Frequency" hint="Set how frequently this policy should be reviewed.">
                <div className="flex gap-2">
                  {REVIEW_FREQUENCIES.map(freq => (
                    <button key={freq} onClick={()=>setF('reviewFrequency')(freq)} className="flex-1 px-2 py-2 text-[11px] font-medium border transition-colors text-center" style={{borderRadius:0, background:form.reviewFrequency===freq?'hsl(var(--brand))':'transparent', color:form.reviewFrequency===freq?'hsl(var(--bg-surface))':'hsl(var(--text-2))', borderColor:form.reviewFrequency===freq?'hsl(var(--brand))':'hsl(var(--border))'}}>{freq}</button>
                  ))}
                </div>
              </FormField>
              <FormField label="Expiry Date" hint="Set the expiry date for this document.">
                <Input type="date" value={form.expiryDate} onChange={e=>setF('expiryDate')(e.target.value)} className="h-9 text-sm" style={{borderRadius:0}} />
              </FormField>
              <div className="flex items-center justify-between p-3 border" style={{borderRadius:0,borderColor:'hsl(var(--border))',background:'hsl(var(--bg-muted))'}}>
                <div className="flex items-center gap-2"><Bell size={16} style={{color:'hsl(var(--brand))'}} /><div><p className="text-xs font-semibold" style={{color:'hsl(var(--text-1))'}}>Enable Notifications</p><p className="text-[10px]" style={{color:'hsl(var(--text-4))'}}>Receive alerts before document expiry.</p></div></div>
                <button onClick={()=>setF('enableNotifications')(!form.enableNotifications)} className="w-10 h-5 rounded-full relative transition-colors" style={{background:form.enableNotifications?'hsl(var(--brand))':'hsl(var(--border))'}}><span className="absolute top-0.5 w-4 h-4 rounded-full bg-[hsl(var(--bg-surface))] shadow transition-all" style={{left:form.enableNotifications?'22px':'2px'}} /></button>
              </div>
              {form.enableNotifications && (
                <FormField label="Notification Days Before Expiry" hint="Number of days before expiry to send notification (1-90).">
                  <Input type="number" min={1} max={90} value={form.notificationDays} onChange={e=>setF('notificationDays')(parseInt(e.target.value)||30)} className="h-9 text-sm w-32" style={{borderRadius:0}} />
                </FormField>
              )}
            </div>
          </div>
          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t flex justify-end gap-2" style={{background:'hsl(var(--bg-surface))',borderColor:'hsl(var(--border))'}}>
            <Button variant="outline" size="sm" onClick={()=>setFormOpen(false)} style={{borderRadius:0}}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} style={{borderRadius:0,background:'hsl(var(--brand))',color:'hsl(var(--bg-surface))'}}>{saving ? 'Saving...' : editId ? 'Update Policy' : 'Create Policy'}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Document Detail Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[580px] sm:max-w-[580px] overflow-y-auto" style={{borderRadius:0}}>
          {selectedDoc && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold" style={{color:'hsl(var(--brand))'}}>{selectedDoc.id}</span>
                  <Badge style={{background:typeStyle(selectedDoc.type).bg,color:typeStyle(selectedDoc.type).color,borderRadius:0,fontSize:11}}>{selectedDoc.type}</Badge>
                  <Badge style={{background:statusStyle(selectedDoc.status).bg,color:statusStyle(selectedDoc.status).color,borderRadius:0,fontSize:11}}>{selectedDoc.status}</Badge>
                  <span className="text-xs font-mono" style={{color:'hsl(var(--text-4))'}}>{selectedDoc.version}</span>
                </div>
                <SheetTitle style={{color:'hsl(var(--text-1))'}}>{selectedDoc.title}</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="outline" size="sm" style={{borderRadius:0}} onClick={()=>{setSheetOpen(false);openEdit(selectedDoc);}}><PencilSimple size={12} />Edit</Button>
                <Button variant="outline" size="sm" style={{borderRadius:0}} onClick={()=>{setSheetOpen(false);setDeleteTarget(selectedDoc);}}><Trash size={12} />Delete</Button>
              </div>
              <Tabs value={drawerTab} onValueChange={setDrawerTab} className="mt-4">
                <TabsList className="w-full" style={{borderRadius:0,background:'hsl(var(--bg-muted))'}}>
                  <TabsTrigger value="overview" style={{borderRadius:0}}>Overview</TabsTrigger>
                  <TabsTrigger value="versions" style={{borderRadius:0}}>Versions</TabsTrigger>
                  <TabsTrigger value="approvals" style={{borderRadius:0}}>Approvals</TabsTrigger>
                  <TabsTrigger value="controls" style={{borderRadius:0}}>Controls</TabsTrigger>
                  <TabsTrigger value="comments" style={{borderRadius:0}}>Comments</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[['Owner',selectedDoc.owner],['Department',selectedDoc.department],['Category',selectedDoc.category||'—'],['Reviewer',selectedDoc.reviewer||'—'],['Review Frequency',selectedDoc.reviewFrequency||'—'],['Expiry Date',selectedDoc.expiryDate||'—'],['Last Updated',selectedDoc.lastUpdated],['Next Review',selectedDoc.nextReview]].map(([k,v]) => (
                      <div key={k}><p className="text-[10px] font-semibold uppercase" style={{color:'hsl(var(--text-4))'}}>{k}</p><span className="text-sm" style={{color:'hsl(var(--text-1))'}}>{v}</span></div>
                    ))}
                  </div>
                  <div><p className="text-[10px] font-semibold uppercase" style={{color:'hsl(var(--text-4))'}}>Frameworks</p><div className="flex flex-wrap gap-1 mt-1">{selectedDoc.frameworks.map(fw=><Badge key={fw} variant="outline" style={{borderRadius:0,fontSize:11,color:'hsl(var(--brand))',borderColor:'hsl(var(--brand))'}}>{fw}</Badge>)}</div></div>
                  <div><p className="text-[10px] font-semibold uppercase" style={{color:'hsl(var(--text-4))'}}>Description</p><p className="text-sm mt-1" style={{color:'hsl(var(--text-1))'}}>{selectedDoc.description}</p></div>
                  {selectedDoc.enableNotifications && <div className="p-2 border flex items-center gap-2" style={{borderRadius:0,borderColor:'hsl(var(--border))',background:'hsl(var(--bg-muted))'}}><Bell size={14} style={{color:'hsl(var(--brand))'}} /><span className="text-xs" style={{color:'hsl(var(--text-2))'}}>Notifications enabled &middot; {selectedDoc.notificationDays} days before expiry</span></div>}
                </TabsContent>
                <TabsContent value="versions" className="mt-4">
                  {selectedDoc.versionHistory.length === 0 ? <p className="text-xs py-6 text-center" style={{color:'hsl(var(--text-4))'}}>No version history.</p> :
                    selectedDoc.versionHistory.map((vh,i) => <div key={i} className="p-3 mb-2" style={{borderLeft:i===0?'3px solid hsl(var(--brand))':'3px solid hsl(var(--border))'}}><div className="flex justify-between"><span className="text-xs font-bold font-mono" style={{color:i===0?'hsl(var(--brand))':'hsl(var(--text-1))'}}>{vh.version}</span><span className="text-[10px]" style={{color:'hsl(var(--text-4))'}}>{vh.date}</span></div><p className="text-xs mt-1" style={{color:'hsl(var(--text-1))'}}>{vh.changes}</p></div>)
                  }
                </TabsContent>
                <TabsContent value="approvals" className="mt-4">
                  {selectedDoc.approvals.length === 0 ? <p className="text-xs py-6 text-center" style={{color:'hsl(var(--text-4))'}}>No approvals.</p> :
                    <table className="w-full text-sm"><thead><tr style={{borderBottom:'1px solid hsl(var(--border))'}}>{['Role','Approver','Date','Status'].map(h=><th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase" style={{color:'hsl(var(--text-4))'}}>{h}</th>)}</tr></thead><tbody>{selectedDoc.approvals.map((a,i)=><tr key={i} style={{borderBottom:'1px solid hsl(var(--border))'}}><td className="px-2 py-2 text-xs">{a.role}</td><td className="px-2 py-2 text-xs">{a.name}</td><td className="px-2 py-2 text-xs" style={{color:'hsl(var(--text-4))'}}>{a.date}</td><td className="px-2 py-2"><Badge style={{background:a.status==='Approved'?'hsla(var(--s-ok-tx),0.1)':'hsla(var(--s-wn-tx),0.1)',color:a.status==='Approved'?'hsl(var(--s-ok-tx))':'hsl(var(--s-wn-tx))',borderRadius:0,fontSize:10}}>{a.status}</Badge></td></tr>)}</tbody></table>
                  }
                </TabsContent>
                <TabsContent value="controls" className="mt-4">
                  {selectedDoc.linkedControls.length === 0 ? <p className="text-xs py-6 text-center" style={{color:'hsl(var(--text-4))'}}>No linked controls.</p> :
                    selectedDoc.linkedControls.map((c,i) => <div key={i} className="p-3 mb-2 border flex items-start gap-2" style={{borderRadius:0,borderColor:'hsl(var(--border))'}}><ShieldCheck size={14} style={{color:'hsl(var(--brand))',marginTop:2}} /><div><span className="text-xs font-bold font-mono" style={{color:'hsl(var(--brand))'}}>{c.controlId}</span><p className="text-sm" style={{color:'hsl(var(--text-1))'}}>{c.title}</p><p className="text-[10px]" style={{color:'hsl(var(--text-4))'}}>Framework: {c.framework}</p></div></div>)
                  }
                </TabsContent>
                <TabsContent value="comments" className="mt-4">
                  {selectedDoc.comments.length === 0 ? <p className="text-xs py-6 text-center" style={{color:'hsl(var(--text-4))'}}>No comments.</p> :
                    selectedDoc.comments.map((c,i) => <div key={i} className="p-3 mb-2" style={{borderLeft:'3px solid hsl(var(--brand))'}}><div className="flex justify-between mb-1"><span className="text-xs font-bold" style={{color:'hsl(var(--text-1))'}}>{c.author}</span><span className="text-[10px]" style={{color:'hsl(var(--text-4))'}}>{c.date}</span></div><p className="text-xs" style={{color:'hsl(var(--text-1))'}}>{c.text}</p></div>)
                  }
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[400px] p-6" style={{background:'hsl(var(--bg-surface))',border:'1px solid hsl(var(--border))',borderRadius:0}}>
            <h3 className="text-sm font-bold" style={{color:'hsl(var(--text-1))'}}>Delete "{deleteTarget.title}"?</h3>
            <p className="text-xs mt-2" style={{color:'hsl(var(--text-4))'}}>This document will be permanently removed.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={()=>setDeleteTarget(null)} style={{borderRadius:0}}>Cancel</Button>
              <Button size="sm" onClick={handleDelete} style={{borderRadius:0,background:'hsl(var(--destructive))',color:'hsl(var(--bg-surface))'}}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
