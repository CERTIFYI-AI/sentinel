import { useState } from 'react';
import { Building, Globe, Shield, Key, Bell, Database, Plug, FloppyDisk, Plus, Copy, Eye, EyeSlash, ArrowCounterClockwise, Trash, CheckCircle, XCircle, Warning, Lock, User, ClockCounterClockwise, Moon, Sun, Desktop, PaintBrush } from '@phosphor-icons/react';
import { useTheme } from '../providers/theme';
import { getStoredAccent, setAccent, type Accent } from '../store/accentStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSettingsStore } from '../stores/settingsStore';

// ── API Keys ─────────────────────────────────────────────────────────────────
interface ApiKey {
  id: string; name: string; prefix: string; created: string; lastUsed: string;
  scopes: string[]; status: 'Active' | 'Revoked';
}

const INITIAL_KEYS: ApiKey[] = [
  { id: 'key-1', name: 'Production ML Pipeline', prefix: 'sk-prod-7a3f', created: '2025-08-12', lastUsed: '2026-03-30', scopes: ['models:read', 'guardrails:read', 'guardrails:write'], status: 'Active' },
  { id: 'key-2', name: 'Staging Integration Tests', prefix: 'sk-stg-2b1c', created: '2026-01-05', lastUsed: '2026-03-29', scopes: ['models:read', 'models:write', 'risks:read'], status: 'Active' },
  { id: 'key-3', name: 'Deprecated Legacy System', prefix: 'sk-leg-9d4e', created: '2025-03-01', lastUsed: '2025-06-15', scopes: [], status: 'Revoked' },
];

// ── Notifications ─────────────────────────────────────────────────────────────
interface NotifPref {
  event: string; email: boolean; slack: boolean; sms: boolean; description: string;
}

const INITIAL_NOTIFS: NotifPref[] = [
  { event: 'Incidents', email: true, slack: true, sms: true, description: 'Critical AI incidents and safety alerts' },
  { event: 'Bias Alerts', email: true, slack: true, sms: false, description: 'Bias audit failures and threshold violations' },
  { event: 'Compliance Deadlines', email: true, slack: false, sms: false, description: 'Upcoming framework audit dates' },
  { event: 'Vendor Risk Changes', email: false, slack: true, sms: false, description: 'Vendor score changes and status updates' },
  { event: 'Model Drift', email: true, slack: true, sms: false, description: 'Model performance degradation alerts' },
  { event: 'Weekly Digest', email: true, slack: false, sms: false, description: 'Weekly summary of platform activity' },
];

// ── Data Retention ─────────────────────────────────────────────────────────────
interface RetentionPolicy {
  dataType: string; retention: string; description: string;
}

const RETENTION_OPTIONS = ['1 year', '2 years', '3 years', '5 years', '7 years', '10 years', 'Indefinite'];

const INITIAL_RETENTION: RetentionPolicy[] = [
  { dataType: 'Audit Logs', retention: '7 years', description: 'Immutable — regulatory requirement' },
  { dataType: 'Evidence Artifacts', retention: '5 years', description: 'Retained post-audit completion' },
  { dataType: 'Model Artifacts', retention: '3 years', description: 'Retained post-model retirement' },
  { dataType: 'Incident Records', retention: '7 years', description: 'Required for regulatory reporting' },
  { dataType: 'User Activity Logs', retention: '2 years', description: 'Security and access review purposes' },
  { dataType: 'Training Data Snapshots', retention: '5 years', description: 'Required for EU AI Act Art. 10 compliance' },
];

// ── Integrations ────────────────────────────────────────────────────────────────
interface Integration {
  id: string; name: string; description: string; connected: boolean; logo: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'drata', name: 'Drata', description: 'Continuous compliance monitoring and evidence collection', connected: true, logo: 'D' },
  { id: 'okta', name: 'Okta', description: 'SSO and identity management for user provisioning', connected: true, logo: 'O' },
  { id: 'aws', name: 'AWS', description: 'AWS SageMaker for model hosting and MLOps pipelines', connected: true, logo: 'A' },
  { id: 'jira', name: 'Jira', description: 'Issue tracking for remediation and risk management tasks', connected: false, logo: 'J' },
];

// ── Audit Trail ────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  section: string;
  field: string;
  oldValue: string;
  newValue: string;
}

