"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type HeaderProps = {
  title?: string;
};

export function Header({ title = "Dashboard" }: HeaderProps) {
  const router = useRouter();
  const { data: userProfile } = trpc.user.getProfile.useQuery();

  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    // Prevent zoom on the whole page, apply only to the main content area
    (document.documentElement as any).style.zoom = '';
    const mainContent = document.getElementById('main-content-zoom');
    if (mainContent) {
        (mainContent as any).style.zoom = `${zoom}%`;
    }
  }, [zoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const handleSignOut = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push("/login");
    } catch (e) {
      console.error(e);
      router.push("/login");
    }
  };

  const displayName = userProfile?.name || "Usuário";
  const displayEmail = userProfile?.email || "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/80 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <h1 className="text-xl font-semibold text-foreground hidden md:block">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center border border-border rounded-md overflow-hidden bg-surface-elevated/50">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-9 w-9 rounded-none text-foreground-muted hover:text-foreground hover:bg-surface-elevated" title="Diminuir zoom">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-foreground-muted w-12 text-center select-none tabular-nums">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-9 w-9 rounded-none text-foreground-muted hover:text-foreground hover:bg-surface-elevated" title="Aumentar zoom">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        <ThemeToggle />

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="relative h-9 w-9 rounded-full p-0 border-0 bg-transparent cursor-pointer" />
            }
          >
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={userProfile?.avatarUrl || ""} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-foreground-muted">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/perfil')}>Ver perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/configuracoes')}>Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-danger">Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
