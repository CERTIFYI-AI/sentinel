// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// upgrade in the foundation pack plan but not yet installed, so this
// file is structured as documentation with commented-out handler
// factories. Activate by `npm i -D msw@^2` and uncommenting.
//
// Intended surface once enabled:
//
//   import { http, HttpResponse } from "msw";
//
//   export const handlers = [
//     http.post("*/rest/v1/rpc/:name", () => HttpResponse.json(null)),
//     http.get("*/rest/v1/:table", () => HttpResponse.json([])),
//   ];

export const handlers: readonly unknown[] = [];
