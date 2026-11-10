import { FinancasClient } from "@/components/financas/FinancasClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finanças | FinanceOS",
  description: "Gerencie seu fluxo de caixa e categorize suas despesas passo a passo.",
};

export default function FinancasPage() {
  return (
    <>
      <FinancasClient />
    </>
  );
}
