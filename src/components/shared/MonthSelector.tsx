"use client";

import { useAppStore } from "@/store/useAppStore";
import { format, addMonths, subMonths, startOfMonth, startOfToday, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useAppStore();
  const today = startOfMonth(startOfToday());
  const maxFutureMonth = startOfMonth(addMonths(today, 12)); // até 12 meses à frente
  const selectedStart = startOfMonth(selectedMonth);

  const handlePrev = () => {
    setSelectedMonth(startOfMonth(subMonths(selectedMonth, 1)));
  };

  const handleNext = () => {
    const next = startOfMonth(addMonths(selectedMonth, 1));
    if (!isBefore(maxFutureMonth, next)) {
      setSelectedMonth(next);
    }
  };

  const isNextDisabled = selectedStart.getTime() >= maxFutureMonth.getTime();
  const isCurrentMonth = selectedStart.getTime() === today.getTime();
  const isFutureMonth = selectedStart.getTime() > today.getTime();

  return (
    <div className="flex items-center gap-1 bg-white/50 px-1 py-1 rounded-full border border-gray-100 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={handlePrev}
      >
        <ChevronLeft className="w-4 h-4 text-gray-500" />
      </Button>
      <button
        onClick={() => setSelectedMonth(today)}
        className={`text-sm font-semibold min-w-[110px] text-center capitalize px-2 py-1 rounded-full transition-colors ${
          isCurrentMonth
            ? "text-gray-800"
            : isFutureMonth
              ? "text-violet-600 hover:bg-violet-50 cursor-pointer"
              : "text-indigo-600 hover:bg-indigo-50 cursor-pointer"
        }`}
        title={isCurrentMonth ? "Mês atual" : "Clique para voltar ao mês atual"}
      >
        {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={handleNext}
        disabled={isNextDisabled}
      >
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </Button>
    </div>
  );
}
