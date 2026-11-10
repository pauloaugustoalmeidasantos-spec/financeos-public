"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkSignupRateLimit, logAuth } from "../actions";
import { sanitizeString } from "@/lib/sanitize";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string()
    .email("E-mail inválido")
    .transform(email => email.toLowerCase().trim()),
  name: z.string().transform(sanitizeString),
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve ter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve ter ao menos um número")
    .regex(/[^A-Za-z0-9]/, "Deve ter ao menos um caractere especial"),
});

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
    { label: "Pelo menos uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Pelo menos um número", test: (p: string) => /[0-9]/.test(p) },
    { label: "Pelo menos um caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const supabase = createClient();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    try {
      const parsed = signUpSchema.safeParse({ email, password, name });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
      
      const { email: safeEmail, name: safeName, password: safePassword } = parsed.data;

      const { success: rateLimitOk, ip } = await checkSignupRateLimit();
      if (!rateLimitOk) {
        setError("Muitas tentativas. Tente novamente mais tarde.");
        return;
      }

      setLoading(true);

      const { error: signUpError, data } = await supabase.auth.signUp({
        email: safeEmail,
        password: safePassword,
        options: {
          data: { full_name: safeName },
          emailRedirectTo: `${location.origin}/api/auth/callback`,
        },
      });

      if (signUpError) {
        console.error("[cadastro] Supabase signUp error:", signUpError.status, signUpError.message);
        await logAuth({ event: "signup_failed", ipAddress: ip });

        const msg = signUpError.message?.toLowerCase() || "";
        if (msg.includes("user already registered") || msg.includes("already registered") || msg.includes("already exists")) {
          setError("Este e-mail já está cadastrado. Faça login ou utilize 'Esqueceu a senha?'.");
        } else if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit") || signUpError.status === 429) {
          setError("Muitas solicitações de e-mail. Aguarde alguns minutos e tente novamente.");
        } else if (msg.includes("signup") && msg.includes("disabled")) {
          setError(`Cadastros por e-mail estão desativados no Supabase. Acesse Authentication → Providers → Email e ative "Enable Email Signup". (${signUpError.message})`);
        } else if (msg.includes("signups not allowed") || msg.includes("not allowed for this instance")) {
          setError(`Cadastros desativados no Supabase. Acesse Authentication → Configuration → Enable Signups. (${signUpError.message})`);
        } else {
          setError(signUpError.message || "Não foi possível criar a conta. Verifique os dados e tente novamente.");
        }
        return;
      }

      // Supabase feature: If email already exists, error is null but user.identities is empty
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        await logAuth({ event: "signup_failed_existing", ipAddress: ip });
        setError("Este e-mail já possui uma conta cadastrada. Faça login ou recupere sua senha.");
        return;
      }

      await logAuth({ event: "signup", userId: data.user?.id, ipAddress: ip });
      setSuccess(true);
    } catch (err: any) {
      console.error("[cadastro] Unexpected error:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError("Erro ao conectar com Google. Tente novamente.");
    }
  }

  async function handleResendConfirmation() {
    setResendMessage("");
    setResendingEmail(true);

    try {
      const safeEmail = email.toLowerCase().trim();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: safeEmail,
        options: {
          emailRedirectTo: `${location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        console.error("Resend error:", error);
        if (error.message.toLowerCase().includes("rate limit") || error.status === 429) {
          setResendMessage("Por favor, aguarde 1 minuto antes de solicitar um novo link.");
        } else if (error.message.toLowerCase().includes("already confirmed")) {
          setResendMessage("Este e-mail já foi confirmado! Você já pode fazer login.");
        } else {
          setResendMessage(`Não foi possível reenviar: ${error.message}`);
        }
        return;
      }

      setResendMessage(`Novo link enviado para ${safeEmail}. Verifique caixa de entrada, spam e promocoes.`);
    } catch {
      setResendMessage("Erro ao reenviar o e-mail de confirmacao.");
    } finally {
      setResendingEmail(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifique seu e-mail</h2>
          <p className="text-gray-500 mb-6">
            Enviamos um link de confirmação para <strong className="text-gray-700">{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendingEmail}
            className="w-full mb-3 py-2.5 px-6 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {resendingEmail ? "Reenviando..." : "Reenviar e-mail de confirmacao"}
          </button>
          {resendMessage ? (
            <p className="text-sm text-gray-500 mb-4">{resendMessage}</p>
          ) : null}
          <Link
            href="/login"
            className="inline-block py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            Voltar para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FinanceOS</h1>
        </div>
        <p className="text-gray-500 text-sm">Comece a controlar suas finanças hoje</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Criar sua conta</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow outline-none"
            />

            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, i) => {
                  const check = req.test(password);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {check ? (
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-gray-50 flex items-center justify-center"></div>
                      )}
                      <span className={check ? "text-green-700 font-medium" : "text-gray-500"}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 outline-none"
          >
            {loading ? "Criando conta..." : "Criar conta grátis"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-400">ou</span>
          </div>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignUp}
          type="button"
          className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-3 focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 outline-none"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}
