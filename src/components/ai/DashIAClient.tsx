"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { InsightCard } from "@/components/ai/InsightCard";
import { AIChat } from "@/components/ai/AIChat";
import { Sparkles, RefreshCw, Filter } from "lucide-react";

const MODULE_FILTERS = [
  { value: undefined as string | undefined, label: "Todos" },
  { value: "DASHBOARD", label: "Dashboard" },
  { value: "FINANCES", label: "Finanças" },
  { value: "GOALS", label: "Metas" },
  { value: "FUTURE", label: "Futuro" },
  { value: "PATRIMONY", label: "Patrimônio" },
] as const;

export function DashIAClient() {
  const [selectedModule, setSelectedModule] = useState<string | undefined>(
    undefined
  );

  const { data: insights, isLoading, refetch } = trpc.ai.getInsights.useQuery({
    module: selectedModule as any,
  });

  const generate = trpc.ai.generateInsights.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="container max-w-7xl mx-auto py-6 md:py-10 px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Sparkles className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Dash.IA
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Insights inteligentes e planejador financeiro
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: "70vh" }}>
        {/* Left: Insights List (40%) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Filter bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Filter className="h-4 w-4" />
                Filtrar por módulo
              </div>
              <button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${generate.isPending ? "animate-spin" : ""}`}
                />
                {generate.isPending ? "Gerando..." : "Gerar novos"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MODULE_FILTERS.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setSelectedModule(filter.value)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    selectedModule === filter.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {generate.isError && (
              <p className="text-xs text-red-500 mt-2">
                {generate.error.message}
              </p>
            )}
            {generate.isSuccess && (
              <p className="text-xs text-emerald-600 mt-2">
                ✨ {generate.data.generated} insights gerados!{" "}
                {generate.data.remaining > 0 &&
                  `(${generate.data.remaining} gerações restantes hoje)`}
              </p>
            )}
          </div>

          {/* Insights list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-gray-100 rounded-xl h-28"
                  />
                ))}
              </div>
            ) : insights && insights.length > 0 ? (
              insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  id={insight.id}
                  module={insight.module}
                  type={insight.type}
                  title={insight.title}
                  content={insight.content}
                  isRead={insight.isRead}
                  createdAt={insight.createdAt}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  Nenhum insight ainda
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Clique em &quot;Gerar novos&quot; para criar insights
                  personalizados
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Chat (60%) */}
        <div className="lg:col-span-3 flex flex-col min-h-[500px] lg:min-h-0">
          <AIChat />
        </div>
      </div>
    </div>
  );
}
