#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Generate the User guide content from the repo's real module documentation.

The User guide panel used to carry hand-written prose that had drifted from
both the menu and the docs — it described eleven "collections" while the
product shipped ten menu sections, and nothing kept the two in step.

This generator removes the drift by deriving the guide from two sources that
are already maintained:

  1. ``dashboard/src/data/navigation.ts`` — the menu itself, so the guide is
     organised by the sections a user actually sees, and every destination in
     the menu gets an entry.
  2. ``docs/modules/*.md`` — the authored module documentation, so the words in
     the guide are the words engineering already reviewed, not invented prose.

Where a menu destination has no module doc, the entry is emitted with
``hasDoc: false`` and NO body. The UI renders an honest "not documented yet"
state for those; it never fabricates a description. The coverage numbers are
printed on every run and embedded in the output so the gap is visible rather
than implied away.

Usage::

    python3 scripts/gen_module_guides.py           # write
    python3 scripts/gen_module_guides.py --check   # CI staleness gate
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NAV_TS = ROOT / "dashboard" / "src" / "data" / "navigation.ts"
MODULE_DOCS = ROOT / "docs" / "modules"
OUT = ROOT / "dashboard" / "src" / "data" / "moduleGuides.generated.ts"

# Headings in docs/modules/*.md are not perfectly uniform (the corpus grew over
# many waves). Fold the synonyms onto one canonical set so the guide renders a
# consistent shape for every module.
HEADING_ALIASES = {
    "purpose": "purpose",
    "why it exists": "why",
    "why this module exists": "why",
    "why the module exists": "why",
    "how it works": "how",
    "workflow": "how",
    "lifecycle": "how",
    "tier model": "how",
    "fields": "fields",
    "field reference": "fields",
    "data backing": "data",
    "interlinks": "interlinks",
    "interlinks (both directions)": "interlinks",
    "compliance": "compliance",
    "standards alignment": "compliance",
    "operations": "operations",
    "evidence": "evidence",
    "history": "history",
}

# Menu destinations that deliberately have no module doc of their own: they are
# navigational shells or thin redirects onto a documented module. Listing them
# here keeps them out of the "undocumented" count with a stated reason, rather
# than quietly inflating coverage.
NO_DOC_REASON: dict[str, str] = {
    "/settings": "Workspace settings — documented in docs/getting-started/dashboard-setup.md.",
}

# Curated route -> doc pairings for destinations whose slug does not match their
# doc filename. Several docs are deliberately umbrella documents covering a
# whole menu group (e.g. `executive-surfaces` documents the entire HOME
# section), so more than one route legitimately resolves to the same file.
#
# This map is hand-maintained ON PURPOSE: a fuzzy matcher would silently pair a
# route with a doc about something else, which is worse than an honest gap.
ROUTE_TO_DOC: dict[str, str] = {
    # HOME — one umbrella doc covers the executive surfaces
    "/overview": "executive-surfaces",
    "/ciso": "executive-surfaces",
    "/ciso/report": "executive-surfaces",
    "/peer-intelligence": "executive-surfaces",
    # AI ASSETS
    "/models/inventory": "model-inventory",
    "/models/lifecycle": "model-inventory",
    "/models/dna": "model-inventory",
    "/use-cases": "knowledge-and-marketplace",
    "/knowledge-graph": "knowledge-and-marketplace",
    "/agents": "agent-platform",
    "/agent-iam": "agent-platform",
    "/multi-agent": "agent-platform",
    "/datasets": "data-governance",
    "/data-lineage": "data-governance",
    "/data-quality": "data-governance",
    # ASSESS & VALIDATE
    "/model-validation": "red-team-evals",
    "/evals/metric-studio": "red-team-evals",
    "/evals/dataset-create": "red-team-evals",
    "/evals/dataset-preview": "red-team-evals",
    "/evals/multi-turn": "red-team-evals",
    "/evals/conversation": "red-team-evals",
    "/evals/benchmark": "red-team-evals",
    "/bias-audits": "bias-fairness",
    # SECURITY
    "/security/scans": "security-intelligence",
    "/security/threats": "security-intelligence",
    "/security/attack-surface": "security-intelligence",
    "/security/vuln-tracker": "security-intelligence",
    "/security/policies": "security-intelligence",
    "/security/keys": "security-intelligence",
    "/security/red-team": "red-team-evals",
    "/red-team-findings": "red-team-evals",
    "/security/model-arena": "red-team-evals",
    "/security/jit": "rbac-organization",
    "/security/mfa": "rbac-organization",
    "/security/reports": "reporting",
    # RISK & INCIDENTS
    "/risk/incidents": "incident-management",
    "/incident-workflow": "incident-management",
    "/incidents/playbooks": "incident-management",
    "/tabletop": "tabletop-exercises",
    "/remediation-tracker": "remediation-tasks",
    "/hitl": "hitl-review",
    # These have dedicated docs but were falling through to fuzzy matching,
    # which rendered an unrelated module's guide. Pin them explicitly.
    "/workflows": "approval-workflows",
    "/automation-studio": "automation-studio",
    # COMPLIANCE & REGULATORY
    "/compliance": "compliance-overview",
    "/frameworks": "frameworks",
    "/conformity": "conformity-assessment",
    "/compliance/controls": "controls-control-testing",
    "/control-testing": "controls-control-testing",
    "/evidence-vault": "evidence-management",
    "/documents": "evidence-management",
    "/audit-trail": "audit-log-trail",
    "/policies": "policy-management",
    "/compliance/policy-templates": "policy-management",
    "/policy-editor": "policy-management",
    # Reg Radar family — each has its own doc; stop fuzzy-matching them to
    # incident-management / explainability / model-inventory.
    "/regulator-filings": "regulator-filings",
    "/transparency-reports": "transparency-reports",
    "/post-market": "post-market",
    # PRIVACY
    "/dsr": "dsr-consent",
    "/consent-management": "dsr-consent",
    "/tia": "transfer-impact-assessment",
    # VENDORS & SUPPLY CHAIN
    "/vendors/assessments": "vendor-assessments",
    "/vendors/sla": "vendor-sla",
    "/supply-chain": "supply-chain-attestations",
    # ADMIN
    "/access-control": "rbac-organization",
    "/access-control/users": "rbac-organization",
    "/access-control/roles": "rbac-organization",
    "/access-control/departments": "rbac-organization",
    "/bia": "business-impact-analysis",
    "/maturity": "benchmarking-maturity",
    "/governance-mesh": "agent-platform",
    "/narrative-engine": "ai-advisor-narrative",
    "/export": "reporting",
}


# ── Navigation parsing ───────────────────────────────────────────────────────

def parse_nav() -> list[dict]:
    """Read the menu structure out of navigation.ts.

    The file is generated/maintained in a regular shape, so a line-oriented
    parse is sufficient and avoids adding a TS toolchain dependency here.
    """
    src = NAV_TS.read_text(encoding="utf-8")
    src = src[src.index("export const NAV") :]

    sections: list[dict] = []
    current: dict | None = None
    parent: dict | None = None

    for raw in src.split("\n"):
        line = raw.strip()

        m = re.match(r"title:\s*'([^']+)'", line)
        if m:
            current = {"title": m.group(1), "items": []}
            sections.append(current)
            parent = None
            continue

        if current is None:
            continue

        m = re.match(r"\{?\s*label:\s*'([^']+)',\s*to:\s*'([^']+)'", line)
        if not m:
            continue
        label, to = m.group(1), m.group(2)
        if "icon:" in line:
            # A top-level item always carries an icon.
            current["items"].append({"label": label, "to": to, "children": []})
            parent = current["items"][-1]
        elif parent is not None:
            parent["children"].append({"label": label, "to": to})
        elif current["items"]:
            current["items"][-1]["children"].append({"label": label, "to": to})

    return sections


def section_id(title: str) -> str:
    s = title.lower().replace("&", " ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


# ── Module doc parsing ───────────────────────────────────────────────────────

def strip_md(text: str) -> str:
    """Reduce inline markdown to plain text for rendering in the panel."""
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\*\*([^*]*)\*\*", r"\1", text)
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text.strip()


def parse_doc(path: pathlib.Path) -> dict:
    """Parse one module doc into a title plus canonical sections."""
    lines = path.read_text(encoding="utf-8").split("\n")
    title = path.stem.replace("-", " ").title()
    sections: dict[str, list[str]] = {}
    table_rows: list[list[str]] = []

    current: str | None = None
    in_table = False
    in_code = False
    declared_routes: list[str] = []

    for raw in lines:
        line = raw.rstrip()

        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue

        # Many docs declare the routes they cover in a "**Route:** `/x`, `/y`"
        # preamble. That statement comes from the doc's author, so it is a more
        # reliable pairing than any slug heuristic.
        if not declared_routes and re.match(r"^\s*\*\*Routes?:\*\*", line):
            declared_routes = re.findall(r"`(/[^`]*)`", line)

        m = re.match(r"^#\s+(.+?)\s*$", line)
        if m:
            title = strip_md(m.group(1))
            continue

        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            raw_head = strip_md(m.group(1)).lower()
            raw_head = re.sub(r"\s*\(wired[^)]*\)", "", raw_head).strip()
            current = HEADING_ALIASES.get(raw_head)
            in_table = False
            continue

        if current is None or not line.strip():
            in_table = False
            continue

        # Field tables become structured rows on the "fields" section.
        if line.lstrip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in cells):
                in_table = True
                continue
            if current == "fields" or in_table:
                table_rows.append([strip_md(c) for c in cells])
                continue

        text = strip_md(re.sub(r"^\s*[-*]\s+", "", line))
        if text:
            sections.setdefault(current, []).append(text)

    return {
        "title": title,
        "sections": sections,
        "fields": table_rows,
        "routes": declared_routes,
    }


def slugify(text: str) -> str:
    s = text.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def build_doc_index() -> dict[str, dict]:
    """slug -> parsed doc, keyed by filename and by document title."""
    index: dict[str, dict] = {}
    for path in sorted(MODULE_DOCS.glob("*.md")):
        if path.stem.lower() == "readme":
            continue
        doc = parse_doc(path)
        doc["slug"] = path.stem
        doc["path"] = str(path.relative_to(ROOT))
        index[path.stem] = doc
    return index


def match_doc(label: str, route: str, index: dict[str, dict]) -> dict | None:
    """Resolve a menu destination to its module doc, or None."""
    by_title = {slugify(d["title"]): d for d in index.values()}
    by_route: dict[str, dict] = {}
    for d in index.values():
        for r in d.get("routes", []):
            by_route.setdefault(r.rstrip("/") or "/", d)

    # An explicit pairing always wins over the slug heuristics below.
    mapped = ROUTE_TO_DOC.get(route)
    if mapped:
        if mapped not in index:
            raise SystemExit(
                f"error: ROUTE_TO_DOC maps {route} -> docs/modules/{mapped}.md, "
                "which does not exist"
            )
        return index[mapped]

    # A route the doc itself declares it covers.
    norm = route.rstrip("/") or "/"
    if norm in by_route:
        return by_route[norm]
    # `/risk/matrix` in the menu vs `/risk-matrix` as declared, and vice versa.
    if norm.replace("/", "-", 1).replace("--", "-") in by_route:
        return by_route[norm.replace("/", "-", 1).replace("--", "-")]
    alt = "/" + norm.strip("/").replace("/", "-")
    if alt in by_route:
        return by_route[alt]

    candidates = [
        route.strip("/").replace("/", "-"),
        route.strip("/").split("/")[-1],
        route.strip("/").split("/")[0],
        slugify(label),
    ]
    for cand in candidates:
        if not cand:
            continue
        if cand in index:
            return index[cand]
        if cand in by_title:
            return by_title[cand]
    return None


# ── Emit ─────────────────────────────────────────────────────────────────────

def build() -> tuple[str, dict]:
    nav = parse_nav()
    index = build_doc_index()

    collections = []
    matched = 0
    total = 0
    undocumented: list[str] = []
    used_docs: set[str] = set()

    for sec in nav:
        entries = []
        destinations: list[tuple[str, str, str | None]] = []
        for item in sec["items"]:
            destinations.append((item["label"], item["to"], None))
            for child in item["children"]:
                destinations.append((child["label"], child["to"], item["label"]))

        for label, route, parent in destinations:
            total += 1
            doc = match_doc(label, route, index)
            if doc:
                matched += 1
                used_docs.add(doc["slug"])
            elif route not in NO_DOC_REASON:
                undocumented.append(f"{sec['title']} › {label} ({route})")

            entry = {
                "label": label,
                "route": route,
                "parentLabel": parent,
                "hasDoc": bool(doc),
                "docPath": doc["path"] if doc else None,
                "title": doc["title"] if doc else label,
                "purpose": " ".join(doc["sections"].get("purpose", []))[:600] if doc else None,
                "why": " ".join(doc["sections"].get("why", []))[:600] if doc else None,
                "how": doc["sections"].get("how", [])[:12] if doc else [],
                "dataProcess": doc["sections"].get("data", [])[:10] if doc else [],
                "interlinks": doc["sections"].get("interlinks", [])[:12] if doc else [],
                "compliance": doc["sections"].get("compliance", [])[:12] if doc else [],
                "operations": doc["sections"].get("operations", [])[:8] if doc else [],
                "fields": (doc["fields"][:24] if doc else []),
                "noDocReason": NO_DOC_REASON.get(route),
            }
            entries.append(entry)

        collections.append(
            {
                "id": section_id(sec["title"]),
                "title": sec["title"],
                "entryCount": len(entries),
                "documentedCount": sum(1 for e in entries if e["hasDoc"]),
                "entries": entries,
            }
        )

    stats = {
        "total": total,
        "matched": matched,
        "undocumented": undocumented,
        "docsAvailable": len(index),
        "docsUsed": len(used_docs),
        "docsUnused": sorted(set(index) - used_docs),
    }

    payload = json.dumps(collections, ensure_ascii=False, indent=2)

    ts = f'''// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// GENERATED FILE — DO NOT EDIT BY HAND.
// Sources: dashboard/src/data/navigation.ts + docs/modules/*.md
// Generator: scripts/gen_module_guides.py
// Regenerate with:  python3 scripts/gen_module_guides.py
//
// The User guide is derived, not authored twice. Its collections ARE the menu
// sections, and each entry's body is the module's own reviewed documentation.
// A menu destination with no module doc is emitted with `hasDoc: false` and no
// body — the panel shows an honest "not documented yet" state for it. Coverage
// is recorded below so the gap is measurable instead of invisible.

/** One row of a module's field table, as authored in its doc. */
export type GuideFieldRow = string[]