const INITIAL_AUDIT_ENTRIES: AuditEntry[] = [
  { id: 'audit-1', timestamp: '2026-04-07 16:42:03', user: 'Sarah Chen', section: 'Organization', field: 'Primary Contact', oldValue: 'ops@acmefin.com', newValue: 'sarah.chen@acmefin.com' },
  { id: 'audit-2', timestamp: '2026-04-06 11:15:28', user: 'Marcus Rivera', section: 'Authentication', field: 'Session Timeout', oldValue: '4 hours', newValue: '8 hours' },
  { id: 'audit-3', timestamp: '2026-04-05 09:30:44', user: 'Sarah Chen', section: 'Data Retention', field: 'Evidence Artifacts', oldValue: '3 years', newValue: '5 years' },
  { id: 'audit-4', timestamp: '2026-04-03 14:22:11', user: 'James Okoro', section: 'Notifications', field: 'Model Drift — Slack', oldValue: 'Disabled', newValue: 'Enabled' },
  { id: 'audit-5', timestamp: '2026-04-01 10:05:37', user: 'Sarah Chen', section: 'Integrations', field: 'AWS', oldValue: 'Disconnected', newValue: 'Connected' },
  { id: 'audit-6', timestamp: '2026-03-29 08:48:19', user: 'Marcus Rivera', section: 'Authentication', field: 'SSO Provider', oldValue: 'Azure AD', newValue: 'Okta' },
];

