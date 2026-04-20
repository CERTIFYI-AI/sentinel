import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File } from 'lucide-react';
import { RBACGate } from './RBACGate';
import { formatDistanceToNow } from 'date-fns';

interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

interface Props {
  entityType: string;
  entityId?: string;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  'image': Image,
  'application/pdf': FileText,
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function EvidenceAttachments({ entityType, entityId }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!entityId) return;
    const { data } = await supabase
      .from('evidence_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    setAttachments(data || []);
  };

  useEffect(() => { load(); }, [entityType, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !entityId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${entityType}/${entityId}/${Date.now()}_${file.name}`;
        await supabase.storage.from('evidence').upload(path, file);
        await supabase.from('evidence_attachments').insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: path,
        });
      }
      load();
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string, path: string) => {
    await supabase.storage.from('evidence').remove([path]);
    await supabase.from('evidence_attachments').delete().eq('id', id);
    load();
  };

  const handleDownload = async (path: string, name: string) => {
    const { data } = await supabase.storage.from('evidence').download(path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!entityId) return null;

  const IconFor = (type: string) => {
    if (type.startsWith('image')) return Image;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Evidence & Attachments
          <Badge variant="secondary">{attachments.length}</Badge>
        </h4>
        <RBACGate action="update">
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" disabled={uploading} asChild>
              <span><Upload className="h-3 w-3 mr-1" />{uploading ? 'Uploading...' : 'Upload'}</span>
            </Button>
            <input type="file" multiple className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.csv,.txt,.md" />
          </label>
        </RBACGate>
      </div>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No evidence attached yet.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => {
            const Icon = IconFor(att.file_type);
            return (
              <div key={att.id} className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(att.file_size)} &middot; {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload(att.storage_path, att.file_name)}>
                  <Download className="h-3 w-3" />
                </Button>
                <RBACGate action="delete">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(att.id, att.storage_path)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </RBACGate>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EvidenceAttachments;
