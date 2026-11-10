"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function UpgradePage() {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = trpc.subscription.getStatus.useQuery();
  const createCheckout = trpc.subscription.createCheckout.useMutation();

  const handleCheckout = async (priceId: string | undefined | null) => {
    if (!priceId) return;
    try {
      setLoadingPriceId(priceId);
      const { url } = await createCheckout.mutateAsync({ priceId });
      if (url) {
        window.location.href = url;
      }
    } catch (e) {
      console.error(e);
      setLoadingPriceId(null);
    }
  };

  const monthlyPriceId = status?.monthlyPriceId;
  const yearlyPriceId = status?.yearlyPriceId;

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
          Assuma o controle total do seu patrimônio
        </h1>
        <p className="text-lg text-gray-500">
          Desbloqueie todos os recursos da Inteligência Artificial e planejamento de longo prazo. Teste grátis, cancele quando quiser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Mensal */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">Mensal</h3>
            <p className="text-sm text-gray-500 mt-2">Flexibilidade total para seu planejamento.</p>
          </div>
          <div className="mb-6 flex items-baseline text-5xl font-extrabold text-gray-900">
            R$ 29<span className="text-xl font-medium text-gray-500">/mês</span>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            {["Dashboards ilimitados", "Análises de IA recorrentes", "Até 10 metas ativas", "Suporte prioritário"].map((feature, i) => (
              <li key={i} className="flex items-start">
                <Check className="h-5 w-5 text-indigo-500 shrink-0 mr-3" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold"
            variant="outline"
            disabled={!monthlyPriceId || loadingPriceId !== null}
            onClick={() => handleCheckout(monthlyPriceId)}
          >
            {loadingPriceId === monthlyPriceId ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Assinar Mensal
          </Button>
        </div>

        {/* Anual */}
        <div className="bg-indigo-600 rounded-3xl border border-indigo-600 shadow-xl p-8 flex flex-col relative transform md:-translate-y-4">
          <div className="absolute top-0 right-8 transform -translate-y-1/2">
            <Badge className="bg-gradient-to-r from-emerald-400 to-emerald-500 text-white font-bold px-3 py-1 text-sm border-none shadow-md">
              2 Meses Grátis
            </Badge>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">Anual</h3>
            <p className="text-indigo-100 text-sm mt-2">Economize 17% pagando à vista. A melhor escolha.</p>
          </div>
          <div className="mb-6 flex items-baseline text-5xl font-extrabold text-white">
            R$ 290<span className="text-xl font-medium text-indigo-200">/ano</span>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            {[
              "Tudo do plano Mensal",
              "Metas de vida ilimitadas",
              "Simulador de aposentadoria",
              "Acesso antecipado a novas features",
            ].map((feature, i) => (
              <li key={i} className="flex items-start">
                <Check className="h-5 w-5 text-emerald-400 shrink-0 mr-3" />
                <span className="text-white">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold bg-white text-indigo-600 hover:bg-gray-100"
            disabled={!yearlyPriceId || loadingPriceId !== null}
            onClick={() => handleCheckout(yearlyPriceId)}
          >
            {loadingPriceId === yearlyPriceId ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Assinar Anual
          </Button>
        </div>
      </div>
    </div>
  );
}
