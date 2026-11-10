import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | FinanceOS",
  description: "Visão consolidada das suas finanças pessoais",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
