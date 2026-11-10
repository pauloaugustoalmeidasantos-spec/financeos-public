import { PatrimonioClient } from "@/components/patrimonio/PatrimonioClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patrimônio | FinanceOS",
  description: "Controle seus ativos, investimentos e bens patrimoniais",
};

export default function PatrimonioPage() {
  return <PatrimonioClient />;
}
