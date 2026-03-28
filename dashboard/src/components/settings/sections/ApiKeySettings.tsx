// src/components/settings/sections/ApiKeySettings.tsx
import { useState } from "react";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "../../../hooks/use-settings";
import { SpinnerGap, Plus, Copy, Check } from "@phosphor-icons/react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../ui/table';

export function ApiKeySettings() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRole, setNewKeyRole] = useState("api");
  const [newKeyExpiry, setNewKeyExpiry] = useState("90d");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;

  async function handleCreate() {
    const result = await createKey.mutateAsync({ name: newKeyName, role: newKeyRole, expiry: newKeyExpiry });
    if (result?.key) setCreatedKey(result.key);
    setShowCreate(false);
    setNewKeyName("");
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  const activeKeys = (keys ?? []).filter((k: Record<string, unknown>) => k.status === "active");
  const expiredKeys = (keys ?? []).filter((k: Record<string, unknown>) => k.status !== "active");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">{activeKeys.length} active keys &middot; {expiredKeys.length} expired</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 h-9 px-4 rounded-none bg-[#1A6B5A] text-white text-sm">
          <Plus className="w-4 h-4" /> Create New Key
        </button>
      </div>
      {createdKey && (
        <div className="p-4 rounded border border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] space-y-2">
          <p className="text-sm font-medium">Copy this key. It will never be shown again.</p>
          <div className="flex gap-2">
            <input readOnly value={createdKey} className="flex-1 font-mono text-sm bg-background border rounded px-3 py-2" />
            <button onClick={() => { copyKey(createdKey); }} className="px-3 rounded border">
              {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setCreatedKey(null)} className="text-sm text-muted-foreground">Done</button>
        </div>
      )}
      {showCreate && (
        <div className="p-4 rounded border space-y-3">
          <input placeholder="Key name" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm bg-background" />
          <select value={newKeyRole} onChange={e => setNewKeyRole(e.target.value)} className="w-full rounded border px-3 py-2 text-sm bg-background">
            <option value="api">API — proxy access only</option>
            <option value="reviewer">Reviewer — proxy + HITL</option>
            <option value="admin">Admin — full access</option>
          </select>
          <select value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} className="w-full rounded border px-3 py-2 text-sm bg-background">
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="1y">1 year</option>
            <option value="never">Never</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newKeyName || createKey.isPending} className="h-9 px-4 rounded-none bg-[#1A6B5A] text-white text-sm">
              {createKey.isPending ? <SpinnerGap className="w-4 h-4 animate-spin" /> : "Create Key"}
            </button>
            <button onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-none border text-sm">Cancel</button>
          </div>
        </div>
      )}
      <div className="border rounded">
        <Table className="w-full text-sm">
          <TableHeader><TableRow className="border-b bg-muted/50">
            <TableHead className="text-left p-3 font-medium">Name</TableHead>
            <TableHead className="text-left p-3 font-medium">Role</TableHead>
            <TableHead className="text-left p-3 font-medium">Prefix</TableHead>
            <TableHead className="text-left p-3 font-medium">Created</TableHead>
            <TableHead className="text-left p-3 font-medium">Status</TableHead>
            <TableHead className="text-right p-3 font-medium">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(keys ?? []).map((k: Record<string, unknown>) => (
              <TableRow key={String(k.id)} className="border-b">
                <TableCell className="p-3">{String(k.name)}</TableCell>
                <TableCell className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-muted">{String(k.role)}</span></TableCell>
                <TableCell className="p-3 font-mono text-xs">{String(k.prefix ?? "sk-...")}</TableCell>
                <TableCell className="p-3 text-muted-foreground">{String(k.created_at ?? "")}</TableCell>
                <TableCell className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${k.status === "active" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                    {String(k.status)}
                  </span>
                </TableCell>
                <TableCell className="p-3 text-right">
                  {k.status === "active" && (
                    <button onClick={() => revokeKey.mutate(String(k.id))} className="text-xs text-red-400 hover:underline">Revoke</button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
