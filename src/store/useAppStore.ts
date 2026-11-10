import { create } from "zustand";

interface AppState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pendingInsights: number;
  setPendingInsights: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedMonth: new Date(),
  setSelectedMonth: (date: Date) => set({ selectedMonth: date }),
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  pendingInsights: 0,
  setPendingInsights: (n: number) => set({ pendingInsights: n }),
}));
