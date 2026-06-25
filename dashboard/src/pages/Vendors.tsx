import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { MagnifyingGlass as Search, Plus, Buildings as Building2, Warning as AlertTriangle, Shield, X, Clock, CheckCircle, Export, Bell } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useVendorsData } from "@/hooks/useVendorsData";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";


const TODAY = new Date("2026-04-10");

function daysUntilExpiry(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - TODAY.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function expiryLabel(dateStr: string): { label: string; color: string; bg: string } {
  const days = daysUntilExpiry(dateStr);
  if (days < 0) return { label: "Expired", color: "hsl(var(--s-er-tx))", bg: "hsl(0 72% 51% / 0.10)" };
  if (days <= 30) return { label: `${days}d`, color: "hsl(var(--s-er-tx))", bg: "hsl(0 72% 51% / 0.10)" };
  if (days <= 90) return { label: `${days}d`, color: "hsl(45 85% 40%)", bg: "hsl(45 93% 47% / 0.10)" };
  return { label: dateStr, color: "hsl(var(--text-4))", bg: "transparent" };
}

function tierBadge(t: number) {
  const styles: Record<number, { bg: string; color: string; border: string }> = {
    1: { bg: "hsl(0 72% 51% / 0.10)", color: "hsl(var(--s-er-tx))", border: "hsl(0 72% 51% / 0.30)" },
    2: { bg: "hsl(45 93% 47% / 0.10)", color: "hsl(45 85% 40%)", border: "hsl(45 93% 47% / 0.30)" },
    3: { bg: "hsl(142 71% 45% / 0.10)", color: "hsl(var(--s-ok-tx))", border: "hsl(142 71% 45% / 0.30)" },
  };
  const s = styles[t] ?? styles[3];
  return (
    <Badge style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 0, fontSize: 10 }}>
      Tier {t}
    </Badge>
  );
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: "hsl(142 71% 45% / 0.10)", color: "hsl(var(--s-ok-tx))" },
    "under-review": { bg: "hsl(45 93% 47% / 0.10)", color: "hsl(45 85% 40%)" },
    inactive: { bg: "hsl(0 72% 51% / 0.10)", color: "hsl(var(--s-er-tx))" },
  };
  const s = map[status] ?? map.inactive;
  return (
    <Badge style={{ background: s.bg, color: s.color, borderRadius: 0, fontSize: 10, textTransform: "capitalize" }}>
      {status.replace("-", " ")}
    </Badge>
  );
}

