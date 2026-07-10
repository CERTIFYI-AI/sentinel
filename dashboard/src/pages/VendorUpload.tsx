import { useState, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CloudArrowUp, FileText, CheckCircle, Warning, X, Eye, Clock, MagnifyingGlass, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'


interface UploadSubmission {
  id: string
  vendor: string
  type: 'AIBOM' | 'SOC2' | 'ISO Cert' | 'Penetration Test' | 'Data Processing Agreement' | 'Security Questionnaire' | 'Model Card'
  filename: string
  uploadedBy: string
  uploadedDate: string
  size: string
  status: 'Pending Review' | 'Accepted' | 'Rejected' | 'Under Review'
  reviewedBy?: string
  reviewNotes?: string
  expiryDate?: string
}

const SEED: UploadSubmission[] = [
  { id: 'VUP-001', vendor: 'OpenAI', type: 'SOC2', filename: 'OpenAI_SOC2_TypeII_2025.pdf', uploadedBy: 'vendor@openai.com', uploadedDate: '2026-04-05', size: '3.2 MB', status: 'Accepted', reviewedBy: 'Sarah Chen', reviewNotes: 'SOC 2 Type II valid until Dec 2026. All trust service criteria reviewed.', expiryDate: '2026-12-31' },
  { id: 'VUP-002', vendor: 'Anthropic', type: 'Security Questionnaire', filename: 'Anthropic_VendorSecQ_2026.xlsx', uploadedBy: 'security@anthropic.com', uploadedDate: '2026-04-08', size: '1.1 MB', status: 'Under Review', reviewedBy: 'Marcus Johnson' },
  { id: 'VUP-003', vendor: 'Hugging Face', type: 'AIBOM', filename: 'HF_AIBOM_mistral7b.cdx.json', uploadedBy: 'compliance@huggingface.co', uploadedDate: '2026-04-09', size: '245 KB', status: 'Pending Review' },
  { id: 'VUP-004', vendor: 'AWS', type: 'Data Processing Agreement', filename: 'AWS_DPA_GDPR_2026.pdf', uploadedBy: 'aws-legal@amazon.com', uploadedDate: '2026-03-28', size: '892 KB', status: 'Accepted', reviewedBy: 'Maria Santos', reviewNotes: 'DPA reviewed by legal. GDPR Article 28 compliant. SCCs included.', expiryDate: '2028-03-28' },
  { id: 'VUP-005', vendor: 'Experian', type: 'Penetration Test', filename: 'Experian_PenTest_2025-Q4.pdf', uploadedBy: 'security@experian.com', uploadedDate: '2026-01-15', size: '4.7 MB', status: 'Accepted', reviewedBy: 'Sarah Chen', reviewNotes: 'External pentest by NCC Group. 0 critical, 2 high findings (remediated).', expiryDate: '2026-07-15' },
  { id: 'VUP-006', vendor: 'Microsoft Azure', type: 'ISO Cert', filename: 'Azure_ISO27001_27701_2025.pdf', uploadedBy: 'compliance@microsoft.com', uploadedDate: '2026-02-20', size: '2.1 MB', status: 'Accepted', reviewedBy: 'Marcus Johnson', reviewNotes: 'ISO 27001 and 27701 certificates valid. Accreditation verified with BSI.', expiryDate: '2026-11-20' },
  { id: 'VUP-007', vendor: 'Cohere', type: 'Model Card', filename: 'Cohere_Command_R_ModelCard_v2.pdf', uploadedBy: 'trustworthy-ai@cohere.com', uploadedDate: '2026-04-10', size: '567 KB', status: 'Pending Review' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Pending Review': { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  Accepted: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Rejected: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  'Under Review': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}

export default function VendorUpload() {
  const [dragOver, setDragOver] = useState(false)
  const [submissions, setSubmissions] = useState(SEED)
  const [selected, setSelected] = useState<UploadSubmission | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [rejectTarget, setRejectTarget] = useState<UploadSubmission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UploadSubmission | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = submissions.filter(s =>
    (statusFilter === 'All' || s.status === statusFilter) &&
    (!search || s.vendor.toLowerCase().includes(search.toLowerCase()) || s.filename.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      toast.success(`${files.length} file(s) queued for upload`, { description: 'Files will be reviewed by the security team within 5 business days.' })
    }
  }

  const handleAccept = (id: string) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'Accepted' as const, reviewedBy: 'Sarah Chen' } : s))
    setSelected(null)
    toast.success('Submission accepted')
  }

  const confirmReject = () => {
    if (!rejectTarget) return
    setSubmissions(prev => prev.map(s => s.id === rejectTarget.id ? { ...s, status: 'Rejected' as const, reviewedBy: 'Sarah Chen' } : s))
    setSelected(null)
    setRejectTarget(null)
    toast.error('Submission rejected')
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setSubmissions(prev => prev.filter(s => s.id !== deleteTarget.id))
    toast.success(`${deleteTarget.id} removed`)
    setDeleteTarget(null)
    setSelected(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <CloudArrowUp size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Vendor Upload Portal
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Secure portal for vendors to upload compliance documents — SOC 2, ISO certifications, AIBOMs, DPAs, and model cards</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded p-10 text-center transition-colors cursor-pointer ${dragOver ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand)/0.05)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--brand)/0.5)]'}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" className="hidden" multiple onChange={e => { if (e.target.files?.length) toast.success(`${e.target.files.length} file(s) queued`) }} />
        <CloudArrowUp size={36} className={`mx-auto mb-3 ${dragOver ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))]'}`} />
        <p className="text-sm font-semibold text-[hsl(var(--text-1))]">Drop compliance documents here or click to browse</p>
        <p className="text-xs text-[hsl(var(--text-4))] mt-1">Accepted: PDF, XLSX, JSON, XML · Max 25 MB per file</p>
        <p className="text-[10px] text-[hsl(var(--text-4))] mt-2">SOC 2 Reports · ISO Certificates · AIBOMs · Penetration Tests · DPAs · Model Cards · Security Questionnaires</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: submissions.length, color: 'hsl(var(--text-1))' },
          { label: 'Accepted', value: submissions.filter(s => s.status === 'Accepted').length, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Pending Review', value: submissions.filter(s => s.status === 'Pending Review').length, color: 'hsl(var(--s-in-tx))' },
          { label: 'Expiring < 90 days', value: 2, color: 'hsl(var(--s-wn-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm border border-[hsl(var(--border))] bg-surface px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors, files…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['All', 'Pending Review', 'Under Review', 'Accepted', 'Rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-raised">
              {['ID', 'Vendor', 'Document Type', 'File', 'Uploaded', 'Size', 'Expires', 'Reviewed By', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => setSelected(s)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{s.id}</td>
                <td className="px-4 py-3 text-xs font-medium text-[hsl(var(--text-1))]">{s.vendor}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{s.type}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-2))]">
                    <FileText size={12} />
                    <span className="truncate max-w-[160px]">{s.filename}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{s.uploadedDate}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{s.size}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{s.expiryDate ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{s.reviewedBy ?? '—'}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[s.status] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{s.status}</span></td>
                <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                  <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]"><Trash size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No submissions match filters</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[440px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.vendor} — {selected.type}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{selected.status}</span>
              <div className="flex items-center gap-2 p-3 bg-raised border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-page))]" onClick={() => toast.info(`Opening ${selected.filename}`)}>
                <FileText size={16} className="text-[hsl(var(--brand))]" />
                <div><p className="text-xs font-medium text-[hsl(var(--text-1))]">{selected.filename}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{selected.size}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Uploaded By', value: selected.uploadedBy },
                  { label: 'Upload Date', value: selected.uploadedDate },
                  { label: 'Expiry Date', value: selected.expiryDate ?? 'N/A' },
                  { label: 'Reviewed By', value: selected.reviewedBy ?? 'Unassigned' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {selected.reviewNotes && <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Review Notes</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-raised border border-[hsl(var(--border))] leading-relaxed">{selected.reviewNotes}</p></div>}
            </div>
            {(selected.status === 'Pending Review' || selected.status === 'Under Review') && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button onClick={() => handleAccept(selected.id)} className="flex-1 py-2 bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90">Accept</button>
                <button onClick={() => setRejectTarget(selected)} className="flex-1 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm font-medium hover:bg-[hsl(var(--s-er-bg))]">Reject</button>
              </div>
            )}
            <div className="px-4 pb-4">
              <button onClick={() => setDeleteTarget(selected)} className="w-full flex items-center justify-center gap-1.5 py-2 border border-[hsl(var(--border))] text-xs text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:border-[hsl(var(--destructive))]">
                <Trash size={12} /> Remove Submission
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject Submission"
        description={`Reject "${rejectTarget?.filename}" from ${rejectTarget?.vendor}? The vendor will be notified that their submission was not accepted.`}
        confirmLabel="Reject"
        type="danger"
        onConfirm={confirmReject}
        onClose={() => setRejectTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Submission"
        description={`Permanently remove "${deleteTarget?.filename}" from ${deleteTarget?.vendor}? This cannot be undone.`}
        confirmLabel="Remove"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
