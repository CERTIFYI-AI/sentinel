# Transparency Reports

**Route:** `/transparency-reports` · **Backing:** `transparency_reports` (model_id, version, published_at, url)

Reads the same table the mesh's NarrativeEngine agent writes. Publish stamps `published_at`; download is a real artifact of the stored content. Reports link to their model.

**Provenance (honest labelling):** a report renders the robot/mesh badge only when `generated_by` names a known governance agent (`NarrativeEngineAgent`) or an `event_id` is present. A human author recorded in `generated_by` (e.g. "Compliance Office") renders as "Prepared by …" without the mesh badge, and the Mesh-Generated KPI counts only true mesh rows.

**Agent writes are strict:** the NarrativeEngine agent inserts through a throwing helper; `NARRATIVE_UPDATED` carries only the audiences whose rows persisted, and a shortfall returns a failed agent result.

**Art. 12 audit logging:** saves and deletes write to `audit_log` via `logAction` (module `transparency-reports`), with a dedicated `publish` action for the externally significant transition. Published reports are also bindable as Trust Center resources (resolved by `transparency_reports.id`).
