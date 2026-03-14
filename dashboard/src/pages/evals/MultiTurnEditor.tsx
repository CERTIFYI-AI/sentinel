import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useState } from "react";
interface Turn { role: "user"|"assistant"; content: string; }
export default function MultiTurnEditor() {
  const [turns, setTurns] = useState<Turn[]>([{role:"user",content:""}]);
  const addTurn = () => setTurns(t=>[...t,{role:t[t.length-1].role==="user"?"assistant":"user",content:""}]);
  const updateTurn = (i: number, content: string) => setTurns(t=>t.map((turn,idx)=>idx===i?{...turn,content}:turn));
  const removeTurn = (i: number) => setTurns(t=>t.filter((_,idx)=>idx!==i));
  return (<div className="p-6 max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-1">Multi-Turn Editor</h1><p className="text-sm text-muted-foreground mb-4">Create multi-turn conversation datasets</p><div className="space-y-3">{turns.map((t,i)=>(<div key={i} className="flex gap-2 items-start"><span className="text-xs font-medium w-16 pt-2">{t.role}</span><textarea className="flex-1 border rounded px-3 py-2 min-h-[60px]" value={t.content} onChange={e=>updateTurn(i,e.target.value)}/><button className="text-red-500 hover:text-red-700 pt-2" onClick={()=>removeTurn(i)}>X</button></div>))}</div><div className="mt-4 flex gap-2"><button className="px-4 py-2 border rounded" onClick={addTurn}>Add Turn</button><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded">Save</button></div></div>);}
