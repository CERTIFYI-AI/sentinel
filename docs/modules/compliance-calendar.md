# Compliance Calendar

**Route:** `/calendar` · **Backing:** `compliance_calendar` (manual rows) + live-derived deadlines

The platform's deadline aggregation point: manual entries plus derived events queried at read time from conformity expiries (`valid_until`), exception expiries, tabletop schedules, regulator-filing deadlines and training windows — each carrying `source_type`/`source_id` and a click-through route. Derived events are read-only and never persisted.
