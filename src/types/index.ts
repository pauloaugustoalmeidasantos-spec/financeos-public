export interface MonthOption {
  label: string;
  value: string;
  date: Date;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface PatrimonyProjectionPoint {
  age: number;
  year: number;
  projectedTotal: number;
  principalInvested: number;
  retirementIdeal: number;
}

export interface FinancialSummary {
  income: number;
  expenses: number;
  investments: number;
  balance: number;
}
