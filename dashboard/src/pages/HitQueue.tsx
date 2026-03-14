import { UserCircle, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useState } from "react";

interface HitlItem {
  id: string;
  model: string;
  input: string;
  output: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  flagReason: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
}

const DUMMY_ITEMS: HitlItem[] = [
  { id: "HITL-001", model: "GPT-4o", input: "Summarize patient records for Dr. Smith", output: "Patient John D. has been diagnosed with...", riskLevel: "critical", flagReason: "PII detected in output", timestamp: "2025-01-15 09:23", status: "pending" },
  { id: "HITL-002", model: "Claude-3.5", input: "Generate marketing copy for product launch", output: "Our revolutionary AI product will transform...", riskLevel: "low", flagReason: "Unsubstantiated claims", timestamp: "2025-01-15 08:45", status: "pending" },
  { id: "HITL-003", model: "Llama-3-70B", input: "Classify loan application risk", output: "Based on demographic data, this applicant...", riskLevel: "high", flagReason: "Potential bias in classification", timestamp: "2025-01-14 16:30", status: "pending" },
  { id: "HITL-004", model: "GPT-4o-mini", input: "Draft employment contract clause", output: "The employee agrees to waive all rights...", riskLevel: "high", flagReason: "Legal compliance risk", timestamp: "2025-01-14 14:12", status: "approved" },
  { id: "HITL-005", model: "Mistral-Large", input: "Analyze financial report Q4 2024", output: "Revenue projections indicate a 15% increase...", riskLevel: "medium", flagReason: "Hallucinated financial data", timestamp: "2025-01-14 11:05", status: "rejected" },
  { id: "HITL-006", model: "GPT-4o", input: "Generate user profile summary", output: "User demographics suggest targeting...", riskLevel: "medium", flagReason: "Profiling concerns", timestamp: "2025-01-13 17:22", status: "pending" },
];

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-foreground",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function HitQueue() {
  const [items, setItems] = useState<HitlItem[]>(DUMMY_ITEMS);
  const [selected, setSelected] = useState<HitlItem | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);
  const pendingCount = items.filter(i => i.status === "pending").length;

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: action } : i));
    setSelected(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">HITL Queue</h1>
          <p className="text-muted-foreground dark:text-muted-foreground">Human-in-the-loop review for flagged AI outputs</p>
        </div>
        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingCount} pending review
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "pending", "approved", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm capitalize ${filter === f ? "bg-green-600 text-foreground" : "bg-muted dark:bg-card text-foreground dark:text-gray-300"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filtered.map(item => (
            <div key={item.id} onClick={() => setSelected(item)}
              className={`border rounded-none p-4 cursor-pointer transition hover:shadow-md ${
                selected?.id === item.id ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-border dark:border-border bg-white dark:bg-background"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{item.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[item.riskLevel]}`}>{item.riskLevel}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status]}`}>{item.status}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
              </div>
              <p className="text-sm font-medium text-foreground dark:text-foreground">{item.flagReason}</p>
              <p className="text-xs text-muted-foreground mt-1">Model: {item.model}</p>
            </div>
          ))}
        </div>

        <div className="border rounded-none p-4 bg-white dark:bg-background border-border dark:border-border">
          {selected ? (
            <div>
              <h3 className="font-bold text-lg mb-3 text-foreground dark:text-foreground">Review: {selected.id}</h3>
              <div className="space-y-3 text-sm">
                <div><span className="font-medium text-muted-foreground">Model:</span> <span className="text-foreground dark:text-foreground">{selected.model}</span></div>
                <div><span className="font-medium text-muted-foreground">Risk:</span> <span className={`px-2 py-0.5 rounded text-xs ${riskColors[selected.riskLevel]}`}>{selected.riskLevel}</span></div>
                <div><span className="font-medium text-muted-foreground">Flag Reason:</span> <span className="text-foreground dark:text-foreground">{selected.flagReason}</span></div>
                <div className="border-t pt-3 dark:border-border">
                  <p className="font-medium text-muted-foreground mb-1">Input:</p>
                  <p className="bg-muted dark:bg-card p-2 rounded text-foreground dark:text-gray-200">{selected.input}</p>
                </div>
                <div className="border-t pt-3 dark:border-border">
                  <p className="font-medium text-muted-foreground mb-1">Output:</p>
                  <p className="bg-muted dark:bg-card p-2 rounded text-foreground dark:text-gray-200">{selected.output}</p>
                </div>
                {selected.status === "pending" && (
                  <div className="flex gap-2 pt-3">
                    <button onClick={() => handleAction(selected.id, "approved")} className="flex-1 bg-green-600 text-foreground py-2 rounded hover:bg-green-700">Approve</button>
                    <button onClick={() => handleAction(selected.id, "rejected")} className="flex-1 bg-red-600 text-foreground py-2 rounded hover:bg-red-700">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg">Select an item to review</p>
              <p className="text-sm mt-1">Click on a flagged output from the list</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
