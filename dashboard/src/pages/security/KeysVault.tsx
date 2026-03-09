import { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Eye, EyeOff, Copy, Plus, RotateCcw, Trash2 } from "lucide-react";

interface Secret {
  id: string;
  name: string;
  type: "api_key" | "oauth_token" | "ssh_key" | "certificate" | "password";
  environment: "production" | "staging" | "development";
  lastRotated: string;
  expiresAt: string;
  status: "active" | "expiring" | "expired" | "revoked";
  usedBy: string[];
}

const SECRETS: Secret[] = [
  { id: "SK-001", name: "OpenAI API Key", type: "api_key", environment: "production", lastRotated: "2024-01-10", expiresAt: "2024-04-10", status: "active", usedBy: ["ai-service", "eval-pipeline"] },
  { id: "SK-002", name: "AWS Root Access Key", type: "api_key", environment: "production", lastRotated: "2023-11-01", expiresAt: "2024-02-01", status: "expiring", usedBy: ["infra-deploy"] },
  { id: "SK-003", name: "GitHub OAuth Token", type: "oauth_token", environment: "production", lastRotated: "2024-01-05", expiresAt: "2024-07-05", status: "active", usedBy: ["ci-cd", "code-scanner"] },
  { id: "SK-004", name: "Database SSL Certificate", type: "certificate", environment: "production", lastRotated: "2023-06-15", expiresAt: "2024-01-15", status: "expired", usedBy: ["db-proxy"] },
  { id: "SK-005", name: "Staging SSH Deploy Key", type: "ssh_key", environment: "staging", lastRotated: "2024-01-12", expiresAt: "2025-01-12", status: "active", usedBy: ["deploy-agent"] },
  { id: "SK-006", name: "Stripe Secret Key", type: "api_key", environment: "production", lastRotated: "2024-01-08", expiresAt: "2024-07-08", status: "active", usedBy: ["billing-service"] },
  { id: "SK-007", name: "Dev JWT Signing Key", type: "password", environment: "development", lastRotated: "2023-12-20", expiresAt: "2024-03-20", status: "active", usedBy: ["auth-service"] },
  { id: "SK-008", name: "Slack Bot Token", type: "oauth_token", environment: "production", lastRotated: "2023-09-01", expiresAt: "2024-01-01", status: "revoked", usedBy: ["notification-svc"] },
];

const TYPE_ICONS: Record<string, string> = {
  api_key: "API",
  oauth_token: "OAuth",
  ssh_key: "SSH",
  certificate: "Cert",
  password: "Pass",
};

const STATUS_VARIANT: Record<string, string> = {
  active: "default",
  expiring: "outline",
  expired: "destructive",
  revoked: "secondary",
};

const ENV_COLORS: Record<string, string> = {
  production: "text-red-400",
  staging: "text-yellow-400",
  development: "text-green-400",
};

export default function KeysVault() {
  const [secrets] = useState(SECRETS);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [envFilter, setEnvFilter] = useState<string>("all");

  const toggleVisibility = (id: string) => {
    setVisibleIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = envFilter === "all" ? secrets : secrets.filter(s => s.environment === envFilter);
  const activeCount = secrets.filter(s => s.status === "active").length;
  const expiringCount = secrets.filter(s => s.status === "expiring" || s.status === "expired").length;

  return (
    <PageWrapper title="Keys & Secrets Vault" subtitle="Manage API keys, tokens, certificates, and secrets across all environments">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{secrets.length}</p>
                <p className="text-xs text-slate-500">Total Secrets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{activeCount}</p>
                <p className="text-xs text-slate-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{expiringCount}</p>
                <p className="text-xs text-slate-500">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-slate-100">{secrets.filter(s => s.environment === "production").length}</p>
                <p className="text-xs text-slate-500">Production Keys</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {["all", "production", "staging", "development"].map(env => (
            <Button key={env} size="sm" variant={envFilter === env ? "default" : "outline"} onClick={() => setEnvFilter(env)} className="capitalize text-xs">
              {env}
            </Button>
          ))}
        </div>
        <Button size="sm" className="gap-1"><Plus className="h-3 w-3" />Add Secret</Button>
      </div>

      <div className="space-y-3">
        {filtered.map(secret => (
          <Card key={secret.id} className="bg-slate-900 border-slate-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">{TYPE_ICONS[secret.type]}</span>
                    <h4 className="text-sm font-semibold text-slate-100">{secret.name}</h4>
                    <Badge variant={STATUS_VARIANT[secret.status] as any} className="text-xs">{secret.status}</Badge>
                    <span className={`text-xs capitalize ${ENV_COLORS[secret.environment]}`}>{secret.environment}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="font-mono">{secret.id}</span>
                    <span>Rotated: {secret.lastRotated}</span>
                    <span>Expires: {secret.expiresAt}</span>
                    <span>Used by: {secret.usedBy.join(", ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleVisibility(secret.id)}>
                    {visibleIds.has(secret.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost"><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost"><RotateCcw className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {visibleIds.has(secret.id) && (
                <div className="mt-3 p-2 bg-slate-800 rounded font-mono text-xs text-slate-400">
                  {secret.type === "api_key" ? "sk-xxxx...xxxx" : secret.type === "ssh_key" ? "ssh-rsa AAAA..." : "****...****"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
