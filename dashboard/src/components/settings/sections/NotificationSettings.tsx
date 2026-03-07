// src/components/settings/sections/NotificationSettings.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";

interface NotificationPrefs {
  email_alerts: boolean;
  slack_enabled: boolean;
  slack_webhook: string;
  digest_frequency: "realtime" | "hourly" | "daily";
  alert_on_high_risk: boolean;
  alert_on_pii_detection: boolean;
  alert_on_threshold_breach: boolean;
}

export function NotificationSettings() {
  const qc = useQueryClient();
  const { data: prefs } = useQuery<NotificationPrefs>({
    queryKey: ["notification-prefs"],
    queryFn: () => api<NotificationPrefs>("/api/settings/notifications"),
  });
  const update = useMutation({
    mutationFn: (data: Partial<NotificationPrefs>) =>
      api("/api/settings/notifications", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
  const [local, setLocal] = useState<Partial<NotificationPrefs>>({});
  const merged = { ...prefs, ...local } as NotificationPrefs;
  const toggle = (key: keyof NotificationPrefs) => {
    const val = !merged[key];
    setLocal((p) => ({ ...p, [key]: val }));
    update.mutate({ [key]: val });
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable email alerts</Label>
            <button type="button" role="switch" aria-checked={merged.email_alerts} onClick={() => toggle("email_alerts")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.email_alerts ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.email_alerts ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Digest frequency</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={merged.digest_frequency}
              onChange={(e) => { const v = e.target.value as NotificationPrefs["digest_frequency"]; setLocal((p) => ({...p, digest_frequency: v})); update.mutate({digest_frequency: v}); }}>
              <option value="realtime">Realtime</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Slack Integration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Slack notifications</Label>
            <button type="button" role="switch" aria-checked={merged.slack_enabled} onClick={() => toggle("slack_enabled")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged.slack_enabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged.slack_enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Alert Triggers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(["alert_on_high_risk", "alert_on_pii_detection", "alert_on_threshold_breach"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{key.replace("alert_on_", "").replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase())}</Label>
              <button type="button" role="switch" aria-checked={!!merged[key]} onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${merged[key] ? "bg-primary" : "bg-muted"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${merged[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
