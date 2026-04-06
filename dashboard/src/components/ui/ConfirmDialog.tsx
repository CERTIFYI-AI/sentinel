import { useState } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  type?: "danger" | "warning" | "info";
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  requiresTyping?: string;
  checklist?: string[];
}

export function ConfirmDialog({ open, onClose, onOpenChange, onConfirm, type = "info", title, message, description, confirmLabel = "Confirm", cancelLabel = "Cancel", requiresTyping, checklist }: ConfirmDialogProps & { description?: string }) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  if (!open) return null;
  const typingValid = !requiresTyping || typed === requiresTyping;
  const checklistValid = !checklist || checklist.every((_, i) => checked[i]);
  const canConfirm = typingValid && checklistValid;
  const colors = { danger: "bg-[hsl(var(--destructive))] text-foreground", warning: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))]", info: "bg-[hsl(var(--primary))] text-foreground" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{message ?? description}</div>
        {checklist && (
          <div className="space-y-2 mb-4">
            {checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!checked[i]} onChange={e => setChecked(p => ({ ...p, [i]: e.target.checked }))} className="rounded border-[hsl(var(--border))]" />
                {item}
              </label>
            ))}
          </div>
        )}
        {requiresTyping && (
          <div className="mb-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Type <strong>{requiresTyping}</strong> to confirm</p>
            <input className="w-full px-3 py-2 text-sm border rounded-md bg-transparent border-[hsl(var(--border))] outline-none focus:border-[hsl(var(--primary))]" value={typed} onChange={e => setTyped(e.target.value)} />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={handleClose} className="px-4 py-2 text-sm rounded-md hover:bg-[hsl(var(--surface-2))]">{cancelLabel}</button>
          <button onClick={() => { onConfirm(); handleClose(); setTyped(""); setChecked({}); }} disabled={!canConfirm} className={`px-4 py-2 text-sm rounded-md ${colors[type]} disabled:opacity-50 disabled:cursor-not-allowed`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
