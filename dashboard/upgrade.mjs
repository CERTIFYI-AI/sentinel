
import{dirname,join}from'path';import{fileURLToPath}from'url';const __dirname=dirname(fileURLToPath(import.meta.url));const S=join(__dirname,'src');const W=(p,c)=>{mk(join(S,p,'..'),{recursive:true});wr(join(S,p),c);console.log('wrote',p);};

// 1. index.css
W('../src/index.css',`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base {
  :root {
    --background: 0 0% 98%;
    --foreground: 0 0% 10%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 10%;
    --primary: 136 45% 38%;
    --primary-foreground: 0 0% 100%;
    --secondary: 136 15% 94%;
    --secondary-foreground: 136 45% 25%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --accent: 136 15% 94%;
    --accent-foreground: 136 45% 25%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 136 45% 38%;
    --radius: 0.5rem;
  }
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-['Outfit',sans-serif]; }
}
`);

// 2. App.tsx - no ThemeProvider
W('App.tsx',`import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import ComplianceDashboard from './pages/ComplianceDashboard';
import SettingsPage from './pages/SettingsPage';
import GapAnalysis from './pages/GapAnalysis';
import ModelLifecycle from './pages/ModelLifecycle';
import AuditLog from './pages/AuditLog';
import Benchmark from './pages/Benchmark';
import Datasets from './pages/Datasets';
import EvidenceVault from './pages/EvidenceVault';
import ExportCenter from './pages/ExportCenter';
import HitQueue from './pages/HitQueue';
import IncidentLog from './pages/IncidentLog';
import Login from './pages/Login';
import ModelInventory from './pages/ModelInventory';
import Notifications from './pages/Notifications';
import PolicyEditor from './pages/PolicyEditor';
import Remediation from './pages/Remediation';
import RemediationTracker from './pages/RemediationTracker';
import RiskMatrix from './pages/RiskMatrix';
import Signup from './pages/Signup';
import Vendors from './pages/Vendors';
export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[hsl(var(--background))]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main className={\`flex-1 overflow-auto transition-all \${collapsed ? 'ml-[48px]' : 'ml-[240px]'}\`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/compliance" element={<ComplianceDashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/gap-analysis" element={<GapAnalysis />} />
              <Route path="/models" element={<ModelLifecycle />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/benchmark" element={<Benchmark />} />
              <Route path="/datasets" element={<Datasets />} />
              <Route path="/evidence" element={<EvidenceVault />} />
              <Route path="/export" element={<ExportCenter />} />
              <Route path="/hit-queue" element={<HitQueue />} />
              <Route path="/incidents" element={<IncidentLog />} />
              <Route path="/login" element={<Login />} />
              <Route path="/inventory" element={<ModelInventory />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/policies" element={<PolicyEditor />} />
              <Route path="/remediation" element={<Remediation />} />
              <Route path="/remediation-tracker" element={<RemediationTracker />} />
              <Route path="/risk" element={<RiskMatrix />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/vendors" element={<Vendors />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
`);

