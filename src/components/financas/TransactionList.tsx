"use client";

import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc-client";
import { formatCurrency } from "@/lib/formatters";
import { CategoryBadge } from "./CategoryBadge";
import { RefreshCw, Trash2, Edit2, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toLocalMidnight, formatCalendarDate } from "@/lib/date-utils";

interface TransactionListProps {
  month: Date;
  typeFilter: "ALL" | "INCOME" | "EXPENSE";
  onEdit: (tx?: any) => void;
}

export function TransactionList({ month, typeFilter, onEdit }: TransactionListProps) {
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const limit = 50;

  const filters = {
    type: typeFilter,
    startDate: new Date(month.getFullYear(), month.getMonth(), 1),
    endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59),
    page,
    limit,
  };

  const { data, isLoading } = trpc.transaction.list.useQuery(filters);

  if (isLoading && page === 1) {
    return (
      <div className="py-20 flex justify-center text-foreground-muted animate-pulse">
        Carregando transações...
      </div>
    );
  }

  const transactions = data?.transactions || [];

  if (transactions.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-2xl bg-surface-elevated/30 mt-6">
        <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-sm mb-4">
          <AlertCircle className="w-6 h-6 text-foreground-muted" />
        </div>
        <h3 className="text-foreground font-medium font-semibold">Nenhum lançamento este mês</h3>
        <p className="text-foreground-muted text-sm mt-1 max-w-sm">Nenhuma transação foi registrada no período selecionado.</p>
        <Button variant="outline" className="mt-4" onClick={() => onEdit(undefined)}>
          Adicionar Transação
        </Button>
      </div>
    );
  }

  let filteredTransactions = transactions;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTransactions = filteredTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || "";
      const cat = t.category?.name.toLowerCase() || "";
      const amountStr = String(t.amount);
      const dateStr = format(toLocalMidnight(t.transactionDate), "dd/MM/yyyy");
      return desc.includes(term) || cat.includes(term) || amountStr.includes(term) || dateStr.includes(term);
    });
  }

  if (filterDate) {
    filteredTransactions = filteredTransactions.filter(t => {
      const tDate = format(toLocalMidnight(t.transactionDate), "yyyy-MM-dd");
      return tDate.startsWith(filterDate);
    });
  }

  // Agrupamento por dia
  const grouped: Record<string, typeof transactions> = {};
  filteredTransactions.forEach((t) => {
    const dayKey = format(toLocalMidnight(t.transactionDate), "yyyy-MM-dd");
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(t);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    return sortDesc 
      ? new Date(b).getTime() - new Date(a).getTime()
      : new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Filtros Locais */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input 
              type="text" 
              placeholder="Buscar gasto ou valor..." 
              className="pl-9 border-border rounded-xl text-sm h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-40 shrink-0">
            <Input 
              type="month" 
              className="border-border rounded-xl text-sm px-3 h-10"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl shadow-sm text-xs font-medium shrink-0 h-10"
          onClick={() => setSortDesc(!sortDesc)}
        >
          <RefreshCw className="w-3 h-3 mr-2 text-foreground-muted" />
          {sortDesc ? "Mais recentes" : "Mais antigas"}
        </Button>
      </div>

      <div className="space-y-8">
      {sortedDays.map((day) => {
        const dayLabel = isSameDay(toLocalMidnight(day), new Date()) 
          ? "Hoje" 
          : formatCalendarDate(day, "dd 'de' MMMM", ptBR);
        
        let dayTransactions = grouped[day];
        if (!sortDesc) {
           dayTransactions = [...dayTransactions].reverse();
        }
        
        return (
          <div key={day} className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">{dayLabel}</h4>
            
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {dayTransactions.map((t, i) => {
                const isIncome = t.type === "INCOME";
                const cat = t.category;
                
                return (
                  <div 
                    key={t.id} 
                    className={`group flex items-center justify-between p-4 hover:bg-surface-elevated/50 transition-colors ${i !== dayTransactions.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Categoria Icon / Cor */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-elevated shrink-0" style={{ backgroundColor: cat ? `${cat.color}20` : undefined }}>
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat ? cat.color || 'var(--foreground-muted)' : 'var(--foreground-muted)' }} />
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm flex items-center gap-2">
                          {t.description || (cat ? cat.name : (isIncome ? "Entrada" : "Saída"))}
                          {t.isRecurring && <RefreshCw className="w-3 h-3 text-indigo-400" />}
                        </span>
                        {cat && t.description ? (
                          <div className="mt-1">
                            <CategoryBadge category={cat} size="sm" />
                          </div>
                        ) : !cat ? (
                          <span className="text-xs text-foreground-muted mt-0.5">Sem categoria</span>
                        ) : null}
                      </div>
                    </div>
                    
                     <div className="flex items-center gap-4">
                      <span className={`font-semibold ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                        {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                      </span>
                      
                      {/* Hover Actions */}
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground-muted hover:text-indigo-600" onClick={() => onEdit(t)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground-muted hover:text-red-600" onClick={() => onEdit(t)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {data && data.totalPages > page && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" className="rounded-full px-8" onClick={() => setPage(p => p + 1)}>
            Carregar Mais
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
