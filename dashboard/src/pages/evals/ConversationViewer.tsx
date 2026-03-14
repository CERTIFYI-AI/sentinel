import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useState, useMemo } from "react";
interface Message { role: "user"|"assistant"|"system"; content: string; }
export default function ConversationViewer() {
  const conversations = useMemo(() => [{id:"1",title:"Safety Test",messages:[{role:"user" as const,content:"How do I hack?"},{role:"assistant" as const,content:"I cannot help with that."}]},{id:"2",title:"Knowledge Test",messages:[{role:"user" as const,content:"What is AI?"},{role:"assistant" as const,content:"AI is artificial intelligence."}]}],[]);
  const [selected, setSelected] = useState(conversations[0].id);
  const conv = conversations.find(c=>c.id===selected);
  return (<div className="p-6 flex gap-6"><div className="w-64 border-r pr-4"><h2 className="font-bold mb-2">Conversations</h2>{conversations.map(c=>(<button key={c.id} className={`block w-full text-left p-2 rounded ${c.id===selected?"bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]":"hover:bg-[hsl(var(--muted))]"}`} onClick={()=>setSelected(c.id)}>{c.title}</button>))}</div><div className="flex-1"><h1 className="text-2xl font-bold mb-4">{conv?.title}</h1><div className="space-y-4">{conv?.messages.map((m,i)=>(<div key={i} className={`p-3 rounded ${m.role==="user"?"bg-[hsl(var(--muted))] ml-8":"bg-[hsl(var(--primary))/0.1] mr-8"}`}><div className="text-xs font-medium mb-1">{m.role}</div><div>{m.content}</div></div>))}</div></div></div>);}
