import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PolicyTemplateLibrary } from '@/components/policies/PolicyTemplateLibrary';
import { ComplianceDashboard } from '@/components/policies/ComplianceDashboard';
import { PolicyWorkflow } from '@/components/policies/PolicyWorkflow';
import { usePolicies, useTemplates, useComplianceScore } from '@/lib/hooks/usePolicies';
import type { PolicyTemplate, Framework } from '@/lib/types/policy';
import { FRAMEWORKS } from '@/lib/types/policy';

export default function PolicyManagement() {
  const [activeTab, setActiveTab] = useState('templates');
  const { templates, loading: templatesLoading } = useTemplates();
  const { policies, loading: policiesLoading } = usePolicies();
  const { scores, loading: scoresLoading } = useComplianceScore();

  const handleInstantiate = (template: PolicyTemplate) => {
    console.log('Instantiating template:', template.id, template.name);
  };

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Policy Management</h1>
          <p className='text-muted-foreground'>Manage compliance policies across 11 frameworks with 70+ templates</p>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value='templates'>Template Library ({templates.length})</TabsTrigger>
          <TabsTrigger value='policies'>Active Policies ({policies.length})</TabsTrigger>
          <TabsTrigger value='compliance'>Compliance Dashboard</TabsTrigger>
          <TabsTrigger value='workflow'>Workflow</TabsTrigger>
        </TabsList>
        <TabsContent value='templates'>
          <PolicyTemplateLibrary templates={templates} onInstantiate={handleInstantiate} loading={templatesLoading} />
        </TabsContent>
        <TabsContent value='policies'>
          <div className='text-muted-foreground p-8 text-center'>Active policies will appear here once templates are instantiated.</div>
        </TabsContent>
        <TabsContent value='compliance'>
          <ComplianceDashboard scores={scores} loading={scoresLoading} />
        </TabsContent>
        <TabsContent value='workflow'>
          <PolicyWorkflow currentStatus='draft' />
        </TabsContent>
      </Tabs>
    </div>
  );
}
