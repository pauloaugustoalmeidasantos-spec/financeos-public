"use client";

import { useUser } from "@/hooks/useUser";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings, Bell, Globe, CreditCard } from "lucide-react";

export default function SettingsPage() {
  const { profile, subscription, isLoading, refetch } = useUser();
  const updateProfile = trpc.user.updateProfile.useMutation();

  if (isLoading) return <div className="p-8 text-foreground-muted">Carregando configurações...</div>;
  if (!profile) return <div className="p-8 text-danger">Erro ao carregar perfil.</div>;

  const handleUpdate = async (field: string, value: any) => {
    try {
      await updateProfile.mutateAsync({ [field]: value });
      toast.success("Configuração salva.");
      refetch();
    } catch {
      toast.error("Erro ao salvar configuração.");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-10 p-6 md:p-8 page-transition">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        </div>
        <p className="text-foreground-muted mt-2">Ajuste os parâmetros do sistema e algoritmos da Inteligência Artificial.</p>
      </div>

      {/* Notificações */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 flex-1">Notificações e Alertas</h2>
        </div>
        
        <div className="grid gap-4 bg-surface p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Notificações do Sistema</p>
              <p className="text-sm text-foreground-muted">Avisos sobre segurança e vencimentos.</p>
            </div>
            <Switch 
              checked={profile.notificationsEnabled} 
              onCheckedChange={(val: any) => handleUpdate("notificationsEnabled", val)} 
            />
          </div>
          
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="font-medium text-foreground">Alertas de IA Automáticos</p>
              <p className="text-sm text-foreground-muted">Resumos mensais e insights gerados pela inteligência artificial.</p>
            </div>
            <Switch 
              checked={profile.aiAlertsEnabled} 
              onCheckedChange={(val: any) => handleUpdate("aiAlertsEnabled", val)} 
            />
          </div>
        </div>
      </section>

      {/* Sistema */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 flex-1">Sistema</h2>
        </div>
        
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
          <div className="space-y-2 max-w-xs">
            <label className="text-sm font-medium text-foreground">Moeda Base</label>
            <Select 
              value={profile.currency} 
              onValueChange={(val: any) => handleUpdate("currency", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a moeda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                <SelectItem value="USD" disabled>Dólar (Em breve)</SelectItem>
                <SelectItem value="EUR" disabled>Euro (Em breve)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Assinatura */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2 flex-1">Plano e Faturamento</h2>
        </div>
        
        <div className="bg-gradient-to-r from-gray-900 to-indigo-900 text-white p-6 rounded-xl shadow-lg border border-indigo-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold tracking-tight">Free Plan</h3>
                <span className="px-3 py-1 bg-white/10 text-xs font-semibold rounded-full border border-white/10">ATIVO</span>
              </div>
              <p className="text-indigo-200 mt-2 max-w-sm">
                Seu plano atual cobre as funcionalidades básicas. Faça upgrade para desbloquear inteligência artificial ilimitada e análises profundas.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              <Button className="w-full bg-white text-indigo-900 hover:bg-gray-100 font-semibold" onClick={() => toast("Integração do Stripe prevista para P27.")}>
                Fazer Upgrade
              </Button>
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent" onClick={() => toast("Apenas clientes Premium possuirão portal de faturamento.")}>
                Gerenciar Faturamento
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
