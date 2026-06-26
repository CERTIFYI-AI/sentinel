// @ts-nocheck
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/Sidebar";
import { ModuleRail } from "@/components/layout/ModuleRail";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/ui/CommandPalette";

export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <ModuleRail />
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
