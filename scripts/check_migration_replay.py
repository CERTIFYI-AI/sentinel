#!/usr/bin/env python3
"""Statically simulate a from-zero replay of supabase/migrations.

Applies files in lexicographic order and fails on:
  * plain-SQL statements that touch a table not yet created
    (INSERT / UPDATE / DELETE / ALTER / CREATE POLICY / CREATE TRIGGER)
  * inline FK REFERENCES to a table not yet created
  * FK column type mismatches (uuid column referencing a text key, etc.)
  * INSERT literals that cannot be applied to the declared column type
    (Postgres rule: quoted literals are castable "unknown"s; unquoted
    numbers / booleans / ARRAY[...] / ::casts constrain the type)
  * calls to SQL functions that are not yet defined

Statements inside DO $$ ... $$ bodies are treated as guarded (the repo
convention is to check to_regclass() before touching optional tables there)
and are skipped. Exit code 1 on any finding, 0 when clean.

Run:  python3 scripts/check_migration_replay.py [path-to-migrations]
CI:   .github/workflows/schema-drift.yml runs this before `supabase db start`.
"""
from __future__ import annotations

import pathlib
import re
import sys
from collections import defaultdict

MIG = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "supabase/migrations")

BUILTIN_PREFIXES = ("auth.", "storage.", "pg_", "information_schema", "cron.", "net.", "vault.", "extensions.")
BUILTIN_FUNCS = {
    "gen_random_uuid", "uuid_generate_v4", "now", "auth.uid", "auth.role", "auth.jwt",
    "format", "to_regclass", "coalesce", "count", "sum", "min", "max", "exists",
}
UUID_RE = re.compile(r"^'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'$", re.I)


def strip_noise(sql: str) -> str:
    sql = re.sub(r"--[^\n]*", "", sql)
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    return sql


def drop_do_blocks(sql: str) -> str:
    """Remove DO $$..$$ bodies (guarded by repo convention) and function bodies."""
    return re.sub(r"\$[a-zA-Z_]*\$.*?\$[a-zA-Z_]*\$", "$BODY$", sql, flags=re.S)


def norm(t: str) -> str:
    return t.strip().strip('"').lower().removeprefix("public.")


def split_top(s: str) -> list[str]:
    out: list[str] = []
    depth, cur, in_q = 0, "", False
    i = 0
    while i < len(s):
        c = s[i]
        if in_q:
            cur += c
            if c == "'":
                if i + 1 < len(s) and s[i + 1] == "'":
                    cur += "'"
                    i += 1
                else:
                    in_q = False
        else:
            if c == "'":
                in_q = True
                cur += c
            elif c in "([":
                depth += 1
                cur += c
            elif c in ")]":
                depth -= 1
                cur += c
            elif c == "," and depth == 0:
                out.append(cur.strip())
                cur = ""
            else:
                cur += c
        i += 1
    if cur.strip():
        out.append(cur.strip())
    return out


def literal_kind(v: str) -> str | None:
    v = v.strip()
    lv = v.lower()
    if not v or lv in ("null", "default"):
        return None
    if lv.startswith("array[") or re.search(r"::\s*[a-z]+\[\]\s*$", lv):
        return "array"  # ARRAY[...] literal or an explicit ::type[] cast
    if lv in ("now()", "current_timestamp") or "::timestamp" in lv:
        return "ts"
    if lv in ("true", "false"):
        return "bool"
    if re.match(r"^-?\d+(\.\d+)?$", v):
        return "num"
    if "::jsonb" in lv:
        return "jsonb"
    if "::uuid" in lv:
        return "uuid"
    if v.startswith("'"):
        if UUID_RE.match(v):
            return "quoted-uuid"
        if re.match(r"^'\d{4}-\d{2}-\d{2}", v):
            return "quoted-ts"
        if re.match(r"^'\{.*\}'$", v, re.S) or re.match(r"^'\[.*\]'$", v, re.S):
            return "quoted-json"
        return "quoted-str"
    return None  # expression / subselect / column ref — not checkable


def base_type(t: str) -> str:
    t = t.lower()
    if t.endswith("[]"):
        return "array"
    for k in ("uuid", "text", "varchar", "char", "jsonb", "json", "boolean", "bool",
              "timestamptz", "timestamp", "date", "numeric", "decimal", "integer",
              "int", "bigint", "smallint", "serial", "double", "real", "float"):
        if t.startswith(k):
            return {"varchar": "text", "char": "text", "json": "jsonb", "bool": "boolean",
                    "timestamp": "timestamptz", "decimal": "numeric", "int": "numeric",
                    "integer": "numeric", "bigint": "numeric", "smallint": "numeric",
                    "serial": "numeric", "double": "numeric", "real": "numeric",
                    "float": "numeric"}.get(k, k)
    return "other"


