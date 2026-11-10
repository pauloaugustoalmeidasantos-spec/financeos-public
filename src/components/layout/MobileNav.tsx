"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAVIGATION_ITEMS } from "./Sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu className="h-6 w-6" />
        <span className="sr-only">Menu de navegação</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 border-r-0 flex flex-col bg-surface">
        <div className="flex items-center p-4 border-b border-border">
          <SheetTitle>
            <Link href="/dashboard" className="flex items-center gap-2 text-foreground" onClick={() => setOpen(false)}>
              <PiggyBank className="h-6 w-6" />
              <span className="font-bold text-lg">FinanceOS</span>
            </Link>
          </SheetTitle>
        </div>



        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-0.5 px-2">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  {item.disabled ? (
                    <span className="flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium text-foreground-subtle opacity-50 cursor-not-allowed">
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground-muted hover:text-foreground hover:bg-surface-elevated"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
