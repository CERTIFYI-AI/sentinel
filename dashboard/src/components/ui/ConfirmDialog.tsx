import { useState } from "react";
import { Warning, Trash, Info } from "@phosphor-icons/react";

interface ConfirmDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  type?: "danger" | "warning" | "info";
  title: string;
  message?: string | React.ReactNode;
  description?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  requiresTyping?: string;
  checklist?: string[];
  isDestructive?: boolean;
  impactList?: string[];
}

export function ConfirmDialog({
  open, onClose, onOpenChange, onConfirm,
  type = "info", title, message, description,
  confirmLabel = "Confirm", cancelLabel = "Cancel",
  requiresTyping, checklist, isDestructive, impactList,
}: ConfirmDialogProps) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  if (!open) return null;

  const typingValid = !requiresTyping || typed === requiresTyping;
  const checklistValid = !checklist || checklist.every((_, i) => checked[i]);
  const canConfirm = typingValid && checklistValid;

  const resolvedType = isDestructive ? "danger" : type;

  const btnColors: Record<string, string> = {
    danger:  "bg-[hsl(var(--destructive))] text-white hover:opacity-90",
    warning: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] hover:opacity-90",
    info:    "bg-[hsl(var(--brand))] text-white hover:opacity-90",
  };

  const iconMap: Record<string, React.ReactNode> = {
    danger:  <Trash size={20} weight="duotone" className="text-[hsl(var(--destructive))]" />,
    warning: <Warning size={20} weight="duotone" className="text-[hsl(var(--s-wn-tx))]" />,
    info:    <Info size={20} weight="duotone" className="text-[hsl(var(--brand))]" />,
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl w-full max-w-md mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-[hsl(var(--border))]">
          <div className="flex-shrink-0 mt-0.5">{iconMap[resolvedType]}</div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-title" className="text-base font-semibold text-[hsl(var(--text-1))]">{title}</h3>
            {(message ?? description) && (
              <p className="text-sm text-[hsl(var(--text-3))] mt-1">{message ?? description}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-colors"
            aria-label="Close dialog"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Impact list */}
        {impactList && impactList.length > 0 && (
          <div className="px-5 pt-4">
            <p className="text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider mb-2">
              This will affect:
            </p>
            <ul className="space-y-1">
              {impactList.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[hsl(var(--text-3))]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--destructive))] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Body */}
        <div className="px-5 pb-1">
          {checklist && (
            <div className="space-y-2 mt-4">
              {checklist.map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer text-[hsl(var(--text-2))]">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={e => setChecked(p => ({ ...p, [i]: e.target.checked }))}
                    className="rounded border-[hsl(var(--border))]"
                  />
                  {item}
                </label>
              ))}
            </div>
          )}

          {requiresTyping && (
            <div className="mt-4">
              <p className="text-xs text-[hsl(var(--text-4))] mb-1.5">
                Type <strong className="text-[hsl(var(--text-2))]">{requiresTyping}</strong> to confirm
              </p>
              <input
                className="w-full px-3 py-2 text-sm border bg-transparent border-[hsl(var(--border))] text-[hsl(var(--text-1))] outline-none focus:border-[hsl(var(--brand))] placeholder:text-[hsl(var(--text-4))]"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={requiresTyping}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              if (!canConfirm) return;
              onConfirm();
              handleClose();
              setTyped("");
              setChecked({});
            }}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${btnColors[resolvedType]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