// 3. Sidebar - text-only, collapsible rail, no icons
W('components/Sidebar.tsx',`import { NavLink } from 'react-router-dom';
interface Props { collapsed: boolean; onToggle: () => void; }
const NAV = [
  { s: 'OVERVIEW', items: [{ l: 'Dashboard', to: '/' }] },
  { s: 'COMPLIANCE', items: [{ l: 'Compliance', to: '/compliance' },{ l: 'Gap Analysis', to: '/gap-analysis' },{ l: 'Evidence', to: '/evidence' },{ l: 'Policies', to: '/policies' }]},
  { s: 'AI MODELS', items: [{ l: 'Lifecycle', to: '/models' },{ l: 'Inventory', to: '/inventory' },{ l: 'Benchmark', to: '/benchmark' }]},
  { s: 'RISK', items: [{ l: 'Risk Matrix', to: '/risk' },{ l: 'Incidents', to: '/incidents' },{ l: 'Remediation', to: '/remediation' }]},
  { s: 'DATA', items: [{ l: 'Datasets', to: '/datasets' },{ l: 'Audit Log', to: '/audit' },{ l: 'Export', to: '/export' }]},
  { s: 'SYSTEM', items: [{ l: 'Settings', to: '/settings' },{ l: 'Notifications', to: '/notifications' },{ l: 'Vendors', to: '/vendors' }]},
];
export default function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <aside className={\`fixed top-0 left-0 h-screen bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] transition-all z-40 flex flex-col \${collapsed ? 'w-[48px]' : 'w-[240px]'}\`}>
      <div className="h-14 flex items-center px-4 border-b border-[hsl(var(--border))]">
        {!collapsed && <span className="font-semibold text-sm tracking-wide text-[hsl(var(--primary))]" style={{fontFamily:'Outfit'}}>CERTIFYI SENTINEL</span>}
        <button onClick={onToggle} className={\`text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] \${collapsed ? 'mx-auto' : 'ml-auto'}\`}>
          {collapsed ? '\u25B6' : '\u25C0'}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(g => (
          <div key={g.s} className="mb-1">
            {!collapsed && <div className="px-4 py-2 text-[10px] font-semibold tracking-widest text-[hsl(var(--muted-foreground))] uppercase">{g.s}</div>}
            {g.items.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => \`flex items-center px-4 py-2 text-sm transition-colors \${isActive ? 'text-[hsl(var(--primary))] bg-[hsl(var(--accent))] border-l-2 border-[hsl(var(--primary))] font-medium' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'}\`}>
                {collapsed ? <span className="w-1.5 h-1.5 rounded-full bg-current mx-auto" /> : item.l}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
`);

// 4. ComplianceDashboard with tabs
W('pages/ComplianceDashboard.tsx',`import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
const FW = [
  { name: 'EU AI Act', status: 'Active', score: 87, controls: 42 },
  { name: 'NIST AI RMF', status: 'Active', score: 72, controls: 38 },
  { name: 'ISO 42001', status: 'Draft', score: 45, controls: 56 },
  { name: 'SOC 2 Type II', status: 'Active', score: 91, controls: 64 },
];
const TABS = ['Overview','Controls','Evidence','Gap Analysis'] as const;
export default function ComplianceDashboard() {
  const [tab, setTab] = useState<string>('Overview');
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between"><div><p className="text-xs font-medium tracking-widest text-[hsl(var(--muted-foreground))] uppercase mb-1">Compliance</p><h1 className="text-3xl font-light" style={{fontFamily:'Outfit'}}>Governance Dashboard</h1></div><Button variant="outline" size="sm">Generate Report</Button></div>
      <Card className="border-l-4 border-l-[hsl(var(--primary))]"><CardContent className="py-6"><div className="flex items-center gap-8"><div><p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">AI Governance Score</p><p className="text-5xl font-light text-[hsl(var(--primary))]" style={{fontFamily:'Outfit'}}>78</p></div><div className="flex-1 grid grid-cols-3 gap-6"><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Frameworks</p><p className="text-2xl font-light">4</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Controls</p><p className="text-2xl font-light">200</p></div><div><p className="text-xs text-[hsl(var(--muted-foreground))]">Gaps</p><p className="text-2xl font-light text-amber-600">23</p></div></div></div></CardContent></Card>
      <div className="border-b border-[hsl(var(--border))]"><div className="flex gap-6">{TABS.map(t=>(<button key={t} onClick={()=>setTab(t)} className={\`pb-3 text-sm font-medium transition-colors \${tab===t?'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]':'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}\`}>{t}</button>))}</div></div>
      {tab==='Overview'&&(<div className="grid grid-cols-2 gap-6">{FW.map(f=>(<Card key={f.name}><CardHeader className="pb-2"><div className="flex justify-between items-start"><CardTitle className="text-base font-medium">{f.name}</CardTitle><Badge variant={f.status==='Active'?'default':'secondary'}>{f.status}</Badge></div></CardHeader><CardContent><div className="flex items-end gap-4"><span className="text-3xl font-light text-[hsl(var(--primary))]">{f.score}%</span><span className="text-xs text-[hsl(var(--muted-foreground))]">{f.controls} controls</span></div><div className="mt-3 h-1.5 bg-[hsl(var(--muted))] rounded-full"><div className="h-full bg-[hsl(var(--primary))] rounded-full" style={{width:\`\${f.score}%\`}}/></div></CardContent></Card>))}</div>)}
      {tab==='Controls'&&<Card><CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">Controls list with search, sort and pagination.</CardContent></Card>}
      {tab==='Evidence'&&<Card><CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">Evidence hub with file uploads and audit trail.</CardContent></Card>}
      {tab==='Gap Analysis'&&<Card><CardContent className="py-8 text-center text-[hsl(var(--muted-foreground))]">Gap analysis matrix and remediation planning.</CardContent></Card>}
    </div>
  );
}
`);

