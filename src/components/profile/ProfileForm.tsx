"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { createBrowserClient } from "@supabase/ssr";
import { formatCurrency } from "@/lib/formatters";
import { toLocalMidnight } from "@/lib/date-utils";

const ProfileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  monthlyIncome: z.number().min(0).default(0),
  incomeType: z.enum(["SALARY", "FREELANCE", "BUSINESS", "INVESTMENT", "OTHER"]).default("SALARY"),
  incomeStability: z.enum(["STABLE", "VARIABLE", "MIXED"]).default("STABLE"),
  financialGoal: z.enum([
    "GROW_WEALTH",
    "GET_OUT_OF_DEBT",
    "FINANCIAL_INDEPENDENCE",
    "RETIREMENT",
    "OTHER",
  ]).default("GROW_WEALTH"),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

export function ProfileForm({ user, profile, initialTab = "overview", mode = "" }: { user: any; profile: any; initialTab?: string; mode?: string }) {
  const [extraIncomes, setExtraIncomes] = useState<{id: string, name: string, amount: number}[]>([]);
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
    }
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Fetch protection summary to derive monthly income
  const { data: protectionData } = trpc.protection.getSummary.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Derive monthly income: Proteção config > average from transactions
  const protectionIncome = protectionData?.profile?.monthlyIncome ?? 0;
  const protectionAdditional = (protectionData?.profile?.additionalIncomes ?? []).reduce(
    (acc: number, inc: any) => acc + (Number(inc.amount) || 0), 0
  );
  const protectionTotalIncome = protectionIncome + protectionAdditional;
  const avgTransactionIncome = protectionData?.avgMonthlyIncome ?? 0;

  // Priority: protection configured income > average from transactions > 0
  const hasProtectionIncome = protectionTotalIncome > 0;
  const derivedMonthlyIncome = hasProtectionIncome ? protectionTotalIncome : avgTransactionIncome;
  const incomeSource = hasProtectionIncome
    ? "Fonte: Proteção"
    : avgTransactionIncome > 0
      ? "Fonte: Média dos lançamentos"
      : "Não configurada";

  // Detect auth state from server-side flags
  const isGoogleOnly = !user?.hasPasswordProvider && !!user?.hasGoogle;
  const isGoogleWithPassword = !!user?.hasPasswordProvider && !!user?.hasGoogle;
  // true when user arrived via a password-reset email link (recovery session)
  const isRecoveryMode = mode === "set-password";

  // Security form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: user?.name || "",
      phone: profile?.phone || "",
      birthDate: profile?.birthDate ? format(toLocalMidnight(profile.birthDate), "yyyy-MM-dd") : "",
      monthlyIncome: profile?.monthlyIncome ? Number(profile.monthlyIncome) : 0,
      incomeType: profile?.incomeType || "SALARY",
      incomeStability: profile?.incomeStability || "STABLE",
      financialGoal: profile?.financialGoal || "GROW_WEALTH",
    },
  });

  useEffect(() => {
    if (profile?.additionalIncomes) {
      setExtraIncomes(profile.additionalIncomes as any);
    }
  }, [profile]);

  const onSubmit = async (data: any) => {
    toast.promise(
      updateProfile.mutateAsync({
        name: data.name,
        phone: data.phone,
        birthDate: data.birthDate ? toLocalMidnight(data.birthDate) : undefined,
        monthlyIncome: data.monthlyIncome,
        additionalIncomes: extraIncomes,
        incomeType: data.incomeType,
        incomeStability: data.incomeStability,
        financialGoal: data.financialGoal,
      }),
      {
        loading: "Salvando alterações...",
        success: "Perfil atualizado com sucesso!",
        error: "Erro ao atualizar o perfil. Tente novamente.",
      }
    );
  };

  const handleSetGooglePassword = async () => {
    setIsChangingPassword(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // For Google-only users, we cannot call updateUser directly — Supabase requires
      // a recently authenticated session (via email+password) before allowing a password set.
      // The correct and reliable flow is: send a password-reset email. When the user clicks
      // the link, Supabase creates a fresh authenticated session and redirects to the security tab,
      // where they can set their password for the first time.
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email, {
        redirectTo: `${window.location.origin}/api/auth/callback?type=recovery&next=${encodeURIComponent("/perfil?tab=security&mode=set-password")}`,
      });

      if (error) {
        if (error.message?.toLowerCase().includes("rate limit")) {
          toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        } else {
          toast.error(error.message || "Erro ao enviar o e-mail. Tente novamente.");
        }
        return;
      }

      toast.success(
        `E-mail enviado para ${user?.email}! Clique no link recebido para criar sua senha de acesso.`,
        { duration: 8000 }
      );
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado. Tente novamente.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handler for users who arrived via a recovery email link.
  // Supabase recovery sessions allow updateUser without re-authentication.
  const handleCreateFirstPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // In a recovery session, Supabase allows setting a new password without
      // the current password — this is the intended secure flow.
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast.success("Senha criada com sucesso! Agora você pode entrar com e-mail e senha em qualquer dispositivo.", { duration: 6000 });
      setNewPassword("");
      setConfirmPassword("");
      // Remove mode=set-password from URL without reload
      window.history.replaceState({}, "", "/perfil?tab=security");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar a senha. Tente novamente.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast.error("Informe sua senha atual para continuar.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As novas senhas não coincidem.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Step 1: Re-authenticate with current password to confirm identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Senha atual incorreta. Verifique e tente novamente.");
        return;
      }

      // Step 2: Update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso! Use a nova senha no próximo acesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao trocar a senha.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const deleteAccountMutation = trpc.user.deleteAccount.useMutation();
  const exportDataMutation = trpc.user.exportData.useMutation();

  const handleExportData = async () => {
    toast.promise(
      exportDataMutation.mutateAsync().then((data) => {
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
          JSON.stringify(data, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "financeos_meus_dados_lgpd.json";
        link.click();
      }),
      {
        loading: "Compilando seus dados...",
        success: "Download iniciado com sucesso!",
        error: "Falha ao exportar os dados.",
      }
    );
  };

  const handleDeleteAccount = async () => {
    toast.promise(
      deleteAccountMutation.mutateAsync().then(async () => {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.signOut();
        window.location.href = "/login";
      }),
      {
        loading: "Apagando todos os seus registros...",
        success: "Conta encerrada com sucesso.",
        error: "Erro ao excluir conta. Contate o suporte.",
      }
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="flex flex-wrap w-full bg-surface-elevated p-1 rounded-xl gap-1">
          <TabsTrigger value="overview" className="rounded-lg flex-1 whitespace-nowrap">Visão Geral</TabsTrigger>
          <TabsTrigger value="personal" className="rounded-lg flex-1 whitespace-nowrap">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="goals" className="rounded-lg flex-1 whitespace-nowrap">Objetivos</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg flex-1 whitespace-nowrap">Segurança</TabsTrigger>
        </TabsList>

        {/* Tab 0: Visão Geral (Perfil Completo) */}
        <TabsContent value="overview" className="pt-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">Perfil Completo</h2>
              <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="text-foreground-muted block mb-1">Nome Completo</span>
                  <span className="font-semibold text-foreground">{form.watch("name") || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block mb-1">E-mail de Acesso</span>
                  <span className="font-semibold text-foreground">{user?.email}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block mb-1">Telefone</span>
                  <span className="font-semibold text-foreground">{form.watch("phone") || "Não informado"}</span>
                </div>
                <div>
                  <span className="text-foreground-muted block mb-1">Data de Nascimento</span>
                  <span className="font-semibold text-foreground">{form.watch("birthDate") ? new Date(form.watch("birthDate") as string).toLocaleDateString("pt-BR") : "Não informada"}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">Situação Financeira</h2>
              <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <span className="text-foreground-muted block mb-1">Renda Mensal (Total)</span>
                  <span className="font-semibold text-emerald-500 text-lg">
                    {formatCurrency(derivedMonthlyIncome)}
                  </span>
                  <span className="block text-[11px] text-foreground-subtle mt-0.5">
                    {incomeSource}
                    {!hasProtectionIncome && (
                      <> · <Link href="/protecao" className="text-primary hover:underline">Configurar na Proteção →</Link></>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted block mb-1">Tipo de Renda</span>
                  <span className="font-semibold text-foreground">{
                    form.watch("incomeType") === "SALARY" ? "Salário" :
                    form.watch("incomeType") === "FREELANCE" ? "Freelance" :
                    form.watch("incomeType") === "BUSINESS" ? "Negócio Próprio" :
                    form.watch("incomeType") === "INVESTMENT" ? "Investimentos" : "Outros"
                  }</span>
                </div>
                <div>
                  <span className="text-foreground-muted block mb-1">Estabilidade Declarada</span>
                  <span className="font-semibold text-foreground">{
                    form.watch("incomeStability") === "STABLE" ? "Estável" :
                    form.watch("incomeStability") === "VARIABLE" ? "Variável" : "Misto"
                  }</span>
                </div>
                <div>
                  <span className="text-foreground-muted block mb-1">Objetivo Direcionador</span>
                  <span className="font-semibold text-indigo-500">{
                    form.watch("financialGoal") === "GROW_WEALTH" ? "Crescer patrimônio" :
                    form.watch("financialGoal") === "GET_OUT_OF_DEBT" ? "Sair das dívidas" :
                    form.watch("financialGoal") === "FINANCIAL_INDEPENDENCE" ? "Independência Financeira" :
                    form.watch("financialGoal") === "RETIREMENT" ? "Aposentadoria" : "Outro"
                  }</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 1: Dados Pessoais */}
        <TabsContent value="personal" className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <Input {...form.register("name")} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <Input value={user?.email || ""} readOnly className="bg-surface-elevated text-foreground-muted cursor-not-allowed" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Telefone</label>
                  <Input {...form.register("phone")} placeholder="(11) 90000-0000" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Data de Nascimento</label>
                  <Input type="date" {...form.register("birthDate")} onChange={(e) => form.setValue("birthDate", e.target.value)} />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Salvando..." : "Salvar Dados Pessoais"}
            </Button>
          </form>
        </TabsContent>

        {/* Tab 2: Objetivos (sem tab Financeiro) */}
        <TabsContent value="goals" className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
              <label className="text-sm font-medium mb-2 text-foreground">Seu Objetivo Principal</label>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { id: "GROW_WEALTH", label: "Crescer patrimônio" },
                  { id: "GET_OUT_OF_DEBT", label: "Sair das dívidas" },
                  { id: "FINANCIAL_INDEPENDENCE", label: "Independência Financeira" },
                  { id: "RETIREMENT", label: "Aposentadoria" },
                  { id: "OTHER", label: "Outro" },
                ].map((goal) => {
                  const isSelected = form.watch("financialGoal") === goal.id;
                  return (
                    <div 
                      key={goal.id}
                      onClick={() => form.setValue("financialGoal", goal.id as any, { shouldDirty: true })}
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border p-4 text-sm font-medium transition-colors ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                          : 'border-border bg-card hover:bg-surface-elevated text-foreground'
                      }`}
                    >
                      {goal.label}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Salvando..." : "Salvar Objetivo"}
            </Button>
          </form>

          {/* IA Reference */}
          <div className="mt-6 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
            <p className="text-sm font-semibold text-indigo-500 flex items-center gap-2">
              ✨ Conectado ao Dash.IA
            </p>
            <p className="text-xs text-foreground-muted">
              Seus objetivos alimentam o módulo de inteligência artificial. Acesse o <strong className="text-indigo-500">Dash.IA</strong> para receber insights personalizados com base nas suas metas financeiras.
            </p>
            <button 
              type="button"
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/dash-ia'; }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              Ir para Dash.IA &rarr;
            </button>
          </div>
        </TabsContent>

        {/* Tab 3: Segurança */}
        <TabsContent value="security" className="pt-6 space-y-10">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Alterar Senha</h3>

            {/* ── Recovery mode: user came from reset email link ── */}
            {isRecoveryMode && (
              <div className="max-w-sm space-y-4">
                <div className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 01.09 12c.01 3.99 1.977 7.52 5 9.5A11.956 11.956 0 0112 21c3.02-1.98 4.99-5.51 5-9.5a11.955 11.955 0 01-3.508-5.988A11.957 11.957 0 0112 5.96z" />
                    </svg>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      Primeiro acesso — Crie sua senha
                    </p>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Você está em modo seguro de redefinição. Crie abaixo a senha que vai usar para entrar com <strong>e-mail + senha</strong> em qualquer dispositivo.
                  </p>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Nova Senha</label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Confirmar Nova Senha</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                    />
                  </div>
                  <Button
                    onClick={handleCreateFirstPassword}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                    className="w-full"
                  >
                    {isChangingPassword ? "Salvando..." : "Criar Minha Senha de Acesso"}
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">Após criar a senha, você também poderá alterá-la normalmente aqui abaixo.</p>
                </div>
              </div>
            )}

            {/* ── Google-only account: blocked from creating password to prevent login issues ── */}
            {!isRecoveryMode && isGoogleOnly && (
              <div className="space-y-4 max-w-sm">
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Acesso exclusivo via Google
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Sua conta está vinculada exclusivamente ao <strong>Login com Google</strong>. A criação de uma senha isolada foi desativada para garantir a segurança e evitar bloqueios de acesso. Continue usando o botão "Continuar com Google" para entrar.
                  </p>
                </div>
              </div>
            )}

            {/* ── Account with email+password (may also have Google) ── */}
            {!isRecoveryMode && !isGoogleOnly && (
              <div className="grid gap-4 max-w-sm">
                {isGoogleWithPassword && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                      Conta vinculada ao Google + Senha
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Sua conta tem login com Google e também uma senha cadastrada. Se não souber a senha atual, envie um e-mail de redefinição:
                    </p>
                    <button
                      type="button"
                      onClick={handleSetGooglePassword}
                      disabled={isChangingPassword}
                      className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? "Enviando e-mail..." : "Não sei minha senha → Enviar e-mail de redefinição"}
                    </button>
                  </div>
                )}
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Senha Atual</label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Digite sua senha atual" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Nova Senha</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Confirmar Nova Senha</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {isChangingPassword ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">Seus Dados (LGPD)</h3>
            <p className="text-sm text-foreground-muted mb-4 max-w-xl">
              Você tem o direito de fazer o download de todas as informações que o FinanceOS armazenou sobre a sua conta em formato JSON.
            </p>
            <Button variant="outline" onClick={handleExportData} disabled={exportDataMutation.isPending}>
              {exportDataMutation.isPending ? "Baixando..." : "Exportar todos os meus dados"}
            </Button>
          </div>

          <div className="pt-6 border-t border-red-100">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Zona de Perigo</h3>
            <p className="text-sm text-foreground-muted mb-4 max-w-xl">
              Ao excluir sua conta, todos os seus dados, históricos financeiros, metas e perfis
              serão deletados permanentemente. Essa ação é irreversível.
            </p>
            <Button variant="destructive" onClick={() => setIsDeleting(true)}>
              Excluir minha conta
            </Button>

            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-red-600">Tem certeza absoluta?</DialogTitle>
                  <DialogDescription>
                    Esta ação não pode ser desfeita. Digite <strong>EXCLUIR</strong> abaixo para confirmar.
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4">
                  <Input 
                    value={deleteConfirmText} 
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Digite EXCLUIR"
                    className="border-red-200 focus-visible:ring-red-500"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleting(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    disabled={deleteConfirmText !== "EXCLUIR"} 
                    onClick={handleDeleteAccount}
                  >
                    Excluir Permanentemente
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
