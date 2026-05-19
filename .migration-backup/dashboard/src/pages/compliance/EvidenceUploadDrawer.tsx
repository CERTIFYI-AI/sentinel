import { useState, useRef } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  X, UploadSimple, FileText, Check, Warning, Plus, Trash,
  FolderOpen, FileDashed,
} from '@phosphor-icons/react';
import { FRAMEWORKS, CONTROLS, USERS } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── types ──────────────────────────────────────────────────────────────────

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface EvidenceFormData {
  title: string;
  framework: string;
  controlRef: string;
  source: string;
  description: string;
}

interface EvidenceUploadDrawerProps {
  onClose: () => void;
  onUpload?: (data: EvidenceFormData & { files: UploadedFile[] }) => void;
}

const FRAMEWORKS_LIST = ['EU AI Act', 'GDPR', 'NIST AI RMF', 'SOC 2', 'ISO 27001', 'OWASP LLM'];
const SOURCES = ['Internal', 'Drata', 'Cobalt.io', 'Vanta', 'Okta', 'AWS', 'Legal', 'External Auditor'];

// ── component ──────────────────────────────────────────────────────────────

export default function EvidenceUploadDrawer({ onClose, onUpload }: EvidenceUploadDrawerProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<EvidenceFormData>({
    title: '',
    framework: '',
    controlRef: '',
    source: '',
    description: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(newFiles: File[]) {
    const mapped = newFiles.map(f => ({ name: f.name, size: f.size, type: f.type }));
    setFiles(prev => [...prev, ...mapped]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.framework) errs.framework = 'Select a framework';
    if (!form.controlRef.trim()) errs.controlRef = 'Control reference is required';
    if (files.length === 0) errs.files = 'Upload at least one file';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleUpload() {
    if (!validate()) return;
    setUploading(true);
    // Simulate upload delay
    await new Promise(r => setTimeout(r, 1200));
    setUploading(false);
    setUploaded(true);
    onUpload?.({ ...form, files });
  }

  function fieldStyle(hasError?: boolean) {
    return {
      width: '100%',
      padding: '7px 10px',
      background: 'hsl(var(--bg-raised))',
      border: `1px solid ${hasError ? '#ef4444' : 'hsl(var(--border))'}`,
      color: 'hsl(var(--text-1))',
      fontSize: 13,
      outline: 'none',
    } as React.CSSProperties;
  }

  function labelStyle() {
    return {
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      color: 'hsl(var(--text-3))',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    } as React.CSSProperties;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      {/* Overlay */}
      <div style={{ flex: 1, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        width: 520,
        background: 'hsl(var(--bg-surface))',
        borderLeft: '1px solid hsl(var(--border))',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh',
        overflowY: 'auto',
              }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          padding: '16px 20px',
          borderBottom: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-surface))',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <UploadSimple size={16} style={{ color: 'hsl(var(--brand))' }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Upload Evidence</h2>
            <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 2 }}>
              Attach compliance evidence to a framework control
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))' }}>
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {uploaded ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'hsl(var(--s-ok-bg))',
              border: '1px solid hsl(var(--s-ok-br))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={28} style={{ color: 'hsl(var(--s-ok-tx))' }} weight="bold" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--text-1))', marginBottom: 6 }}>Evidence Uploaded</p>
              <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.5 }}>
                {files.length} file{files.length > 1 ? 's' : ''} attached to <strong>{form.framework}</strong> / {form.controlRef}
              </p>
            </div>
            <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 11 }}>
              Pending review — will sync automatically
            </Badge>
            <button
              onClick={onClose}
              style={{ padding: '8px 20px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Done
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Drop zone */}
            <div>
              <label style={labelStyle()}>Files {errors.files && <span style={{ color: '#ef4444', marginLeft: 4 }}>— {errors.files}</span>}</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'hsl(var(--brand))' : errors.files ? '#ef4444' : 'hsl(var(--border-mid))'}`,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragging ? 'hsl(var(--bg-muted))' : 'hsl(var(--bg-raised))',
                  transition: 'all 0.15s',
                }}
              >
                <FolderOpen size={32} style={{ color: dragging ? 'hsl(var(--brand))' : 'hsl(var(--text-3))', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-2))', marginBottom: 4 }}>
                  Drop files here or click to browse
                </p>
                <p style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>
                  PDF, XLSX, DOCX, PNG, CSV — max 50 MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileInput}
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.csv"
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px',
                      background: 'hsl(var(--bg-muted))',
                      border: '1px solid hsl(var(--border))',
                    }}>
                      <FileDashed size={16} style={{ color: 'hsl(var(--brand))', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'hsl(var(--text-1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'hsl(var(--text-4))', flexShrink: 0 }}>
                        {formatSize(f.size)}
                      </span>
                      <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, flexShrink: 0 }}>
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle()}>Evidence Title {errors.title && <span style={{ color: '#ef4444' }}>*</span>}</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Bias Monitoring Report — Q1 2026"
                style={fieldStyle(!!errors.title)}
              />
              {errors.title && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.title}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Framework */}
              <div>
                <label style={labelStyle()}>Framework {errors.framework && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <select
                  value={form.framework}
                  onChange={e => setForm(f => ({ ...f, framework: e.target.value }))}
                  style={fieldStyle(!!errors.framework)}
                >
                  <option value="">Select framework…</option>
                  {FRAMEWORKS_LIST.map(fw => <option key={fw} value={fw}>{fw}</option>)}
                </select>
                {errors.framework && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.framework}</p>}
              </div>

              {/* Control ref */}
              <div>
                <label style={labelStyle()}>Control Reference {errors.controlRef && <span style={{ color: '#ef4444' }}>*</span>}</label>
                <input
                  value={form.controlRef}
                  onChange={e => setForm(f => ({ ...f, controlRef: e.target.value }))}
                  placeholder="e.g. Art. 10, CC6.1"
                  style={fieldStyle(!!errors.controlRef)}
                />
                {errors.controlRef && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{errors.controlRef}</p>}
              </div>
            </div>

            {/* Source */}
            <div>
              <label style={labelStyle()}>Source</label>
              <select
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                style={fieldStyle()}
              >
                <option value="">Select source…</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle()}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this evidence demonstrate?"
                rows={3}
                style={{ ...fieldStyle(), resize: 'vertical' }}
              />
            </div>

            {/* Info box */}
            <div style={{ padding: '10px 14px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', display: 'flex', gap: 10 }}>
              <FileText size={14} style={{ color: 'hsl(var(--text-3))', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', lineHeight: 1.5 }}>
                Uploaded evidence will be linked to the selected framework control, added to the evidence vault, and available for compliance audits.
                Auto-sync with connected providers (Drata, Vanta) is supported.
              </p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {!uploaded && (
          <div style={{
            position: 'sticky', bottom: 0,
            padding: '12px 20px',
            borderTop: '1px solid hsl(var(--border))',
            background: 'hsl(var(--bg-sunken))',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button
              onClick={onClose}
              style={{ padding: '7px 16px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 18px',
                background: uploading ? 'hsl(var(--bg-muted))' : 'hsl(var(--brand))',
                color: uploading ? 'hsl(var(--text-3))' : '#fff',
                border: 'none', cursor: uploading ? 'wait' : 'pointer',
                fontSize: 13, fontWeight: 500,
              }}
            >
              {uploading ? (
                <>Uploading…</>
              ) : (
                <><UploadSimple size={14} /> Upload Evidence</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