// 5. SettingsPage with tabs
W('pages/SettingsPage.tsx',`import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
const TABS = ['General','Security','Notifications','Integrations'] as const;
export default function SettingsPage() {
  const [tab, setTab] = useState<string>('General');
  return (
    <div className="space-y-8">
      <div><p className="text-xs font-medium tracking-widest text-[hsl(var(--muted-foreground))] uppercase mb-1">System</p><h1 className="text-3xl font-light" style={{fontFamily:'Outfit'}}>Settings</h1></div>
      <div className="border-b border-[hsl(var(--border))]"><div className="flex gap-6">{TABS.map(t=>(<button key={t} onClick={()=>setTab(t)} className={\`pb-3 text-sm font-medium transition-colors \${tab===t?'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]':'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}\`}>{t}</button>))}</div></div>
      {tab==='General'&&<div className="grid gap-6 max-w-2xl"><Card><CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-sm text-[hsl(var(--muted-foreground))] block mb-1.5">Company Name</label><Input defaultValue="Certifyi Sentinel"/></div><div><label className="text-sm text-[hsl(var(--muted-foreground))] block mb-1.5">Domain</label><Input defaultValue="certifyi.ai"/></div><Button size="sm">Save Changes</Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader><CardContent><p className="text-sm text-[hsl(var(--muted-foreground))]">Light mode is the default and only theme.</p></CardContent></Card></div>}
      {tab==='Security'&&<Card className="max-w-2xl"><CardContent className="py-6 space-y-4"><div className="flex justify-between items-center"><div><p className="text-sm font-medium">Two-Factor Auth</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Extra security</p></div><Badge>Enabled</Badge></div></CardContent></Card>}
      {tab==='Notifications'&&<Card className="max-w-2xl"><CardContent className="py-6 text-sm text-[hsl(var(--muted-foreground))]">Notification preferences configuration.</CardContent></Card>}
      {tab==='Integrations'&&<Card 1
      ="max-w-2xl"><CardContent className="py-6 text-sm text-[hsl(var(--muted-foreground))]">Third-party integrations and API keys.</CardContent></Card>}
    </div>
  );
}
`);

// 6. Cleanup: delete old Settings.tsx, remove lucide, remove theme-provider
import{globSync}from'fs';
try{ul(join(S,'pages/Settings.tsx'));console.log('deleted Settings.tsx')}catch(e){}
try{ul(join(S,'components/theme-provider.tsx'));console.log('deleted theme-provider')}catch(e){}
// Remove lucide-react from all .tsx files
const files=[];
function walk(d){rd(d,{withFileTypes:true}).forEach(e=>{const p=join(d,e.name);if(e.isDirectory()&&e.name!=='node_modules')walk(p);else if(e.name.endsWith('.tsx'))files.push(p);});}
walk(S);
files.forEach(fp=>{let t=rf(fp,'utf8');if(t.includes('lucide-react')){t=t.split('\n').filter(l=>!l.includes('lucide-react')).join('\n');wr(fp,t);console.log('cleaned lucide from',fp);}});

// 7. Update tailwind.config.ts with Outfit
const tc=join(__dirname,'tailwind.config.ts');
let tw=rf(tc,'utf8');
if(!tw.includes('Outfit')){tw=tw.replace('fontFamily: {',"fontFamily: {\n        sans: ['Outfit', 'sans-serif'],");wr(tc,tw);console.log('tailwind updated with Outfit');}

console.log('=== ALL DONE ===');