COMPAT = {
    "uuid": {"quoted-uuid", "uuid"},
    "text": {"quoted-str", "quoted-uuid", "quoted-ts", "quoted-json"},
    "numeric": {"num", "quoted-str"},        # quoted numeric strings cast fine
    "boolean": {"bool", "quoted-str"},
    "timestamptz": {"ts", "quoted-ts"},
    "date": {"ts", "quoted-ts"},
    "jsonb": {"jsonb", "quoted-json"},
    "array": {"array", "quoted-json", "quoted-str"},  # '{}' literals arrive as quoted-str
    "other": None,  # unknown type -> skip value checks
}


def compatible(coltype: str, kind: str | None) -> bool:
    if kind is None:
        return True
    allowed = COMPAT.get(base_type(coltype))
    if allowed is None:
        return True
    if base_type(coltype) == "numeric" and kind == "quoted-str":
        return True
    return kind in allowed


def first_balanced_group(s: str) -> str | None:
    """Return the contents of the first top-level (...) group, paren/quote aware."""
    depth, start, in_q = 0, None, False
    for i, c in enumerate(s):
        if in_q:
            if c == "'":
                in_q = False
            continue
        if c == "'":
            in_q = True
        elif c == "(":
            if depth == 0:
                start = i + 1
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0 and start is not None:
                return s[start:i]
    return None


class Replay:
    def __init__(self) -> None:
        self.tables: dict[str, dict[str, str]] = {}
        self.funcs: set[str] = set()
        self.problems: list[str] = []

    def problem(self, fname: str, msg: str) -> None:
        self.problems.append(f"{fname}: {msg}")

    def parse_create_table(self, t: str, body: str) -> None:
        cols = self.tables.setdefault(t, {})
        for part in split_top(body):
            m = re.match(r'^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+(.+)$', part.strip(), re.S)
            if not m:
                continue
            name = m.group(1).lower()
            if name in ("constraint", "primary", "unique", "foreign", "check", "like", "exclude"):
                continue
            typedef = m.group(2).strip()
            tm = re.match(r"([a-zA-Z_]+(?:\s+precision)?(?:\(\d+(?:,\s*\d+)?\))?(?:\[\])?)", typedef)
            if tm:
                cols[name] = tm.group(1)

    def check_fk(self, fname: str, srctype: str, tgt: str, tgtcol: str) -> None:
        if tgt.startswith(BUILTIN_PREFIXES):
            return
        if tgt not in self.tables:
            self.problem(fname, f"REFERENCES {tgt}({tgtcol}) — table not created yet")
            return
        tcols = self.tables[tgt]
        if tgtcol in tcols and base_type(tcols[tgtcol]) != base_type(srctype) and "other" not in (
            base_type(tcols[tgtcol]), base_type(srctype)
        ):
            self.problem(
                fname,
                f"FK type mismatch: {srctype} column REFERENCES {tgt}.{tgtcol} ({tcols[tgtcol]})",
            )


