import { PageWrapper } from "../components/layout/PageWrapper";
import { EvidenceUploader } from "../components/compliance/EvidenceUploader";
import { Button } from "../components/ui/button";

const sampleEvidence = [
  { id: "1", name: "pii-scan-report-q4.pdf", framework: "GDPR", controlId: "Art.35", uploadedAt: "2025-01-15", status: "verified" as const },
  { id: "2", name: "bias-audit-gpt4o.json", framework: "EU AI Act", controlId: "Art.9", uploadedAt: "2025-01-14", status: "pending" as const },
  { id: "3", name: "model-card-v2.md", framework: "NIST AI RMF", controlId: "MAP-1.1", uploadedAt: "2025-01-13", status: "verified" as const },
  { id: "4", name: "incident-response-plan.docx", framework: "ISO 42001", controlId: "A.6.2", uploadedAt: "2025-01-12", status: "rejected" as const },
];

export default function EvidenceVault() {
  return (
    <PageWrapper
      title="Evidence Vault"
      description="Upload and manage compliance evidence across all frameworks"
      actions={<Button>Upload Evidence</Button>}
    >
      <EvidenceUploader evidence={sampleEvidence} />
    </PageWrapper>
  );
}
