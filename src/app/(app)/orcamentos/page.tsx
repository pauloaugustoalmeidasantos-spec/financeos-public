import { OrcamentosClient } from "@/components/orcamentos/OrcamentosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orçamentos | FinanceOS",
  description: "Planejamento mensal de orçamentos por categoria",
};

export default function OrcamentosPage() {
  return <OrcamentosClient />;
}
