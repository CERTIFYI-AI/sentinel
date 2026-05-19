import React, { useEffect, useState } from "react";

interface FeedEntry { controlId: string; status: "PASS" | "FAIL" | "NA"; framework: string; timestamp: string; signal: string; }

interface Props { pollUrl?: string; pollIntervalMs?: number; initialEntries?: FeedEntry[]; }

const SB: Record<string,{bg:string;text:string}> = { PASS:{bg:"#dcfce7",text:"#166534"}, FAIL:{bg:"#fef2f2",text:"#991b1b"}, NA:{bg:"#f3f4f6",text:"#4b5563"} };

export const RealTimeControlFeed: React.FC<Props> = ({ initialEntries = [] }) => {
  const [entries, setEntries] = useState<FeedEntry[]>(initialEntries);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0 }}>Real-Time Control Feed</h4>
        <span style={{ fontSize: 11, color: "#6b7280" }}>{entries.length} entries</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: 24 }}>No evaluations yet</div>
        ) : entries.map((e, i) => {
          const s = SB[e.status] || SB.NA;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: s.bg, color: s.text, minWidth: 36, textAlign: "center" }}>{e.status}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.controlId} <span style={{ fontSize: 11, color: "#9ca3af" }}>({e.framework})</span></div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Signal: {e.signal}</div>
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(e.timestamp).toLocaleTimeString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
