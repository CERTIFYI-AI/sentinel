
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Settings as SettingsIcon, Bell, Shield, Users, Key, Globe } from "lucide-react";

export default function Settings() {
  const [orgName, setOrgName] = useState("Acme Corp");
  const [adminEmail, setAdminEmail] = useState("admin@acmecorp.com");
  const [alertEmail, setAlertEmail] = useState("alerts@acmecorp.com");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [mfa, setMfa] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(()=>setSaved(false),3000); };
  const sectionClass = "bg-gray-900 border-gray-800";
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-sm text-gray-400">Platform configuration and preferences</p></div>
      <div className="grid grid-cols-1 gap-6">
        <Card className={sectionClass}><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4"><Globe className="w-5 h-5 text-green-400" /><h3 className="text-white font-medium">Organization</h3></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 block mb-1">Organization Name</label><Input value={orgName} onChange={e=>setOrgName(e.target.value)} className="bg-gray-800 border-gray-700 text-white" /></div>
            <div><label className="text-xs text-gray-400 block mb-1">Admin Email</label><Input value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} className="bg-gray-800 border-gray-700 text-white" /></div>
            <div><label className="text-xs text-gray-400 block mb-1">Industry</label><select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"><option>Technology</option><option>Finance</option><option>Healthcare</option><option>Other</option></select></div>
            <div><label className="text-xs text-gray-400 block mb-1">Timezone</label><select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"><option>UTC</option><option>US/Eastern</option><option>US/Pacific</option><option>Asia/Kolkata</option></select></div>
          </div>
        </CardContent></Card>
        <Card className={sectionClass}><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-green-400" /><h3 className="text-white font-medium">Security</h3></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 block mb-1">Session Timeout (minutes)</label><Input value={sessionTimeout} onChange={e=>setSessionTimeout(e.target.value)} className="bg-gray-800 border-gray-700 text-white" /></div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <div><p className="text-sm text-white">Multi-Factor Authentication</p><p className="text-xs text-gray-400">Require MFA for all users</p></div>
              <button onClick={()=>setMfa(!mfa)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mfa?"bg-green-600":"bg-gray-600"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mfa?"translate-x-6":"translate-x-1"}`} /></button>
            </div>
          </div>
        </CardContent></Card>
        <Card className={sectionClass}><CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-green-400" /><h3 className="text-white font-medium">Notifications</h3></div>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-400 block mb-1">Alert Email</label><Input value={alertEmail} onChange={e=>setAlertEmail(e.target.value)} className="bg-gray-800 border-gray-700 text-white" /></div>
            {[{label:"Email Alerts",desc:"Receive alerts via email",val:emailAlerts,set:setEmailAlerts},{label:"Slack Notifications",desc:"Send alerts to Slack channel",val:slackAlerts,set:setSlackAlerts}].map(n=>(
              <div key={n.label} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                <div><p className="text-sm text-white">{n.label}</p><p className="text-xs text-gray-400">{n.desc}</p></div>
                <button onClick={()=>n.set(!n.val)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${n.val?"bg-green-600":"bg-gray-600"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${n.val?"translate-x-6":"translate-x-1"}`} /></button>
              </div>
            ))}
          </div>
        </CardContent></Card>
        <div className="flex justify-end gap-3">
          {saved && <p className="text-green-400 text-sm self-center">Settings saved successfully!</p>}
          <Button variant="outline" className="border-gray-700 text-gray-300">Reset</Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