export interface GuideEntry {{
  /** Menu label, exactly as it appears in the sidebar. */
  label: string
  /** Route the menu entry navigates to. */
  route: string
  /** Parent menu item when this is a nested entry, else null. */
  parentLabel: string | null
  /** False when no docs/modules/*.md could be resolved for this destination. */
  hasDoc: boolean
  /** Repo-relative path of the source doc, for "view source" links. */
  docPath: string | null
  /** Document title (falls back to the menu label when undocumented). */
  title: string
  purpose: string | null
  why: string | null
  how: string[]
  /** How data reaches this module — the real tables/services it reads. */
  dataProcess: string[]
  interlinks: string[]
  compliance: string[]
  operations: string[]
  fields: GuideFieldRow[]
  /** Stated reason a destination intentionally has no module doc. */
  noDocReason: string | null
}}

export interface GuideCollection {{
  /** Slug of the menu section title. */
  id: string
  /** Menu section title, verbatim. */
  title: string
  entryCount: number
  documentedCount: number
  entries: GuideEntry[]
}}

/** Menu destinations covered by the guide. */
export const GUIDE_TOTAL_ENTRIES = {total}

/** Destinations backed by an authored module doc. */
export const GUIDE_DOCUMENTED_ENTRIES = {matched}

/** Module docs available in docs/modules/. */
export const MODULE_DOCS_AVAILABLE = {len(index)}

export const GUIDE_COLLECTIONS: GuideCollection[] = {payload}
'''
    return ts, stats


def main() -> int:
    ts, stats = build()
    check = "--check" in sys.argv

    pct = (stats["matched"] / stats["total"] * 100) if stats["total"] else 0.0
    print(
        f"guide coverage: {stats['matched']}/{stats['total']} menu destinations "
        f"documented ({pct:.0f}%); {stats['docsUsed']}/{stats['docsAvailable']} module docs used"
    )
    if stats["undocumented"]:
        print(f"undocumented destinations ({len(stats['undocumented'])}):")
        for name in stats["undocumented"]:
            print(f"  - {name}")

    if check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != ts:
            print(
                f"error: {OUT.relative_to(ROOT)} is stale.\n"
                "       Run: python3 scripts/gen_module_guides.py",
                file=sys.stderr,
            )
            return 1
        print(f"{OUT.relative_to(ROOT)} is up to date")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(ts, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
