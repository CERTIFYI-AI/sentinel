#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Generate the release data behind the dashboard's "What's new" panel.

CHANGELOG.md is the single source of truth for what shipped. Before this
generator existed, the panel hard-coded a version string ("Sentinel v1.43.0",
"2 hours ago", "Release 57") that drifted from reality and linked to a git tag
that was never cut — a fabricated metric on the user's screen, which the
platform's first principles forbid.

This script parses the real CHANGELOG and emits a typed TS module. Run it
whenever CHANGELOG.md changes:

    python3 scripts/gen_release_notes.py

CI (`npm run verify:generated`) re-runs it and fails if the committed output is
stale, so the panel cannot silently fall behind the changelog again.

Heading variants handled (all three occur in this repo's history):

    ## Unreleased
    ## 1.66.0 (2026-08-17)
    ## [1.0.0] - 2026-04-18

Entries are top-level ``*`` bullets. Continuation lines (indented, wrapped
prose) are folded into the bullet they belong to, and ``###`` sub-headings
inside a release are preserved as a section label on the entries that follow.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHANGELOG = ROOT / "CHANGELOG.md"
OUT = ROOT / "dashboard" / "src" / "data" / "releases.generated.ts"

# Full entry text is kept for this many of the most recent releases. Older ones
# keep version/date/count only, so the bundle stays small. The cut-off is
# reported in the generated file and surfaced in the UI — never a silent trim.
DETAILED_RELEASES = 12

HEADING = re.compile(
    r"^##\s+(?:\[(?P<bracket>[0-9][^\]]*)\]\s*-\s*(?P<bdate>\S+)"  # ## [1.0.0] - 2026-04-18
    r"|(?P<version>[0-9][^\s(]*)\s*\((?P<date>[^)]+)\)"            # ## 1.66.0 (2026-08-17)
    r"|(?P<unreleased>Unreleased))\s*$",
    re.IGNORECASE,
)
SUBHEADING = re.compile(r"^###\s+(?P<title>.+?)\s*$")
BULLET = re.compile(r"^\*\s+(?P<text>.+?)\s*$")
# trailing "([abc1234](https://github.com/.../commit/abc1234))" on changelog lines
COMMIT_REF = re.compile(r"\s*\(\[(?P<sha>[0-9a-f]{6,40})\]\((?P<url>[^)]+)\)\)")
# conventional-commit prefix: "feat(scope): summary"
CONVENTIONAL = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<bang>!)?:\s*(?P<rest>.+)$", re.S)
# ", closes [#75](url)" tails
CLOSES = re.compile(r",?\s*closes\s+(\[#\d+\]\([^)]+\)\s*)+$", re.I)


def _clean(text: str) -> tuple[str, str | None]:
    """Strip the commit backref off an entry; return (text, sha)."""
    sha = None
    m = COMMIT_REF.search(text)
    if m:
        sha = m.group("sha")[:7]
        text = COMMIT_REF.sub("", text)
    text = CLOSES.sub("", text)
    return text.strip(), sha


def parse(md: str) -> list[dict]:
    releases: list[dict] = []
    current: dict | None = None
    section: str | None = None
    pending: dict | None = None

    def flush() -> None:
        nonlocal pending
        if pending is not None and current is not None:
            current["entries"].append(pending)
        pending = None

    for raw in md.split("\n"):
        line = raw.rstrip()

        m = HEADING.match(line)
        if m:
            flush()
            if m.group("unreleased"):
                version, date = "Unreleased", None
            elif m.group("bracket"):
                version, date = m.group("bracket"), m.group("bdate")
            else:
                version, date = m.group("version"), m.group("date")
            # A version can legitimately appear twice in this file's history
            # (an "Unreleased" block was cut twice); keep the first, which is
            # the most recent, and ignore the later duplicate.
            if any(r["version"] == version for r in releases):
                current = None
                continue
            current = {"version": version, "date": date, "entries": []}
            releases.append(current)
            section = None
            continue

        if current is None:
            continue

        m = SUBHEADING.match(line)
        if m:
            flush()
            section = m.group("title")
            continue

        m = BULLET.match(line)
        if m:
            flush()
            text, sha = _clean(m.group("text"))
            pending = {"text": text, "sha": sha, "section": section}
            continue

        # Continuation of the current bullet (indented wrapped prose).
        if pending is not None and line.strip() and line.startswith((" ", "\t")):
            text, sha = _clean(line.strip())
            pending["text"] = pending["text"].rstrip() + " " + text
            if sha and not pending["sha"]:
                pending["sha"] = sha

    flush()
    return releases


