"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Perfil2FAPage() {
  const [factors, setFactors] = useState<any[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    async function loadFactors() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!error && data) {
        setFactors(data.totp || []);
      }
      setLoadingInitial(false);
    }
    loadFactors();
  }, []);

  const hasActiveTotp = factors.some(factor => factor.status === 'verified');

  async function handleEnroll() {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error) throw error;
      
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
    } catch (err: any) {
      setError(err.message || "Erro ao gerar código QR.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) throw error;
      
      // Atualiza estado local
      const { data: newData } = await supabase.auth.mfa.listFactors();
      setFactors(newData?.totp || []);
      setQrCode(null);
      setFactorId(null);
      setCode("");
    } catch (err: any) {
      setError("Código incorreto. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnenroll() {
    const verifiedFactor = factors.find(f => f.status === 'verified');
    if (!verifiedFactor) return;

    if (!confirm("Tem certeza que deseja remover o 2FA? Sua conta ficará menos segura.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });
      if (error) throw error;
      setFactors([]);
    } catch (err: any) {
      setError("Não foi possível desligar o 2FA.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingInitial) {
    return <div className="p-6">Carregando dados de segurança...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Autenticação em Dois Fatores (2FA)</h2>
      <p className="text-gray-500 mb-8">Adicione uma camada extra de proteção na sua conta.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {hasActiveTotp ? (
        <div className="border border-green-200 bg-green-50 rounded-lg p-6 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3 text-green-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="font-semibold text-lg">2FA está Ativado</h3>
          </div>
          <p className="text-green-700 text-sm">Sua conta já está rigorosamente protegida.</p>
          <button
            onClick={handleUnenroll}
            disabled={loading}
            className="px-4 py-2 mt-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            Desativar 2FA
          </button>
        </div>
      ) : (
        <div>
          {!qrCode ? (
            <div className="flex flex-col items-start">
              <p className="text-sm text-gray-600 mb-4">
                Proteja sua conta utilizando um app de autenticação (Google Authenticator, Authy, etc).
              </p>
              <button
                onClick={handleEnroll}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? "Gerando..." : "Ativar autenticação em dois fatores"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">1. Escaneie o QR Code</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Abra o aplicativo autenticador no celular e escaneie o código abaixo.
                </p>
                <div className="border border-gray-200 rounded-lg p-4 inline-block bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">2. Digite o código</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Insira o código de 6 dígitos gerado pelo aplicativo.
                </p>
                <form onSubmit={handleVerify} className="max-w-xs space-y-4">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 text-center tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
                  >
                    {loading ? "Verificando..." : "Verificar e Ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrCode(null);
                      setFactorId(null);
                    }}
                    className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
