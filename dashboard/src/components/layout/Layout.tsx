// dashboard/src/components/layout/Layout.tsx
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Sidebar";
import { ModuleRail } from "@/components/layout/ModuleRail";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/ui/CommandPalette";

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <ModuleRail />
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
