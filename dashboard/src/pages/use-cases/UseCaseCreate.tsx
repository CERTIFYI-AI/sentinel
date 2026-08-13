import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { CheckCircle } from '@phosphor-icons/react';
import { useUseCases, useModelOptions } from '@/hooks/useAiiaData';
import { RISK_CLASS_OPTIONS, type UseCase, type UseCaseRiskClass } from '@/services/useCaseService';

const FRAMEWORKS = ['EU AI Act', 'ISO 42001', 'ISO 27001', 'NIST AI RMF'];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'active', label: 'Active' },
  { value: 'approved', label: 'Approved' },
  { value: 'retired', label: 'Retired' },
];

interface FormErrors { title?: string; owner?: string; riskClass?: string }

export default function UseCaseCreate() {
  const navigate = useNavigate();
  const { create } = useUseCases();
  const { models } = useModelOptions();

  const [formData, setFormData] = useState({
    title: '', goal: '', owner: '', startDate: '',
    riskClass: '', role: '', geography: '', industry: '',
    description: '', members: '', status: 'draft', approvalWorkflow: '',
    frameworks: [] as string[],
    linkedModelIds: [] as string[],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field in errors) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const toggleIn = (field: 'frameworks' | 'linkedModelIds', v: string) => {
    setFormData(prev => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
    });
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!formData.title.trim()) next.title = 'Title is required.';
    if (!formData.owner.trim()) next.owner = 'Owner is required.';
    if (!formData.riskClass) next.riskClass = 'Risk classification is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Partial<UseCase> = {
      title: formData.title.trim(),
      owner: formData.owner.trim(),
      status: formData.status,
      approvalWorkflow: formData.approvalWorkflow || 'standard',
      riskClass: formData.riskClass as UseCaseRiskClass,
      highRiskRole: formData.role || null,
      teamMembers: formData.members.split(',').map(s => s.trim()).filter(Boolean),
      startDate: formData.startDate || null,
      geography: formData.geography || null,
      regulations: formData.frameworks,
      goal: formData.goal.trim() || null,
      industry: formData.industry || null,
      description: formData.description.trim() || null,
      linkedModelIds: formData.linkedModelIds,
    };

    try {
      const created = await create.mutateAsync(payload);
      toast.success('Use case created successfully.');
      navigate('/use-cases/' + created.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const errClass = 'text-xs text-[hsl(var(--s-er-tx))] mt-1';

  return (
    <div className="space-y-4 pb-12">
      <PageHeader
        title="Create Use Case"
        subtitle="Scope and initialize a new AI system"
        breadcrumbs={[{ label: 'AI Governance' }, { label: 'Use Cases', href: '/use-cases' }, { label: 'New' }]}
        onBack={() => navigate('/use-cases')}
      />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-5xl">
        <Card style={{ borderRadius: 0 }}>
          <CardContent className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Required Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Title <span className="text-[hsl(var(--s-er-tx))]">*</span></Label>
                  <Input maxLength={64} placeholder="e.g. Resume Screening Automation" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
                  {errors.title && <p className={errClass}>{errors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Owner <span className="text-[hsl(var(--s-er-tx))]">*</span></Label>
                  <Input placeholder="Assignee email or name" value={formData.owner} onChange={e => handleChange('owner', e.target.value)} />
                  {errors.owner && <p className={errClass}>{errors.owner}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Goal</Label>
                  <Textarea maxLength={256} placeholder="What is the AI system supposed to accomplish?" value={formData.goal} onChange={e => handleChange('goal', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>AI Risk Classification <span className="text-[hsl(var(--s-er-tx))]">*</span></Label>
                  <Select value={formData.riskClass} onValueChange={v => handleChange('riskClass', v)}>
                    <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                    <SelectContent>
                      {RISK_CLASS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.riskClass && <p className={errClass}>{errors.riskClass}</p>}
                </div>
                <div className="space-y-2">
                  <Label>High Risk Role</Label>
                  <Select value={formData.role} onValueChange={v => handleChange('role', v)}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Deployer">Deployer</SelectItem>
                      <SelectItem value="Provider">Provider</SelectItem>
                      <SelectItem value="Distributor">Distributor</SelectItem>
                      <SelectItem value="Importer">Importer</SelectItem>
                      <SelectItem value="Product manufacturer">Product manufacturer</SelectItem>
                      <SelectItem value="Authorized representative">Authorized representative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Geography</Label>
                  <Select value={formData.geography} onValueChange={v => handleChange('geography', v)}>
                    <SelectTrigger><SelectValue placeholder="Select geography" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Global">Global</SelectItem>
                      <SelectItem value="Europe">Europe</SelectItem>
                      <SelectItem value="North America">North America</SelectItem>
                      <SelectItem value="South America">South America</SelectItem>
                      <SelectItem value="Asia">Asia</SelectItem>
                      <SelectItem value="Africa">Africa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Industry</Label>
                  <Input placeholder="e.g. Financial Services" value={formData.industry} onChange={e => handleChange('industry', e.target.value)} />
                </div>
              </div>
            </div>

            <hr className="border-[hsl(var(--border))] my-6" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Optional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea placeholder="A longer explanation of the system and how it works" value={formData.description} onChange={e => handleChange('description', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Team Members</Label>
                  <Input placeholder="Comma separated emails" value={formData.members} onChange={e => handleChange('members', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Approval Workflow</Label>
                  <Select value={formData.approvalWorkflow} onValueChange={v => handleChange('approvalWorkflow', v)}>
                    <SelectTrigger><SelectValue placeholder="Select workflow (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Review</SelectItem>
                      <SelectItem value="executive">Executive Sign-off</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <hr className="border-[hsl(var(--border))] my-6" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Link Models</h3>
              <p className="text-sm text-[hsl(var(--text-3))] mb-4">Interlink registry models governed by this use case.</p>
              {models.length === 0 ? (
                <p className="text-sm text-[hsl(var(--text-4))]">No models available in the registry to link.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {models.map(m => (
                    <label key={m.id} className="flex items-center gap-3 p-4 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))] transition-colors">
                      <Checkbox
                        checked={formData.linkedModelIds.includes(m.id)}
                        onCheckedChange={() => toggleIn('linkedModelIds', m.id)}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium block truncate">{m.name}</span>
                        {m.riskTier && <span className="text-xs text-[hsl(var(--text-4))] block">{m.riskTier} risk</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-[hsl(var(--border))] my-6" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Applicable Regulations</h3>
              <p className="text-sm text-[hsl(var(--text-3))] mb-4">Select the compliance frameworks that apply to this use case.</p>
              <div className="grid grid-cols-2 gap-4">
                {FRAMEWORKS.map(fw => (
                  <label key={fw} className="flex items-center gap-3 p-4 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))] transition-colors">
                    <Checkbox
                      checked={formData.frameworks.includes(fw)}
                      onCheckedChange={() => toggleIn('frameworks', fw)}
                    />
                    <span className="text-sm font-medium">{fw}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/use-cases')} style={{ borderRadius: 0 }}>Cancel</Button>
          <Button type="submit" loading={create.isPending} disabled={create.isPending} style={{ borderRadius: 0 }}>
            <CheckCircle size={16} />
            {create.isPending ? 'Creating…' : 'Create Use Case'}
          </Button>
        </div>
      </form>
    </div>
  );
}
