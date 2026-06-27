import { useState } from 'react';
import { Database, UploadSimple, FileCode, CheckCircle, ArrowRight, Table, FileCsv } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const SOURCES = [
  { id: 'csv', name: 'Upload CSV/JSON', icon: FileCsv, desc: 'Upload a local file up to 50MB' },
  { id: 's3', name: 'AWS S3 Bucket', icon: Database, desc: 'Connect to an existing S3 bucket' },
  { id: 'snowflake', name: 'Snowflake', icon: Database, desc: 'Query data from your warehouse' },
  { id: 'synthetic', name: 'Synthetic Generation', icon: FileCode, desc: 'Generate test cases via LLM' },
];

export default function DatasetCreateModal() {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState('csv');
  const [datasetName, setDatasetName] = useState('');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden" style={{ background: 'hsl(var(--bg-main))' }}>
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Create New Dataset</h1>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Configure a golden dataset for evaluation runs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold mr-6" style={{ color: 'hsl(var(--text-4))' }}>
            <span style={{ color: step >= 1 ? 'hsl(var(--brand))' : 'inherit' }}>1. Source</span>
            <ArrowRight size={12} />
            <span style={{ color: step >= 2 ? 'hsl(var(--brand))' : 'inherit' }}>2. Schema</span>
            <ArrowRight size={12} />
            <span style={{ color: step >= 3 ? 'hsl(var(--brand))' : 'inherit' }}>3. Preview</span>
          </div>
          <Button variant="ghost" size="sm" style={{ borderRadius: 0 }}>Cancel</Button>
          {step < 3 ? (
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={() => setStep(step + 1)}>
              Next Step
            </Button>
          ) : (
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(142 71% 45%)', color: '#fff' }}>
              Create Dataset
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-3xl">
          
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Dataset Name</label>
                <Input 
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g., Q4 Customer Support Tickets" 
                  className="w-full max-w-md bg-surface border-[hsl(var(--border))]" 
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Select Data Source</label>
                <div className="grid grid-cols-2 gap-4">
                  {SOURCES.map(source => (
                    <Card 
                      key={source.id}
                      onClick={() => setSelectedSource(source.id)}
                      className="cursor-pointer transition-colors border-2"
                      style={{ 
                        background: 'hsl(var(--bg-surface))',
                        borderRadius: 0,
                        borderColor: selectedSource === source.id ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                        boxShadow: selectedSource === source.id ? '0 0 0 1px hsl(var(--brand))' : 'none'
                      }}
                    >
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ 
                          background: selectedSource === source.id ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-muted))',
                          color: selectedSource === source.id ? 'hsl(var(--brand))' : 'hsl(var(--text-3))'
                        }}>
                          <source.icon size={20} weight={selectedSource === source.id ? "duotone" : "regular"} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>{source.name}</h3>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{source.desc}</p>
                        </div>
                        {selectedSource === source.id && (
                          <CheckCircle size={20} weight="fill" className="ml-auto shrink-0" style={{ color: 'hsl(var(--brand))' }} />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedSource === 'csv' && (
                <div className="mt-8 p-12 border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center text-center bg-surface">
                  <UploadSimple size={48} style={{ color: 'hsl(var(--text-4))' }} className="mb-4" />
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Drag & Drop your file</h3>
                  <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-3))' }}>Supports CSV, JSONL up to 50MB</p>
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>Browse Files</Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 border border-[hsl(var(--border))] bg-surface">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Schema Mapping</h3>
                <p className="text-xs mb-6" style={{ color: 'hsl(var(--text-3))' }}>Map your dataset columns to the required evaluation schema.</p>
                
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-2 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Eval Field</th>
                      <th className="pb-2 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Dataset Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    <tr>
                      <td className="py-4"><span className="font-mono text-xs bg-[hsl(var(--bg-muted))] px-2 py-1">input</span> <span className="text-red-500">*</span></td>
                      <td className="py-4">
                        <select className="w-full p-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] text-xs focus:outline-none focus:border-[hsl(var(--brand))]">
                          <option>user_query</option>
                          <option>transcript</option>
                          <option>ticket_body</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4"><span className="font-mono text-xs bg-[hsl(var(--bg-muted))] px-2 py-1">expected_output</span></td>
                      <td className="py-4">
                        <select className="w-full p-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] text-xs focus:outline-none focus:border-[hsl(var(--brand))]">
                          <option>ground_truth_answer</option>
                          <option>resolution</option>
                          <option>-- Ignore --</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4"><span className="font-mono text-xs bg-[hsl(var(--bg-muted))] px-2 py-1">metadata</span></td>
                      <td className="py-4 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        All remaining columns will be imported as metadata.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Data Preview</h3>
                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Showing 3 of 1,204 rows</span>
              </div>
              
              <div className="border border-[hsl(var(--border))] bg-surface overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      <th className="p-3 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>input</th>
                      <th className="p-3 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>expected_output</th>
                      <th className="p-3 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>metadata.category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    <tr>
                      <td className="p-3 font-mono text-[10px]" style={{ color: 'hsl(var(--text-1))' }}>How do I cancel my subscription?</td>
                      <td className="p-3 font-mono text-[10px]" style={{ color: 'hsl(var(--text-1))' }}>Navigate to Settings &gt; Billing...</td>
                      <td className="p-3" style={{ color: 'hsl(var(--text-3))' }}>billing</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[10px]" style={{ color: 'hsl(var(--text-1))' }}>Where is my refund?</td>
                      <td className="p-3 font-mono text-[10px]" style={{ color: 'hsl(var(--text-1))' }}>Refunds typically process in 3-5 days.</td>
                      <td className="p-3" style={{ color: 'hsl(var(--text-3))' }}>support</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-[10px]" style={{ color: 'hsl(var(--text-1))' }}>Upgrade to Pro plan</td>
                      <td className="p-3 font-mono text-[10px]" style={{ color: 'hsl(var(--text-1))' }}>Click the 'Upgrade' button on your dash...</td>
                      <td className="p-3" style={{ color: 'hsl(var(--text-3))' }}>sales</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