export default function Settings() {
  const { orgName, domain, industry, companySize, primaryContact, timezone, fiscalYearStart, updateSettings } = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const [accent, setAccentState] = useState<Accent>(getStoredAccent);
  const handleAccentChange = (a: Accent) => { setAccent(a); setAccentState(a); };
  const [activeTab, setActiveTab] = useState('organization');
  const [displayPrefs, setDisplayPrefs] = useState({
    sidebarLabels: true,
    animateCharts: true,
    compactRows: false,
    showEntityIds: true,
  });

  // Org form
  const [orgForm, setOrgForm] = useState({ orgName, domain, industry, companySize, primaryContact, timezone, fiscalYearStart });
  const [orgDirty, setOrgDirty] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  const updateOrgForm = (field: string, value: string) => {
    setOrgForm(f => ({ ...f, [field]: value }));
    setOrgDirty(true);
    setOrgSaved(false);
  };
  const saveOrg = () => {
    const prev = { orgName, domain, industry, companySize, primaryContact, timezone, fiscalYearStart } as Record<string, string>;
    const labels: Record<string, string> = { orgName: 'Organization Name', domain: 'Domain', industry: 'Industry', companySize: 'Company Size', primaryContact: 'Primary Contact', timezone: 'Timezone', fiscalYearStart: 'Fiscal Year Start' };
    Object.keys(orgForm).forEach(key => {
      const k = key as keyof typeof orgForm;
      if (orgForm[k] !== prev[key]) {
        addAuditEntry('Organization', labels[key] || key, prev[key], orgForm[k]);
      }
    });
    updateSettings(orgForm);
    setOrgDirty(false);
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 3000);
  };
  const cancelOrg = () => {
    setOrgForm({ orgName, domain, industry, companySize, primaryContact, timezone, fiscalYearStart });
    setOrgDirty(false);
  };

  // Auth
  const [mfaRequired, setMfaRequired] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [ssoProvider, setSsoProvider] = useState('Okta');
  const [sessionTimeout, setSessionTimeout] = useState('8 hours');

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [genKeyOpen, setGenKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);

  const revokeKey = (id: string) => setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'Revoked' } : k));
  const generateKey = () => {
    const nk: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName || 'New API Key',
      prefix: `sk-new-${Math.random().toString(36).slice(2, 6)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: '—',
      scopes: newKeyScopes.length > 0 ? newKeyScopes : ['models:read'],
      status: 'Active',
    };
    setApiKeys(prev => [...prev, nk]);
    setNewKeyName('');
    setNewKeyScopes([]);
    setGenKeyOpen(false);
  };

  // Notifications
  const [notifs, setNotifs] = useState<NotifPref[]>(INITIAL_NOTIFS);
  const toggleNotif = (event: string, channel: 'email' | 'slack' | 'sms') => {
    setNotifs(prev => prev.map(n => n.event === event ? { ...n, [channel]: !n[channel] } : n));
  };

  // Data Retention
  const [retention, setRetention] = useState<RetentionPolicy[]>(INITIAL_RETENTION);
  const updateRetention = (dataType: string, value: string) => {
    setRetention(prev => prev.map(r => r.dataType === dataType ? { ...r, retention: value } : r));
  };

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const toggleIntegration = (id: string) => setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i));

  // Audit Trail
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(INITIAL_AUDIT_ENTRIES);
  const addAuditEntry = (section: string, field: string, oldValue: string, newValue: string) => {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'Current User',
      section,
      field,
      oldValue,
      newValue,
    };
    setAuditEntries(prev => [entry, ...prev]);
  };

  const sectionCard = (children: React.ReactNode, title?: string, icon?: React.ReactNode) => (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      {title && (
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{title}</CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className={title ? 'pt-0' : 'pt-5'}>{children}</CardContent>
    </Card>
  );

  const fieldRow = (label: string, value: string, field: string, placeholder = '') => (
    <div className="grid grid-cols-3 gap-4 items-center py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
      <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</label>
      <Input value={value} onChange={e => updateOrgForm(field, e.target.value)} className="col-span-2" style={{ borderRadius: 0 }} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Platform configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--border) / 0.3)' }}>
          {[
            { value: 'organization', label: 'Organization' },
            { value: 'authentication', label: 'Authentication' },
            { value: 'api-keys', label: 'API Keys' },
            { value: 'notifications', label: 'Notifications' },
            { value: 'data-retention', label: 'Data Retention' },
            { value: 'integrations', label: 'Integrations' },
            { value: 'appearance', label: 'Appearance' },
            { value: 'audit-trail', label: 'Audit Trail' },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} style={{ borderRadius: 0 }}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* ── ORGANIZATION ─────────────────────────────── */}
        <TabsContent value="organization" className="mt-4 space-y-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building size={16} style={{ color: 'hsl(var(--brand))' }} />
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Organization Details</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {orgDirty && <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'hsl(var(--s-wn-tx))' }}><Warning size={13} />Unsaved changes</span>}
                  {orgSaved && <span className="text-xs font-medium text-green-600 dark:text-green-400">Saved</span>}
                  {orgDirty && <Button variant="outline" size="sm" onClick={cancelOrg} style={{ borderRadius: 0, height: 30 }}><ArrowCounterClockwise size={13} className="mr-1" />Cancel</Button>}
                  <Button size="sm" onClick={saveOrg} disabled={!orgDirty} style={{ borderRadius: 0, height: 30, background: orgDirty ? 'hsl(var(--brand))' : undefined, color: orgDirty ? '#fff' : undefined }}>
                    <FloppyDisk size={13} className="mr-1" />Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {fieldRow('Organization Name', orgForm.orgName, 'orgName', 'Your org name')}
              {fieldRow('Domain', orgForm.domain, 'domain', 'company.com')}
              {fieldRow('Industry', orgForm.industry, 'industry', 'Financial Services')}
              {fieldRow('Company Size', orgForm.companySize, 'companySize', '100-500')}
              {fieldRow('Primary Contact', orgForm.primaryContact, 'primaryContact', 'admin@company.com')}
              {fieldRow('Timezone', orgForm.timezone, 'timezone', 'America/New_York')}
              <div className="grid grid-cols-3 gap-4 items-center py-3">
                <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-4))' }}>Fiscal Year Start</label>
                <Select value={orgForm.fiscalYearStart} onValueChange={v => updateOrgForm('fiscalYearStart', v)}>
                  <SelectTrigger className="col-span-2" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AUTHENTICATION ───────────────────────────── */}
        <TabsContent value="authentication" className="mt-4 space-y-4">
          {sectionCard(
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Require MFA for All Users</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Force multi-factor authentication organization-wide</p>
                </div>
                <Switch checked={mfaRequired} onCheckedChange={setMfaRequired} />
              </div>
              {!mfaRequired && (
                <div className="flex items-center gap-2 p-2 text-xs" style={{ background: 'hsl(45 93% 47% / 0.1)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0 }}>
                  <Warning size={13} />MFA is disabled. This is a security risk.
                </div>
              )}
              <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Single Sign-On (SSO)</p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Enable SAML 2.0 / OIDC SSO</p>
                </div>
                <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
              </div>
              {ssoEnabled && (
                <div className="space-y-3 pl-0">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-4))' }}>SSO Provider</label>
                    <Select value={ssoProvider} onValueChange={setSsoProvider}>
                      <SelectTrigger className="col-span-2" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        <SelectItem value="Okta">Okta</SelectItem>
                        <SelectItem value="Azure AD">Azure AD</SelectItem>
                        <SelectItem value="Google Workspace">Google Workspace</SelectItem>
                        <SelectItem value="OneLogin">OneLogin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-4))' }}>SAML Endpoint</label>
                    <Input defaultValue="https://sentinel-grc.okta.com/app/sentinel/sso/saml" className="col-span-2" style={{ borderRadius: 0 }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 items-center py-3">
                <label className="text-sm font-medium" style={{ color: 'hsl(var(--text-4))' }}>Session Timeout</label>
                <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                  <SelectTrigger className="col-span-2" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['1 hour', '4 hours', '8 hours', '24 hours', '7 days'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>,
            'Authentication Settings', <Lock size={16} style={{ color: 'hsl(var(--brand))' }} />
          )}
        </TabsContent>

        {/* ── API KEYS ────────────────────────────────── */}
        <TabsContent value="api-keys" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setGenKeyOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
              <Plus size={14} className="mr-2" weight="bold" />Generate New Key
            </Button>
          </div>

          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Name', 'Key', 'Scopes', 'Created', 'Last Used', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-sm" style={{ color: 'hsl(var(--text-1))' }}>{k.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                            {showKey[k.id] ? `${k.prefix}••••••••` : `${k.prefix.slice(0, 4)}••••••••••`}
                          </code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowKey(s => ({ ...s, [k.id]: !s[k.id] }))}>
                            {showKey[k.id] ? <EyeSlash size={12} /> : <Eye size={12} />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigator.clipboard?.writeText(k.prefix)}>
                            <Copy size={12} />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.slice(0, 2).map(s => (
                            <Badge key={s} style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10 }}>{s}</Badge>
                          ))}
                          {k.scopes.length > 2 && <Badge style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-4))', borderRadius: 0, fontSize: 10 }}>+{k.scopes.length - 2}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{k.created}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{k.lastUsed}</td>
                      <td className="px-4 py-3">
                        <Badge style={{
                          background: k.status === 'Active' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(var(--border) / 0.5)',
                          color: k.status === 'Active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                          borderRadius: 0, fontSize: 11
                        }}>{k.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {k.status === 'Active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">Revoke</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                <AlertDialogDescription>Revoke "{k.name}"? Any applications using this key will immediately lose access. This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeKey(k.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Revoke</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Generate Key Dialog */}
          <Dialog open={genKeyOpen} onOpenChange={setGenKeyOpen}>
            <DialogContent style={{ borderRadius: 0 }}>
              <DialogHeader><DialogTitle>Generate New API Key</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Key Name</label>
                  <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Production Monitoring" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-2" style={{ color: 'hsl(var(--text-4))' }}>Scopes</label>
                  {['models:read', 'models:write', 'risks:read', 'guardrails:read', 'guardrails:write', 'audit:read'].map(scope => (
                    <div key={scope} className="flex items-center gap-2 mb-2">
                      <input type="checkbox" id={scope} checked={newKeyScopes.includes(scope)}
                        onChange={e => setNewKeyScopes(prev => e.target.checked ? [...prev, scope] : prev.filter(s => s !== scope))}
                        style={{ accentColor: 'hsl(var(--brand))', borderRadius: 0 }} />
                      <label htmlFor={scope} className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>{scope}</label>
                    </div>
                  ))}
                </div>
                <div className="p-2 text-xs" style={{ background: 'hsl(45 93% 47% / 0.1)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0 }}>
                  <Warning size={12} className="inline mr-1" />The key will only be shown once. Copy and store it securely.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenKeyOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
                <Button onClick={generateKey} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Generate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── NOTIFICATIONS ────────────────────────────── */}
        <TabsContent value="notifications" className="mt-4">
          {sectionCard(
            <div>
              <div className="grid grid-cols-4 gap-4 pb-2 mb-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Event Type</div>
                <div className="text-xs font-semibold text-center" style={{ color: 'hsl(var(--text-4))' }}>Email</div>
                <div className="text-xs font-semibold text-center" style={{ color: 'hsl(var(--text-4))' }}>Slack</div>
                <div className="text-xs font-semibold text-center" style={{ color: 'hsl(var(--text-4))' }}>SMS</div>
              </div>
              {notifs.map(n => (
                <div key={n.event} className="grid grid-cols-4 gap-4 items-center py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{n.event}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{n.description}</p>
                  </div>
                  <div className="flex justify-center"><Switch checked={n.email} onCheckedChange={() => toggleNotif(n.event, 'email')} /></div>
                  <div className="flex justify-center"><Switch checked={n.slack} onCheckedChange={() => toggleNotif(n.event, 'slack')} /></div>
                  <div className="flex justify-center"><Switch checked={n.sms} onCheckedChange={() => toggleNotif(n.event, 'sms')} /></div>
                </div>
              ))}
            </div>,
            'Notification Preferences', <Bell size={16} style={{ color: 'hsl(var(--brand))' }} />
          )}
        </TabsContent>

        {/* ── DATA RETENTION ───────────────────────────── */}
        <TabsContent value="data-retention" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Database size={16} style={{ color: 'hsl(var(--brand))' }} />
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Data Retention Policies</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0">
                {retention.map(r => (
                  <div key={r.dataType} className="grid grid-cols-3 gap-4 items-center py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.dataType}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{r.description}</p>
                    </div>
                    <Select value={r.retention} onValueChange={v => updateRetention(r.dataType, v)}>
                      <SelectTrigger style={{ borderRadius: 0, height: 34 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        {RETENTION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Badge style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 11, justifySelf: 'start' }}>
                      {r.retention}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INTEGRATIONS ─────────────────────────────── */}
        <TabsContent value="integrations" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map(intg => (
              <Card key={intg.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center text-base font-bold" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0 }}>
                        {intg.logo}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'hsl(var(--text-1))' }}>{intg.name}</p>
                        <Badge style={{
                          background: intg.connected ? 'hsl(142 71% 45% / 0.15)' : 'hsl(var(--border) / 0.5)',
                          color: intg.connected ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                          borderRadius: 0, fontSize: 10, marginTop: 2
                        }}>
                          {intg.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant={intg.connected ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleIntegration(intg.id)}
                      style={{ borderRadius: 0, height: 30, background: intg.connected ? undefined : 'hsl(var(--brand))', color: intg.connected ? undefined : '#fff' }}
                    >
                      {intg.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                  <p className="text-xs mt-3" style={{ color: 'hsl(var(--text-4))' }}>{intg.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── APPEARANCE ─────────────────────────────── */}
        <TabsContent value="appearance" className="mt-4 space-y-6">
          {/* Theme Selection */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                <PaintBrush size={16} style={{ color: 'hsl(var(--brand))' }} />
                Theme
              </CardTitle>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Choose how the Sentinel AI platform looks. "System" follows your OS preference.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: 'dark' as const,
                    label: 'Dark',
                    description: 'Optimised for low-light environments and extended use.',
                    icon: Moon,
                    preview: { bg: '#0f172a', sidebar: '#1e293b', card: '#1e293b', text: '#f1f5f9', accent: '#22c55e' },
                  },
                  {
                    value: 'light' as const,
                    label: 'Light',
                    description: 'Clean, bright interface for well-lit workspaces.',
                    icon: Sun,
                    preview: { bg: '#f8fafc', sidebar: '#f1f5f9', card: '#ffffff', text: '#0f172a', accent: '#16a34a' },
                  },
                  {
                    value: 'system' as const,
                    label: 'System',
                    description: 'Automatically matches your operating system setting.',
                    icon: Desktop,
                    preview: { bg: '#e2e8f0', sidebar: '#cbd5e1', card: '#f8fafc', text: '#334155', accent: '#22c55e' },
                  },
                ].map(opt => {
                  const Icon = opt.icon;
                  const selected = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      style={{
                        borderRadius: 0,
                        border: selected ? '2px solid hsl(var(--brand))' : '2px solid hsl(var(--border))',
                        background: selected ? 'hsl(var(--brand) / 0.06)' : 'hsl(var(--bg-muted))',
                        padding: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {/* Mini UI preview */}
                      <div style={{ background: opt.preview.bg, height: 100, position: 'relative', display: 'flex', gap: 4, padding: 8 }}>
                        <div style={{ width: 28, background: opt.preview.sidebar, borderRadius: 2, flexShrink: 0 }}>
                          {[0,1,2,3,4].map(i => (
                            <div key={i} style={{ height: 6, margin: '4px 4px', background: i === 1 ? opt.preview.accent : opt.preview.text, opacity: i === 1 ? 0.8 : 0.2, borderRadius: 1 }} />
                          ))}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ height: 10, background: opt.preview.card, borderRadius: 2, border: `1px solid ${opt.preview.text}20` }} />
                          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {[0,1,2,3].map(i => (
                              <div key={i} style={{ background: opt.preview.card, borderRadius: 2, border: `1px solid ${opt.preview.text}15`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 3 }}>
                                <div style={{ height: 4 + (i % 3) * 4, background: opt.preview.accent, borderRadius: 1, opacity: 0.7 }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        {selected && (
                          <div style={{ position: 'absolute', top: 6, right: 6, background: 'hsl(var(--brand))', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={12} weight="fill" style={{ color: '#fff' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '10px 12px', borderTop: `1px solid ${selected ? 'hsl(var(--brand) / 0.3)' : 'hsl(var(--border))'}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} style={{ color: selected ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }} />
                          <span className="text-sm font-semibold" style={{ color: selected ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>{opt.label}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Accent Color */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Accent Color</CardTitle>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Sets the brand color used for buttons, links, active indicators, and chart series across the platform.</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {([
                  { key: 'emerald' as Accent, label: 'Emerald', color: 'hsl(142 47% 44%)' },
                  { key: 'blue' as Accent, label: 'Blue', color: 'hsl(217 91% 56%)' },
                  { key: 'purple' as Accent, label: 'Purple', color: 'hsl(263 70% 58%)' },
                  { key: 'teal' as Accent, label: 'Teal', color: 'hsl(174 72% 40%)' },
                  { key: 'orange' as Accent, label: 'Orange', color: 'hsl(25 95% 52%)' },
                  { key: 'rose' as Accent, label: 'Rose', color: 'hsl(346 77% 50%)' },
                ]).map(sw => {
                  const isActive = accent === sw.key;
                  return (
                    <button
                      key={sw.key}
                      onClick={() => handleAccentChange(sw.key)}
                      title={sw.label}
                      aria-label={`Set accent to ${sw.label}`}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 36, height: 36,
                          background: sw.color,
                          border: isActive ? '3px solid hsl(var(--text-1))' : '3px solid transparent',
                          outline: isActive ? '1px solid hsl(var(--text-4))' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isActive && <CheckCircle size={16} weight="fill" style={{ color: '#fff' }} />}
                      </div>
                      <span className="text-xs" style={{ color: isActive ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>{sw.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Density / Display Options */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Display Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {([
                { key: 'sidebarLabels' as const, label: 'Show sidebar section labels', description: 'Display category headers (OVERVIEW, AI GOVERNANCE, etc.) in the navigation sidebar' },
                { key: 'animateCharts' as const, label: 'Animate chart transitions', description: 'Enable smooth entry animations on recharts graphs and dashboard tiles' },
                { key: 'compactRows' as const, label: 'Compact table rows', description: 'Reduce vertical padding in data tables for higher information density' },
                { key: 'showEntityIds' as const, label: 'Show entity IDs', description: 'Display short IDs (e.g. MDL-001, RSK-004) inline with entity names throughout the UI' },
              ]).map(pref => (
                <div key={pref.key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{pref.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{pref.description}</p>
                  </div>
                  <Switch
                    checked={displayPrefs[pref.key]}
                    onCheckedChange={v => setDisplayPrefs(prev => ({ ...prev, [pref.key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-trail" className="mt-4 space-y-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClockCounterClockwise size={16} style={{ color: 'hsl(var(--brand))' }} />
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Config Change Audit Trail</CardTitle>
                </div>
                <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))', borderRadius: 0, fontSize: 11 }}>
                  {auditEntries.length} entries
                </Badge>
              </div>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                Immutable log of all configuration changes. Entries cannot be modified or deleted.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Timestamp', 'User', 'Section Changed', 'Field', 'Old Value', 'New Value'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{entry.timestamp}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'hsl(var(--text-1))' }}>
                        <div className="flex items-center gap-1.5">
                          <User size={13} style={{ color: 'hsl(var(--text-4))' }} />
                          {entry.user}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 11 }}>
                          {entry.section}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.field}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 font-mono" style={{ background: 'hsl(0 70% 50% / 0.1)', color: 'hsl(var(--text-3))', borderRadius: 0 }}>
                          {entry.oldValue}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 font-mono" style={{ background: 'hsl(142 71% 45% / 0.1)', color: 'hsl(var(--text-3))', borderRadius: 0 }}>
                          {entry.newValue}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <ClockCounterClockwise size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No configuration changes recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
