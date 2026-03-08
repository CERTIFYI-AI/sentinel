import { useState } from "react";

const TABS = ["General", "Trust & Safety", "PII Detection", "API Keys", "Team", "Notifications", "Compliance", "Audit Log"];

export default function Settings() {
  const [tab, setTab] = useState("General");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Settings</h1>
      <div className="flex gap-6">
        <div className="w-56 space-y-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${tab === t ? "bg-green-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
              {t}
            </button>
          ))}
          <div className="px-3 py-2 text-sm text-gray-400 flex items-center gap-2">Billing <span className="bg-gray-200 dark:bg-gray-700 text-xs px-1.5 py-0.5 rounded">SOON</span></div>
        </div>
        <div className="flex-1 border rounded-lg p-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{tab}</h2>
          {tab === "General" && (
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-500 mb-1">Organization Name</label><input defaultValue="Certifyi Inc." className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm text-gray-500 mb-1">Default Theme</label>
                <select defaultValue="light" className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
                </select>
              </div>
              <div><label className="block text-sm text-gray-500 mb-1">Timezone</label><input defaultValue="UTC" className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm text-gray-500 mb-1">Data Retention (days)</label><input type="number" defaultValue={90} className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white" /></div>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Changes</button>
            </div>
          )}
          {tab === "Trust & Safety" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Enable HITL review for high-risk outputs</span><input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" /></div>
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Auto-flag PII in model responses</span><input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" /></div>
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Block harmful content generation</span><input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" /></div>
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Enable bias detection alerts</span><input type="checkbox" className="w-5 h-5 accent-green-600" /></div>
              <div><label className="block text-sm text-gray-500 mb-1">Risk Tolerance Threshold</label>
                <select defaultValue="medium" className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option>low</option><option>medium</option><option>high</option>
                </select>
              </div>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Changes</button>
            </div>
          )}
          {tab === "PII Detection" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Configure PII detection patterns and sensitivity.</p>
              {["Email Addresses", "Phone Numbers", "SSN / National IDs", "Credit Card Numbers", "Physical Addresses", "Names", "Medical Record Numbers"].map(t => (
                <div key={t} className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">{t}</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" />
                </div>
              ))}
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Changes</button>
            </div>
          )}
          {tab === "API Keys" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Manage API keys for Sentinel integrations.</p>
                <button className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Generate Key</button>
              </div>
              {[{name: "Production", key: "sk-prod-****-****-7f3a", created: "2025-01-01", status: "active"}, {name: "Staging", key: "sk-stg-****-****-2b1c", created: "2025-01-10", status: "active"}, {name: "Development", key: "sk-dev-****-****-9d4e", created: "2024-12-15", status: "revoked"}].map(k => (
                <div key={k.name} className="border rounded p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium text-gray-900 dark:text-white">{k.name}</p><p className="text-xs text-gray-400 font-mono">{k.key}</p></div>
                    <span className={`text-xs px-2 py-0.5 rounded ${k.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{k.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Created: {k.created}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "Team" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Manage team members and roles.</p>
                <button className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">Invite Member</button>
              </div>
              {[{name: "Admin User", email: "admin@certifyi.ai", role: "Admin"}, {name: "ML Engineer", email: "ml@certifyi.ai", role: "Editor"}, {name: "Compliance Officer", email: "compliance@certifyi.ai", role: "Viewer"}, {name: "Security Analyst", email: "security@certifyi.ai", role: "Editor"}].map(m => (
                <div key={m.email} className="flex items-center justify-between border rounded p-3 dark:border-gray-700">
                  <div><p className="font-medium text-gray-900 dark:text-white">{m.name}</p><p className="text-xs text-gray-400">{m.email}</p></div>
                  <select defaultValue={m.role} className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                    <option>Admin</option><option>Editor</option><option>Viewer</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {tab === "Notifications" && (
            <div className="space-y-4">
              {["Critical incidents", "Compliance scan results", "Risk threshold breaches", "Model registration", "Export completion", "Team changes", "Weekly digest"].map(n => (
                <div key={n} className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">{n}</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" defaultChecked className="accent-green-600" /> Email</label>
                    <label className="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" className="accent-green-600" /> Slack</label>
                  </div>
                </div>
              ))}
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Preferences</button>
            </div>
          )}
          {tab === "Compliance" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select active compliance frameworks.</p>
              {["EU AI Act", "GDPR", "NIST AI RMF", "ISO 42001", "ISO 27001", "SOC 2 Type II", "IEEE 7000", "CCPA"].map(f => (
                <div key={f} className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">{f}</span>
                  <input type="checkbox" defaultChecked={["EU AI Act","GDPR","NIST AI RMF","ISO 42001"].includes(f)} className="w-5 h-5 accent-green-600" />
                </div>
              ))}
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Frameworks</button>
            </div>
          )}
          {tab === "Audit Log" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">System audit log settings.</p>
              <div><label className="block text-sm text-gray-500 mb-1">Log Retention Period</label>
                <select defaultValue="365" className="w-full border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option><option value="730">2 years</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Log API access</span><input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" /></div>
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Log user actions</span><input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" /></div>
              <div className="flex items-center justify-between p-3 border rounded dark:border-gray-700"><span className="text-gray-900 dark:text-white">Log model invocations</span><input type="checkbox" defaultChecked className="w-5 h-5 accent-green-600" /></div>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Settings</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
