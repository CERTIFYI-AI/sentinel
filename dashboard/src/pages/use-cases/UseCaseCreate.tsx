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
import { ArrowLeft, CheckCircle } from '@phosphor-icons/react';

const FRAMEWORKS = ['EU AI Act', 'ISO 42001', 'ISO 27001', 'NIST AI RMF'];

export default function UseCaseCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '', goal: '', owner: '', startDate: '',
    riskClass: '', role: '', geography: '', industry: '',
    description: '', members: '', status: 'Not Started', approvalWorkflow: '',
    aiEnvironment: '', technologyType: '', novelTechnology: false,
    personalData: false, monitoring: false, unintendedOutcomes: '',
    frameworks: [] as string[]
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleFramework = (fw: string) => {
    setFormData(prev => {
      const isSelected = prev.frameworks.includes(fw);
      return {
        ...prev,
        frameworks: isSelected ? prev.frameworks.filter(f => f !== fw) : [...prev.frameworks, fw]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.goal || !formData.owner || !formData.riskClass || !formData.role) {
      toast.error('Please fill in all required fields.');
      return;
    }
    toast.success('Use Case created successfully!');
    // Mock navigating to the new ID
    navigate('/use-cases/UC-999');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/use-cases')} style={{ padding: '0 8px' }}>
          <ArrowLeft size={16} />
        </Button>
        <PageHeader
          title="Create Use Case"
          subtitle="Scope and initialize a new AI system"
          breadcrumbs={[{ label: 'AI Governance' }, { label: 'Use Cases', href: '/use-cases' }, { label: 'New' }]}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card style={{ borderRadius: 0 }}>
          <CardContent className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Required Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Title <span className="text-red-500">*</span></Label>
                  <Input maxLength={64} placeholder="e.g. Resume Screening Automation" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Owner <span className="text-red-500">*</span></Label>
                  <Input placeholder="Assignee email or name" value={formData.owner} onChange={e => handleChange('owner', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Goal <span className="text-red-500">*</span></Label>
                  <Textarea maxLength={256} placeholder="What is the AI system supposed to accomplish?" value={formData.goal} onChange={e => handleChange('goal', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>AI Risk Classification <span className="text-red-500">*</span></Label>
                  <Select value={formData.riskClass} onValueChange={v => handleChange('riskClass', v)}>
                    <SelectTrigger><SelectValue placeholder="Select classification" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prohibited">Prohibited</SelectItem>
                      <SelectItem value="High risk">High risk</SelectItem>
                      <SelectItem value="Limited risk">Limited risk</SelectItem>
                      <SelectItem value="Minimal risk">Minimal risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type of High Risk Role <span className="text-red-500">*</span></Label>
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
                  <Label>Geography <span className="text-red-500">*</span></Label>
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
                  <Label>Target Industry <span className="text-red-500">*</span></Label>
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
                  <Label>Members</Label>
                  <Input placeholder="Comma separated emails" value={formData.members} onChange={e => handleChange('members', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Approval Workflow</Label>
                  <Select value={formData.approvalWorkflow} onValueChange={v => handleChange('approvalWorkflow', v)}>
                    <SelectTrigger><SelectValue placeholder="Select workflow (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard Review">Standard Review</SelectItem>
                      <SelectItem value="Executive Sign-off">Executive Sign-off</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">Frameworks won't be created until the use case is approved.</p>
                </div>
              </div>
            </div>

            <hr className="border-[hsl(var(--border))] my-6" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Defining Scope</h3>
              <p className="text-sm text-[hsl(var(--text-3))] mb-4">Detail the technical and compliance profile of the AI system.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>AI Environment</Label>
                  <Select value={formData.aiEnvironment} onValueChange={v => handleChange('aiEnvironment', v)}>
                    <SelectTrigger><SelectValue placeholder="Where the system runs" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cloud (AWS)">Cloud (AWS)</SelectItem>
                      <SelectItem value="Cloud (Azure)">Cloud (Azure)</SelectItem>
                      <SelectItem value="Cloud (GCP)">Cloud (GCP)</SelectItem>
                      <SelectItem value="On-Premise">On-Premise</SelectItem>
                      <SelectItem value="Hybrid Cloud">Hybrid Cloud</SelectItem>
                      <SelectItem value="Edge / Device">Edge / Device</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Technology Type</Label>
                  <Input placeholder="e.g. NLP, Computer Vision, Generative AI" value={formData.technologyType} onChange={e => handleChange('technologyType', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <label className="flex items-center gap-3 p-4 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))] transition-colors">
                  <Checkbox checked={formData.novelTechnology} onCheckedChange={c => handleChange('novelTechnology', !!c)} />
                  <div className="space-y-1">
                    <span className="text-sm font-medium block">Novel Technology</span>
                    <span className="text-xs text-[hsl(var(--text-4))] block">Uses experimental or unproven AI techniques</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))] transition-colors">
                  <Checkbox checked={formData.personalData} onCheckedChange={c => handleChange('personalData', !!c)} />
                  <div className="space-y-1">
                    <span className="text-sm font-medium block">Personal Data</span>
                    <span className="text-xs text-[hsl(var(--text-4))] block">Processes PII or sensitive individual data</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))] transition-colors">
                  <Checkbox checked={formData.monitoring} onCheckedChange={c => handleChange('monitoring', !!c)} />
                  <div className="space-y-1">
                    <span className="text-sm font-medium block">Active Monitoring</span>
                    <span className="text-xs text-[hsl(var(--text-4))] block">Post-deployment monitoring is configured</span>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <Label>Unintended Outcomes</Label>
                <Textarea placeholder="Describe any adverse effects or unintended consequences spotted during scoping" value={formData.unintendedOutcomes} onChange={e => handleChange('unintendedOutcomes', e.target.value)} />
              </div>
            </div>

            <hr className="border-[hsl(var(--border))] my-6" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[hsl(var(--text-3))] mb-4">Attach Frameworks</h3>
              <p className="text-sm text-[hsl(var(--text-3))] mb-4">Select the compliance frameworks that apply to this use case.</p>
              <div className="grid grid-cols-2 gap-4">
                {FRAMEWORKS.map(fw => (
                  <label key={fw} className="flex items-center gap-3 p-4 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-muted))] transition-colors">
                    <Checkbox
                      checked={formData.frameworks.includes(fw)}
                      onCheckedChange={() => handleToggleFramework(fw)}
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
          <Button type="submit" style={{ borderRadius: 0 }}>
            <CheckCircle size={16} />
            Create Use Case
          </Button>
        </div>
      </form>
    </div>
  );
}
