// @deprecated  Phase 2 audit (UX-P0-007 follow-up):
// This file used to host a parallel sidebar implementation that was never
// mounted in the application shell — `dashboard/src/components/Sidebar.tsx`
// is the live, route-wired component. Keeping a stub here prevents any
// hypothetical future imports of `components/dashboard/Sidebar` from
// breaking, while removing ~170 lines of dead code from the bundle.
//
// Re-exports the live Sidebar so any path-based import resolves to the
// same component without duplication. New code MUST import from
// `dashboard/src/components/Sidebar` directly.
//
// Removal target: v1.2.0
import LiveSidebar from '../Sidebar'
export { LiveSidebar as Sidebar }
export default LiveSidebar
