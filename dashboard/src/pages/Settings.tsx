import { useState } from 'react';
import { Building, Globe, Shield, Key, Bell, Database, Plug, FloppyDisk, Plus, Copy, Eye, EyeSlash, ArrowCounterClockwise, Trash, CheckCircle, XCircle, Warning, Lock, User } from '@phosphor-icons/react';
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

export default function Settings() {
  const { orgName, domain, industry, companySize, primaryContact, timezone, fiscalYearStart, updateSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('organization');

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
                  {orgDirty && <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'hsl(45 93% 47%)' }}><Warning size={13} />Unsaved changes</span>}
                  {orgSaved && <span className="text-xs font-medium" style={{ color: 'hsl(142 71% 45%)' }}>Saved</span>}
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
                <div className="flex items-center gap-2 p-2 text-xs" style={{ background: 'hsl(45 93% 47% / 0.1)', color: 'hsl(45 93% 47%)', borderRadius: 0 }}>
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
                          color: k.status === 'Active' ? 'hsl(142 71% 45%)' : 'hsl(var(--text-4))',
                          borderRadius: 0, fontSize: 11
                        }}>{k.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {k.status === 'Active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" style={{ color: 'hsl(0 72% 51%)' }}>Revoke</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ borderRadius: 0 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                                <AlertDialogDescription>Revoke "{k.name}"? Any applications using this key will immediately lose access. This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeKey(k.id)} style={{ borderRadius: 0, background: 'hsl(0 72% 51%)' }}>Revoke</AlertDialogAction>
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
                <div className="p-2 text-xs" style={{ background: 'hsl(45 93% 47% / 0.1)', color: 'hsl(45 93% 47%)', borderRadius: 0 }}>
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
                          color: intg.connected ? 'hsl(142 71% 45%)' : 'hsl(var(--text-4))',
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
      </Tabs>
    </div>
  );
}
