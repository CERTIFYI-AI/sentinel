import { Robot, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo } from "react";
interface Props { open: boolean; onClose: () => void; modelId?: string; }
interface LifecycleEvent { date: string; event: string; user: string; }
export default function ModelLifecycleDrawer({ open, onClose }: Props) {
  const events = useMemo<LifecycleEvent[]>(() => [{date:"2024-01-15",event:"Registered",user:"Alice"},{date:"2024-01-16",event:"Evaluation Started",user:"Bob"},{date:"2024-01-17",event:"Approved for Staging",user:"Carol"},{date:"2024-01-20",event:"Deployed to Production",user:"Dave"}],[]);
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}><div className="bg-[hsl(var(--background))] w-[500px] h-full shadow-xl p-6 overflow-auto" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Escape")onClose()}} tabIndex={-1}><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Model Lifecycle</h2><button onClick={onClose}>X</button></div><div className="space-y-4">{events.map((ev,i)=>(<div key={i} className="flex gap-4 items-start"><div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] mt-2"/><div><div className="text-sm font-medium">{ev.event}</div><div className="text-xs text-muted-foreground">{ev.date} by {ev.user}</div></div></div>))}</div></div></div>);}
