import { InvestimentosClient } from "@/components/investimentos/InvestimentosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investimentos | FinanceOS",
  description: "Acompanhe seus ativos financeiros com cotações em tempo real",
};

export default function InvestimentosPage() {
  return <InvestimentosClient />;
}
