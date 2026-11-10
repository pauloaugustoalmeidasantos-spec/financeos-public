import { MeuFuturoClient } from "@/components/futuro/MeuFuturoClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meu Futuro | FinanceOS",
  description: "Projeção da sua liberdade financeira a longo prazo.",
};

export default function MeuFuturoPage() {
  return (
    <>
      <MeuFuturoClient />
    </>
  );
}
