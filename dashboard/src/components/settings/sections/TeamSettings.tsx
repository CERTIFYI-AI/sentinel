// src/components/settings/sections/TeamSettings.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../api/client";
import type { TeamMember } from "../../../api/types";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Badge } from "../../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Trash2, Shield } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "editor", "viewer"]),
});
type InviteForm = z.infer<typeof inviteSchema>;

export function TeamSettings() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: () => api<TeamMember[]>("/api/team/members"),
  });
  const invite = useMutation({
    mutationFn: (data: InviteForm) =>
      api("/api/team/invites", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members"] }),
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "viewer" },
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite Member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => { invite.mutate(d); reset(); })} className="flex items-end gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" placeholder="name@company.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="w-36 space-y-1">
              <Label htmlFor="inv-role">Role</Label>
              <select id="inv-role" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register("role")}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={invite.isPending}>Send Invite</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Members</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.name}</TableCell>
                    <TableCell className="font-mono text-sm">{m.email}</TableCell>
                    <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                    <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
