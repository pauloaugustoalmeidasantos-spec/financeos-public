import { MetasClient } from "@/components/metas/MetasClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metas | FinanceOS",
  description: "Trilhe o caminho de seus sonhos e controle caixas",
};

export default function MetasPage() {
  return <MetasClient />;
}
