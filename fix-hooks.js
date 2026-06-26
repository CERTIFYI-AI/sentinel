const fs = require('fs');

const files = [
  "dashboard/src/pages/ComplianceControls.tsx",
  "dashboard/src/pages/ComplianceFrameworks.tsx",
  "dashboard/src/pages/Datasets.tsx",
  "dashboard/src/pages/EthicsReporting.tsx",
  "dashboard/src/pages/EvidenceVault.tsx",
  "dashboard/src/pages/GapAnalysis.tsx",
  "dashboard/src/pages/IncidentLog.tsx",
  "dashboard/src/pages/PolicyManagement.tsx",
  "dashboard/src/pages/Remediation.tsx",
  "dashboard/src/pages/RemediationTracker.tsx",
  "dashboard/src/pages/RiskRegister.tsx",
  "dashboard/src/pages/continuity/BusinessContinuity.tsx",
  "dashboard/src/pages/training/TrainingAwareness.tsx"
];

const patterns = [
  /^[ \t]*if[ \t]*\(isLoading\)[ \t]*return[ \t]*<PageSkeleton(?:[ \t]*\/)?>;[ \t]*\n/m,
  /^[ \t]*if[ \t]*\(isLoading\)[ \t]*return[ \t]*<Skeleton(?:[ \t]*\/)?>;[ \t]*\n/m
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let matched = null;
  let patternUsed = null;
  
  for (const p of patterns) {
    const match = content.match(p);
    if (match) {
      matched = match[0];
      patternUsed = p;
      break;
    }
  }

  if (matched) {
    // Remove the early return
    content = content.replace(patternUsed, '');
    
    // Find the main return (usually `  return (` or similar)
    // We want the last return in the main component body, but regex might be tricky.
    // So let's find `return (` or `return <` that is top-level (2 spaces indent).
    const returnRegex = /^  return[ \t]*[<|\(]/m;
    const returnMatch = content.match(returnRegex);
    
    if (returnMatch) {
      content = content.substring(0, returnMatch.index) + matched + content.substring(returnMatch.index);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Fixed ${file}`);
    } else {
      console.log(`Could not find main return in ${file}`);
    }
  } else {
    console.log(`Could not find isLoading return in ${file}`);
  }
}