def classify(entry: dict) -> dict:
    """Split a conventional-commit entry into type / scope / summary."""
    m = CONVENTIONAL.match(entry["text"])
    if not m:
        return {**entry, "type": None, "scope": None, "summary": entry["text"], "breaking": False}
    return {
        **entry,
        "type": m.group("type"),
        "scope": m.group("scope"),
        "summary": m.group("rest").strip(),
        "breaking": bool(m.group("bang")),
    }


def ts_literal(value: object) -> str:
    """JSON is valid TS for these shapes, and json.dumps escapes correctly."""
    return json.dumps(value, ensure_ascii=False, indent=2)


def build() -> str:
    releases = [
        {**r, "entries": [classify(e) for e in r["entries"]]}
        for r in parse(CHANGELOG.read_text(encoding="utf-8"))
    ]

    released = [r for r in releases if r["version"] != "Unreleased"]
    unreleased = next((r for r in releases if r["version"] == "Unreleased"), None)

    detailed_cut = min(DETAILED_RELEASES, len(released))
    payload = []
    for idx, rel in enumerate(released):
        keep_entries = idx < detailed_cut
        payload.append(
            {
                "version": rel["version"],
                "date": rel["date"],
                "entryCount": len(rel["entries"]),
                "entries": [
                    {
                        "type": e["type"],
                        "scope": e["scope"],
                        "summary": e["summary"],
                        "breaking": e["breaking"],
                        "sha": e["sha"],
                        "section": e["section"],
                    }
                    for e in rel["entries"]
                ]
                if keep_entries
                else [],
                "detailed": keep_entries,
            }
        )

    unreleased_payload = (
        {
            "entryCount": len(unreleased["entries"]),
            "entries": [
                {
                    "type": e["type"],
                    "scope": e["scope"],
                    "summary": e["summary"],
                    "breaking": e["breaking"],
                    "sha": e["sha"],
                    "section": e["section"],
                }
                for e in unreleased["entries"]
            ],
        }
        if unreleased
        else {"entryCount": 0, "entries": []}
    )

    latest = payload[0]["version"] if payload else None

    return f'''// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// GENERATED FILE — DO NOT EDIT BY HAND.
// Source: CHANGELOG.md · Generator: scripts/gen_release_notes.py
// Regenerate with:  python3 scripts/gen_release_notes.py
//
// This is the real release history parsed from the repo's changelog. The
// "What's new" panel renders it directly, so the version a user sees is the
// version that actually shipped — not a hand-typed string.

/** One changelog entry, split from its conventional-commit prefix. */
export interface ReleaseEntry {{
  /** feat | fix | docs | chore | … — null when the entry is not conventional. */
  type: string | null
  /** The scope in `feat(scope):`, when present. */
  scope: string | null
  summary: string
  breaking: boolean
  /** Short commit sha the changelog linked, when present. */
  sha: string | null
  /** `###` sub-heading this entry appeared under, when present. */
  section: string | null
}}

export interface Release {{
  version: string
  /** ISO-ish date exactly as the changelog recorded it; null if it had none. */
  date: string | null
  /** Number of entries in the changelog for this release. */
  entryCount: number
  /** Entry text — populated only for the most recent releases (see `DETAILED_RELEASE_COUNT`). */
  entries: ReleaseEntry[]
  /** False when entry text was omitted to keep the bundle small. */
  detailed: boolean
}}

/** Work merged but not yet cut into a release. */
export interface UnreleasedChanges {{
  entryCount: number
  entries: ReleaseEntry[]
}}

/** The most recent released version, or null if the changelog has none. */
export const LATEST_VERSION: string | null = {json.dumps(latest)}

/**
 * Releases carrying full entry text. Older releases are listed with their
 * version, date and entry count only — the count is still real, so the UI can
 * say how many changes it is not showing rather than implying there were none.
 */
export const DETAILED_RELEASE_COUNT = {detailed_cut}

/** Total releases recorded in CHANGELOG.md. */
export const TOTAL_RELEASE_COUNT = {len(payload)}

export const RELEASES: Release[] = {ts_literal(payload)}

export const UNRELEASED: UnreleasedChanges = {ts_literal(unreleased_payload)}
'''


def main() -> int:
    if not CHANGELOG.exists():
        print(f"error: {CHANGELOG} not found", file=sys.stderr)
        return 1
    content = build()
    check = "--check" in sys.argv
    if check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != content:
            print(
                f"error: {OUT.relative_to(ROOT)} is stale.\n"
                "       Run: python3 scripts/gen_release_notes.py",
                file=sys.stderr,
            )
            return 1
        print(f"{OUT.relative_to(ROOT)} is up to date")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(content, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
