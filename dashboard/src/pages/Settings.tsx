// dashboard/src/pages/Settings.tsx

import { useConfig, useUpdateConfig } from "../hooks/use-config";
import { useApiKeys, useCreateKey, useRevokeKey } from "../hooks/use-keys";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { useState } from "react";

export function Settings() {
  const { data: config, isLoading: configLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  const { data: keys, isLoading: keysLoading } = useApiKeys();
  const createKey = useCreateKey();
  const revokeKey = useRevokeKey();
  const [newKeyName, setNewKeyName] = useState("");
  const [threshold, setThreshold] = useState("");

  if (configLoading || !config) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Trust Score Threshold</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Threshold</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              className="w-32"
              defaultValue={config.trust_score_threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <Button
              size="sm"
              onClick={() => updateConfig.mutate({ trust_score_threshold: Number(threshold) })}
              disabled={!threshold || updateConfig.isPending}
            >
              Save
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Primary model: {config.primary_model} | Fallback: {config.fallback_model}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-64"
            />
            <Button
              size="sm"
              onClick={() => { createKey.mutate(newKeyName); setNewKeyName(""); }}
              disabled={!newKeyName || createKey.isPending}
            >
              Create Key
            </Button>
          </div>
          {keysLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-2">
              {keys?.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <span className="font-medium text-sm">{k.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{k.prefix}...</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revokeKey.mutate(k.id)}
                    disabled={revokeKey.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}