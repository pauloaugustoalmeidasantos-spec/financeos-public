import { DashIAClient } from "@/components/ai/DashIAClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dash.IA | FinanceOS",
  description:
    "Insights inteligentes e planejador financeiro pessoal com IA",
};

export default function DashIAPage() {
  return <DashIAClient />;
}
