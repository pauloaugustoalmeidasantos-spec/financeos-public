import { ContasClient } from "@/components/contas/ContasClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contas e Cartões | FinanceOS",
  description: "Gerencie suas contas bancárias e cartões de crédito.",
};

export default function ContasPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <ContasClient />
    </div>
  );
}

