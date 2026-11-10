"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowUpDown,
  TrendingUp,
  Briefcase,
  BarChart2,
  Shield,
  CreditCard,
  Sparkles,
  User,
  Settings,
  MessageCircle,
  PiggyBank,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

import { trpc } from "@/lib/trpc-client";
import { Logo } from "@/components/brand/Logo";

export const NAVIGATION_ITEMS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, disabled: false },
  { name: "Lançamentos", href: "/financas", icon: ArrowUpDown, disabled: false },
  { name: "Orçamentos", href: "/orcamentos", icon: Wallet, disabled: false },
  { name: "Meu Futuro", href: "/meu-futuro", icon: TrendingUp, disabled: false },
  { name: "Patrimônio", href: "/patrimonio", icon: Briefcase, disabled: false },
  { name: "Investimentos", href: "/investimentos", icon: BarChart2, disabled: false },
  { name: "Proteção", href: "/protecao", icon: Shield, disabled: false },
  { name: "Contas", href: "/contas", icon: CreditCard, disabled: false },
  { name: "Dash.IA", href: "/dash-ia", icon: Sparkles, disabled: false },
  { name: "Perfil", href: "/perfil", icon: User, disabled: false },
  { name: "Configurações", href: "/configuracoes", icon: Settings, disabled: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: unreadData } = trpc.ai.getUnreadCount.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every 60s
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="hidden md:flex w-[220px] flex-col bg-surface border-r border-border h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link href="/dashboard" className="px-1">
          <Logo />
        </Link>
      </div>



      <nav className="flex-1 overflow-y-auto py-4">
        <p className="label-uppercase px-5 mb-2">Menu</p>
        <ul className="space-y-0.5 px-2">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
            const Icon = item.icon;
            const showBadge = item.href === "/dash-ia" && unreadCount > 0;

            return (
              <li key={item.name}>
                {item.disabled ? (
                  <span className="flex items-center gap-3 h-9 px-3 text-sm font-medium text-foreground-subtle opacity-50 cursor-not-allowed">
                    <Icon className="h-[18px] w-[18px]" />
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-9 px-3 text-sm font-medium transition-colors duration-150 rounded-md",
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary rounded-none rounded-r-md -ml-0.5 pl-[14px]"
                        : "text-foreground-muted hover:text-foreground hover:bg-surface-elevated"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {item.name}
                    {showBadge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto mx-3 mb-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-4">
        <p className="text-xs font-semibold text-foreground mb-1">Precisa de ajuda?</p>
        <p className="text-[11px] text-foreground-muted mb-3">Fale com nosso planejador IA</p>
        <Link
          href="/dash-ia"
          className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary-hover rounded-md h-8 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Falar agora
        </Link>
      </div>
    </div>
  );
}
