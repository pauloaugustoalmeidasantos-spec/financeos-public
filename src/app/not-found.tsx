import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        {/* Giant 404 number with gradient */}
        <div
          className="text-[160px] font-bold leading-none tracking-tighter bg-gradient-to-br from-primary via-chart-4 to-primary/40 bg-clip-text text-transparent select-none"
        >
          404
        </div>

        {/* Animated compass */}
        <div className="flex justify-center mb-6 -mt-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
            <div className="relative w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center border border-border">
              <Compass className="w-8 h-8 text-primary animate-[spin_8s_linear_infinite]" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Página não encontrada</h1>
        <p className="text-foreground-muted mb-8 max-w-md mx-auto">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex items-center justify-center gap-3">
          <BackButton />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir para início
          </Link>
        </div>
      </div>
    </div>
  );
}