def main() -> int:
    rp = Replay()
    files = sorted(
        p for p in MIG.iterdir()
        if p.suffix == ".sql" and "rollback" not in p.name and "_drift_check" not in p.name
    )
    for f in files:
        raw = strip_noise(f.read_text())
        sql = drop_do_blocks(raw)

        # definitions inside DO $$ bodies still execute when their guard
        # passes; harvest ADD COLUMN types from the raw text as well.
        for m in re.finditer(
            r"alter\s+table(?:\s+if\s+exists)?\s+(?:only\s+)?([a-zA-Z_\".]+)\s+((?:add\s+column[^;]+))",
            raw, re.I | re.S,
        ):
            tgt = norm(m.group(1))
            if not tgt or tgt.startswith(BUILTIN_PREFIXES):
                continue
            cols = rp.tables.get(tgt)
            if cols is None:
                continue
            for am in re.finditer(
                r"add\s+column\s+(?:if\s+not\s+exists\s+)?\"?([a-zA-Z_][a-zA-Z0-9_]*)\"?\s+([a-zA-Z_]+(?:\(\d+(?:,\s*\d+)?\))?(?:\[\])?)",
                m.group(2), re.I,
            ):
                cn = am.group(1).lower()
                if cn in ("if", "not", "exists", "column"):
                    continue
                cols.setdefault(cn, am.group(2).lower())

        for stmt in re.split(r";\s*(?=\n|$)", sql):
            s = stmt.strip()
            if not s:
                continue
            low = s.lower()

            # ---- usages ----
            cm = re.search(r"create\s+table(?:\s+if\s+not\s+exists)?\s+([a-zA-Z_\".]+)\s*\((.*)\)\s*$", s, re.I | re.S)
            self_table = norm(cm.group(1)) if cm else None

            for m in re.finditer(r"references\s+([a-zA-Z_\".]+)\s*\(\s*([a-zA-Z_\"]+)\s*\)", low):
                tgt, tgtcol = norm(m.group(1)), m.group(2).strip('"')
                if tgt == self_table:
                    continue
                pre = low[: m.start()]
                col_m = re.findall(r'"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+([a-zA-Z_]+(?:\[\])?)\s*$', pre.rsplit(",", 1)[-1])
                srctype = col_m[-1][1] if col_m else "uuid"
                rp.check_fk(f.name, srctype, tgt, tgtcol)

            for kw, pat in (
                ("INSERT", r"insert\s+into\s+([a-zA-Z_\".]+)"),
                ("UPDATE", r"^update\s+([a-zA-Z_\".]+)\s+set\b"),
                ("DELETE", r"^delete\s+from\s+([a-zA-Z_\".]+)"),
                ("ALTER", r"^alter\s+table(?:\s+if\s+exists)?(?:\s+only)?\s+([a-zA-Z_\".]+)"),
                ("POLICY", r"^create\s+policy\s+.*?\son\s+([a-zA-Z_\".]+)"),
                ("TRIGGER", r"^create\s+trigger\s+.*?\son\s+([a-zA-Z_\".]+)"),
                ("INDEX", r"^create\s+(?:unique\s+)?index\s+.*?\son\s+([a-zA-Z_\".]+)"),
            ):
                for m in re.finditer(pat, low, re.S):
                    tgt = norm(m.group(1))
                    if not tgt or tgt == self_table or tgt.startswith(BUILTIN_PREFIXES) or tgt == "$body$":
                        continue
                    if tgt not in rp.tables:
                        guarded = "if exists" in low[: m.end() + 20]
                        if not guarded:
                            rp.problem(f.name, f"{kw} on {tgt} — table not created yet")

            # INSERT column/value type check
            im = re.match(
                r"insert\s+into\s+([a-zA-Z_\".]+)\s*\(([^)]+)\)\s*values\s*(.*)$", s, re.I | re.S
            )
            if im:
                tgt = norm(im.group(1))
                if tgt in rp.tables:
                    cols = [c.strip().strip('"').lower() for c in im.group(2).split(",")]
                    tcols = rp.tables[tgt]
                    for c in cols:
                        if c not in tcols:
                            rp.problem(f.name, f"INSERT into {tgt}: unknown column {c}")
                    row = first_balanced_group(im.group(3))
                    if row is not None:
                        vals = split_top(row)
                        if len(vals) == len(cols):
                            for c, v in zip(cols, vals):
                                if c in tcols and not compatible(tcols[c], literal_kind(v)):
                                    rp.problem(
                                        f.name,
                                        f"INSERT into {tgt}.{c} ({tcols[c]}): incompatible literal {v[:40]!r}",
                                    )

            # function calls in defaults / policy expressions
            for m in re.finditer(r"(?:default|using|with\s+check)\s*\(?\s*(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\)", low):
                fn = m.group(1)
                if fn not in rp.funcs and fn not in BUILTIN_FUNCS:
                    rp.problem(f.name, f"calls {fn}() before it is defined")

            # ---- definitions ----
            if cm:
                rp.parse_create_table(self_table, cm.group(2))
            for m in re.finditer(r"create\s+(?:or\s+replace\s+)?view\s+([a-zA-Z_\".]+)", low):
                rp.tables.setdefault(norm(m.group(1)), {})
            for m in re.finditer(r"create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)", low):
                rp.funcs.add(m.group(1))
            for m in re.finditer(
                r"alter\s+table(?:\s+if\s+exists)?\s+(?:only\s+)?([a-zA-Z_\".]+)\s+((?:add\s+column[^;]+))", s, re.I | re.S
            ):
                tgt = norm(m.group(1))
                cols = rp.tables.setdefault(tgt, rp.tables.get(tgt, {}))
                for am in re.finditer(
                    r"add\s+column\s+(?:if\s+not\s+exists\s+)?\"?([a-zA-Z_][a-zA-Z0-9_]*)\"?\s+([a-zA-Z_]+(?:\(\d+(?:,\s*\d+)?\))?(?:\[\])?)",
                    m.group(2),
                    re.I,
                ):
                    cn = am.group(1).lower()
                    if cn in ("if", "not", "exists", "column"):
                        continue
                    cols[cn] = am.group(2).lower()

    # dedupe, preserve order
    seen: set[str] = set()
    out = [p for p in rp.problems if not (p in seen or seen.add(p))]
    if out:
        print(f"REPLAY CHECK FAILED — {len(out)} finding(s):")
        for p in out:
            print("  " + p)
        return 1
    print(f"replay check clean: {len(files)} migrations, {len(rp.tables)} tables tracked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
