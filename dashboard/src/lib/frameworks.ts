// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
//
// The source of truth is /frameworks/*.yaml at the repo root. At build
// time, the manifest (/frameworks/manifest.json) is imported here as a
// typed object. Full control bodies are fetched lazily from the Worker
// that serves static framework assets.

import manifest from "../../../frameworks/manifest.json";

export interface FrameworkSummary {
  id: string;
  name: string;
  version: string;
  authority: string;
  url: string;
  domain:
    | "attestation"
    | "infosec"
    | "privacy"
    | "cybersecurity"
    | "federal"
    | "payments"
    | "healthcare"
    | "ai-governance"
    | "financial";
  control_count: number;
}

export interface FrameworkManifest {
  generated_at: string;
  framework_count: number;
  control_count: number;
  frameworks: FrameworkSummary[];
}

const typedManifest = manifest as FrameworkManifest;

export function listFrameworks(): FrameworkSummary[] {
  return typedManifest.frameworks;
}

export function getFramework(id: string): FrameworkSummary | undefined {
  return typedManifest.frameworks.find((f) => f.id === id);
}

export function frameworksByDomain(domain: FrameworkSummary["domain"]): FrameworkSummary[] {
  return typedManifest.frameworks.filter((f) => f.domain === domain);
}

export const FRAMEWORK_COUNT = typedManifest.framework_count;
export const TOTAL_CONTROL_COUNT = typedManifest.control_count;