export default function Vendors() {
  const { vendors: allVendors, isLoading } = useVendorsData();
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  if (isLoading) return <PageSkeleton title="Vendor Registry" rows={8} />;

  const filtered = allVendors.filter(
    (v: any) => v.name?.toLowerCase().includes(search.toLowerCase()) || v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const expiredVendors = allVendors.filter((v: any) => v.contract_expiry && daysUntilExpiry(v.contract_expiry) < 0 && !dismissedAlerts.includes(v.id));
  const expiringSoon = allVendors.filter((v: any) => {
    if (!v.contract_expiry) return false;
    const d = daysUntilExpiry(v.contract_expiry);
    return d >= 0 && d <= 90 && !dismissedAlerts.includes(v.id);
  });
  const alertVendors = [...expiredVendors, ...expiringSoon];


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "hsl(var(--text-1))" }}>
            <Building2 size={20} weight="fill" style={{ color: "hsl(var(--brand))" }} />
            Vendor Registry
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(var(--text-4))" }}>
            Manage AI vendor relationships, risk tiers, and contract compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => toast.success("Exported vendor report")}>
            <Export size={14} className="mr-1.5" /> Export
          </Button>
          <Button size="sm" style={{ borderRadius: 0, background: "hsl(var(--brand))", color: "#fff" }} onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1.5" /> Add Vendor
          </Button>
        </div>
      </div>

      {/* Contract Expiry Alerts */}
      {alertVendors.length > 0 && (
        <div className="space-y-2">
          {alertVendors.map(v => {
            const days = daysUntilExpiry(v.contract_expiry || '');
            const expired = days < 0;
            return (
              <div
                key={v.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: expired ? "hsl(0 72% 51% / 0.08)" : "hsl(45 93% 47% / 0.08)",
                  border: `1px solid ${expired ? "hsl(0 72% 51% / 0.25)" : "hsl(45 93% 47% / 0.25)"}`,
                  borderRadius: 0,
                }}
              >
                <div className="flex items-center gap-3">
                  <Bell size={14} style={{ color: expired ? "hsl(var(--s-er-tx))" : "hsl(45 85% 40%)" }} />
                  <span className="text-sm font-medium" style={{ color: "hsl(var(--text-1))" }}>
                    {expired
                      ? `Contract EXPIRED — ${v.name} (${v.category})`
                      : `Contract expiring in ${days} days — ${v.name} (${v.category})`}
                  </span>
                  <span className="text-xs" style={{ color: "hsl(var(--text-4))" }}>
                    Expiry: {v.contract_expiry} · Tier {v.risk_tier} · {v.contact_email || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ borderRadius: 0, fontSize: 11, padding: "2px 10px" }}
                    onClick={() => { setSel(v); }}
                  >
                    View
                  </Button>
                  <button
                    onClick={() => setDismissedAlerts(a => [...a, v.id])}
                    style={{ color: "hsl(var(--text-4))" }}
                    className="hover:opacity-70"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Building2 size={20} style={{ color: "hsl(var(--brand))" }} />
              <div>
                <div className="text-xs" style={{ color: "hsl(var(--text-4))" }}>Total Vendors</div>
                <div className="text-2xl font-bold" style={{ color: "hsl(var(--text-1))" }}>{allVendors.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} style={{ color: "hsl(var(--s-ok-tx))" }} />
              <div>
                <div className="text-xs" style={{ color: "hsl(var(--text-4))" }}>Active</div>
                <div className="text-2xl font-bold" style={{ color: "hsl(var(--s-ok-tx))" }}>{allVendors.filter((v: any) => v.status === "active").length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Shield size={20} style={{ color: "hsl(var(--s-er-tx))" }} />
              <div>
                <div className="text-xs" style={{ color: "hsl(var(--text-4))" }}>Tier 1 (Critical)</div>
                <div className="text-2xl font-bold" style={{ color: "hsl(var(--s-er-tx))" }}>{allVendors.filter((v: any) => v.risk === 'critical' || v.risk === 'high').length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} style={{ color: "hsl(45 85% 40%)" }} />
              <div>
                <div className="text-xs" style={{ color: "hsl(var(--text-4))" }}>Contract Alerts</div>
                <div className="text-2xl font-bold" style={{ color: expiredVendors.length > 0 ? "hsl(var(--s-er-tx))" : "hsl(45 85% 40%)" }}>
                  {expiredVendors.length + expiringSoon.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "hsl(var(--text-4))" }} />
        <Input
          placeholder="Search vendors..."
          className="pl-9"
          style={{ borderRadius: 0, background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))" }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Vendor Table */}
      <Card style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
        <Table>
          <TableHeader style={{ background: "hsl(var(--bg-muted))" }}>
            <TableRow style={{ borderBottom: "1px solid hsl(var(--border))" }}>
              {["ID", "Name", "Category", "AI Services", "Risk Tier", "Status", "Last Assessment", "Contract Expiry"].map(h => (
                <TableHead key={h} className="text-xs font-semibold py-2.5" style={{ color: "hsl(var(--text-2))" }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(v => {
              const anyV = v as any;
              const exp = expiryLabel(anyV.contract_expiry || '');
              return (
                <TableRow
                  key={v.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid hsl(var(--border))" }}
                  onClick={() => setSel(v)}
                >
                  <TableCell className="font-mono text-xs py-3" style={{ color: "hsl(var(--brand))" }}>{v.id}</TableCell>
                  <TableCell className="font-semibold text-sm py-3" style={{ color: "hsl(var(--text-1))" }}>{v.name}</TableCell>
                  <TableCell className="text-xs py-3" style={{ color: "hsl(var(--text-3))" }}>{anyV.category}</TableCell>
                  <TableCell className="text-xs py-3 max-w-[180px] truncate" style={{ color: "hsl(var(--text-4))" }}>{anyV.services}</TableCell>
                  <TableCell className="py-3">{tierBadge(anyV.risk_tier)}</TableCell>
                  <TableCell className="py-3">{statusBadge(v.status || '')}</TableCell>
                  <TableCell className="text-xs py-3" style={{ color: "hsl(var(--text-4))" }}>{anyV.last_assessment}</TableCell>
                  <TableCell className="py-3">
                    <span className="text-xs font-mono px-1.5 py-0.5" style={{ background: exp.bg, color: exp.color }}>
                      {exp.label !== anyV.contract_expiry ? `${exp.label} — ${anyV.contract_expiry}` : anyV.contract_expiry}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Vendor Detail Dialog */}
      <Dialog open={!!sel} onOpenChange={() => setSel(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 580 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "hsl(var(--text-1))" }}>
              <Building2 size={18} style={{ color: "hsl(var(--brand))" }} />
              {sel?.name}
            </DialogTitle>
          </DialogHeader>
          {sel && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList style={{ borderRadius: 0 }}>
                <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                <TabsTrigger value="contract" style={{ borderRadius: 0 }}>Contract</TabsTrigger>
                <TabsTrigger value="assessment" style={{ borderRadius: 0 }}>Assessment</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Vendor ID", value: sel.id, mono: true },
                    { label: "Category", value: sel.category },
                    { label: "AI Services", value: sel.services },
                    { label: "Contact", value: sel.contact, mono: true },
                  ].map(f => (
                    <div key={f.label} className="p-3" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                      <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>{f.label}</span>
                      <span className={`text-sm ${f.mono ? "font-mono" : "font-medium"}`} style={{ color: "hsl(var(--text-1))" }}>{f.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 p-3" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                  <div className="flex-1">
                    <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>Risk Tier</span>
                    {tierBadge(sel.riskTier)}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>Status</span>
                    {statusBadge(sel.status)}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contract" className="space-y-3 mt-4">
                {(() => {
                  const days = daysUntilExpiry(sel.contractExpiry);
                  const expired = days < 0;
                  const expiringSoonLocal = days >= 0 && days <= 90;
                  return (
                    <>
                      {(expired || expiringSoonLocal) && (
                        <div className="flex items-center gap-3 px-3 py-2.5" style={{
                          background: expired ? "hsl(0 72% 51% / 0.08)" : "hsl(45 93% 47% / 0.08)",
                          border: `1px solid ${expired ? "hsl(0 72% 51% / 0.25)" : "hsl(45 93% 47% / 0.25)"}`,
                          borderRadius: 0,
                        }}>
                          <AlertTriangle size={14} style={{ color: expired ? "hsl(var(--s-er-tx))" : "hsl(45 85% 40%)" }} />
                          <span className="text-sm font-medium" style={{ color: expired ? "hsl(var(--s-er-tx))" : "hsl(45 85% 40%)" }}>
                            {expired ? "Contract has expired — immediate action required" : `Contract expires in ${days} days`}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                          <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>Contract Expiry</span>
                          <span className="text-sm font-mono font-semibold" style={{ color: expired ? "hsl(var(--s-er-tx))" : "hsl(var(--text-1))" }}>{sel.contractExpiry}</span>
                        </div>
                        <div className="p-3" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                          <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>Days Remaining</span>
                          <span className="text-sm font-bold" style={{ color: expired ? "hsl(var(--s-er-tx))" : days <= 30 ? "hsl(45 85% 40%)" : "hsl(var(--text-1))" }}>
                            {expired ? `${Math.abs(days)} days overdue` : `${days} days`}
                          </span>
                        </div>
                        <div className="p-3" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                          <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>Last Assessment</span>
                          <span className="text-sm font-mono" style={{ color: "hsl(var(--text-1))" }}>{sel.lastAssessment}</span>
                        </div>
                        <div className="p-3" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                          <span className="text-xs block mb-1" style={{ color: "hsl(var(--text-4))" }}>Risk Tier</span>
                          {tierBadge(sel.riskTier)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="assessment" className="space-y-3 mt-4">
                {[
                  { label: "Data Handling", score: sel.riskTier === 1 ? "High Risk" : sel.riskTier === 2 ? "Medium Risk" : "Low Risk", ok: sel.riskTier === 3 },
                  { label: "SOC 2 Type II", score: "Certified", ok: true },
                  { label: "GDPR / CCPA", score: "Compliant", ok: true },
                  { label: "EU AI Act", score: sel.riskTier === 1 ? "Under Review" : "Compliant", ok: sel.riskTier !== 1 },
                  { label: "Penetration Test", score: "Last: 2025-Q4", ok: true },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between px-3 py-2.5" style={{ background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}>
                    <span className="text-sm" style={{ color: "hsl(var(--text-1))" }}>{r.label}</span>
                    <Badge style={{ background: r.ok ? "hsl(142 71% 45% / 0.10)" : "hsl(45 93% 47% / 0.10)", color: r.ok ? "hsl(var(--s-ok-tx))" : "hsl(45 85% 40%)", borderRadius: 0, fontSize: 10 }}>
                      {r.score}
                    </Badge>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => { toast.info(`Assessment initiated for ${sel?.name}`); setSel(null); }}>
              <Clock size={13} className="mr-1.5" /> Request Assessment
            </Button>
            <Button style={{ borderRadius: 0, background: "hsl(var(--brand))", color: "#fff" }} onClick={() => setSel(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vendor Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle style={{ color: "hsl(var(--text-1))" }}>Add New Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { label: "Vendor Name", placeholder: "e.g., Cohere" },
              { label: "Category", placeholder: "e.g., AI Model Provider" },
              { label: "AI Services", placeholder: "e.g., Command R, Embed" },
              { label: "Contact Email", placeholder: "enterprise@vendor.com" },
              { label: "Contract Expiry", placeholder: "YYYY-MM-DD" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs font-semibold block mb-1" style={{ color: "hsl(var(--text-2))" }}>{f.label}</label>
                <Input placeholder={f.placeholder} style={{ borderRadius: 0, background: "hsl(var(--bg-surface))", border: "1px solid hsl(var(--border))" }} />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "hsl(var(--text-2))" }}>Risk Tier</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(t => (
                  <button key={t} className="px-4 py-1.5 text-xs font-medium border" style={{ borderRadius: 0, borderColor: "hsl(var(--border))", color: "hsl(var(--text-3))" }}>
                    Tier {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: "hsl(var(--brand))", color: "#fff" }} onClick={() => { toast.success("Vendor added to registry"); setAddOpen(false); }}>
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
