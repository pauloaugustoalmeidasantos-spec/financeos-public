"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Try to find the title based on the current pathname
  const currentNavItem = NAVIGATION_ITEMS.find(
    (item) => pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')
  );
  
  const title = currentNavItem ? currentNavItem.name : "FinanceOS";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto w-full">
          <div id="main-content-zoom" className="page-transition w-full mx-auto p-4 md:p-6" style={{ minHeight: '100%' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
