#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// WS0.10 — Coverage gate. Exit 1 if line coverage <70% or branch <60%.
// Reads the JSON summary produced by `vitest run --coverage` with the
// v8 provider.

import { readFileSync } from "node:fs";

const [, , path] = process.argv;
if (!path) {
  console.error("usage: check-coverage.mjs <coverage-summary.json>");
  process.exit(1);
}

const MIN_LINE = Number(process.env.MIN_LINE_COVERAGE ?? 70);
const MIN_BRANCH = Number(process.env.MIN_BRANCH_COVERAGE ?? 60);

let summary;
try {
  summary = JSON.parse(readFileSync(path, "utf8"));
} catch (err) {
  console.error(`cannot read ${path}: ${err.message}`);
  process.exit(1);
}

const t = summary.total ?? {};
const line = t.lines?.pct ?? 0;
const branch = t.branches?.pct ?? 0;
const func = t.functions?.pct ?? 0;
const stmt = t.statements?.pct ?? 0;

console.log(
  `coverage: lines=${line}% branches=${branch}% functions=${func}% statements=${stmt}%`,
);

let bad = false;
if (line < MIN_LINE) {
  console.error(`FAIL: line coverage ${line}% < ${MIN_LINE}%`);
  bad = true;
}
if (branch < MIN_BRANCH) {
  console.error(`FAIL: branch coverage ${branch}% < ${MIN_BRANCH}%`);
  bad = true;
}
process.exit(bad ? 1 : 0);
