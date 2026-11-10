"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkPasswordResetRateLimit, logAuth } from "../actions";
import { sanitizeEmail } from "@/lib/sanitize";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const safeEmail = sanitizeEmail(email);

    if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }

    const { success: rateLimitOk, ip } = await checkPasswordResetRateLimit();
    if (!rateLimitOk) {
      setError("Muitas tentativas. Tente novamente em 10 minutos.");
      return;
    }

    setLoading(true);

    try {
      // Check if the email exists and what providers are configured
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(safeEmail, {
        redirectTo: `${location.origin}/api/auth/callback?next=/perfil?tab=security`,
      });

      if (resetError) {
        console.error("[recuperar-senha] Supabase error:", resetError.message);
        await logAuth({ event: "password_reset_failed", ipAddress: ip });

        // Give user-friendly messages based on error type
        if (resetError.message?.toLowerCase().includes("rate limit")) {
          setError("Muitas tentativas. Tente novamente em alguns minutos.");
          return;
        }
      } else {
        await logAuth({ event: "password_reset_requested", ipAddress: ip });
      }

      // Always show success for security (don't leak if email exists)
      setSuccess(true);
    } catch (err) {
      console.error("[recuperar-senha] Unexpected error:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">E-mail enviado!</h2>
          <p className="text-gray-500 mb-4">
            Se este e-mail estiver cadastrado com senha, você receberá um link de redefinição em breve.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Entrou pelo Google?</p>
            <p className="text-sm text-amber-700">
              Se você criou sua conta via <strong>Login com Google</strong>, não é possível redefinir senha por aqui — 
              pois sua conta não tem senha, usa o Google diretamente.
            </p>
            <p className="text-sm text-amber-700 mt-2">
              Basta clicar em <strong>"Continuar com Google"</strong> na tela de login para acessar novamente.
            </p>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Verifique também a pasta de <strong>spam/lixo eletrônico</strong>.
          </p>
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
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Recuperar senha</h2>
        <p className="text-gray-500 text-sm mb-5">
          Informe seu e-mail para receber o link de redefinição.
        </p>

        {/* Google OAuth notice */}
        <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-0.5">Entrou pelo Google?</p>
          <p className="text-xs text-blue-600">
            Contas criadas via Google não precisam de senha — clique em
            {" "}<Link href="/login" className="font-semibold underline">"Continuar com Google"</Link>{" "}
            no login.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail da conta
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 outline-none"
          >
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
          Voltar para login
        </Link>
      </p>
    </div>
  );
}
