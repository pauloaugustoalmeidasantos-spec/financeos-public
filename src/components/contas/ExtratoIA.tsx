"use client";

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trash2, Check, Info, FileText, Upload, X, Type } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useAppStore } from "@/store/useAppStore";

interface ExtratoIAProps {
  cards: any[];
  onClose: () => void;
}

type InputMode = "text" | "pdf";

export function ExtratoIA({ cards, onClose }: ExtratoIAProps) {
  const { selectedMonth } = useAppStore();
  const utils = trpc.useUtils();
  const [rawText, setRawText] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = trpc.contas.parseStatementWithAI.useMutation({
    onSuccess: (data) => {
      setParsedItems(data);
      setIsReviewing(true);
      if (data.length === 0) {
        toast.error("Nenhuma compra encontrada pela IA.");
      } else {
        toast.success(`A IA encontrou ${data.length} compras! Revise antes de salvar.`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const parsePDFMutation = trpc.contas.parseStatementFromPDF.useMutation({
    onSuccess: (data) => {
      setParsedItems(data);
      setIsReviewing(true);
      if (data.length === 0) {
        toast.error("Nenhuma compra encontrada no PDF.");
      } else {
        toast.success(`A IA encontrou ${data.length} compras no PDF! Revise antes de salvar.`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const saveBatchMutation = trpc.contas.createInstallmentBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} parcelamentos salvos com sucesso!`);
      utils.contas.listCreditCards.invalidate();
      onClose();
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const handleParse = async () => {
    if (!selectedCardId) return toast.error("Selecione um cartão de crédito.");

    if (inputMode === "text") {
      if (!rawText.trim()) return toast.error("Cole o texto do extrato primeiro.");
      parseMutation.mutate({ rawText: rawText.trim() });
    } else {
      if (!pdfFile) return toast.error("Selecione um arquivo PDF primeiro.");
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(",")[1]; // Remove o prefixo data:application/pdf;base64,
        parsePDFMutation.mutate({ pdfBase64: base64 });
      };
      reader.readAsDataURL(pdfFile);
    }
  };

  const handleSave = () => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();

    const payload = parsedItems.map((item) => ({
      creditCardId: selectedCardId,
      description: item.description,
      installmentValue: item.installmentValue,
      totalInstallments: item.totalInstallments,
      paidInstallments: item.paidInstallments,
      totalAmount: item.installmentValue * item.totalInstallments,
      startMonth: month,
      startYear: year,
    }));

    saveBatchMutation.mutate(payload);
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 20MB.");
      return;
    }
    setPdfFile(file);
    toast.info(`PDF "${file.name}" carregado. Clique em Extrair Compras.`);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const isPending = parseMutation.isPending || parsePDFMutation.isPending;

  // ─── Tela de Revisão ───────────────────────────────────────────────────────
  if (isReviewing) {
    const totalMes = parsedItems.reduce((acc, curr) => acc + curr.installmentValue, 0);

    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Revisão da IA
            </h3>
            <p className="text-sm text-muted-foreground">Confira o que a IA extraiu e ajuste se necessário.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsReviewing(false)}>
            Voltar
          </Button>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-lg flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-300">
          <Info className="w-4 h-4 shrink-0" />
          <span>Total desta fatura com os novos itens: <strong>{formatCurrency(totalMes)}</strong></span>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {parsedItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => {
                    const newItems = [...parsedItems];
                    newItems[idx] = { ...newItems[idx], description: e.target.value };
                    setParsedItems(newItems);
                  }}
                  className="w-full bg-transparent border-b border-border text-sm font-semibold focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Valor (R$): </span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.installmentValue}
                      onChange={(e) => {
                        const newItems = [...parsedItems];
                        newItems[idx] = { ...newItems[idx], installmentValue: Number(e.target.value) };
                        setParsedItems(newItems);
                      }}
                      className="w-24 bg-transparent border-b border-border focus:outline-none text-foreground font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Parc.: </span>
                    <input
                      type="number"
                      value={item.totalInstallments}
                      onChange={(e) => {
                        const newItems = [...parsedItems];
                        newItems[idx] = { ...newItems[idx], totalInstallments: Number(e.target.value) };
                        setParsedItems(newItems);
                      }}
                      className="w-12 bg-transparent border-b border-border focus:outline-none text-foreground font-mono text-center"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Já Pagas: </span>
                    <input
                      type="number"
                      value={item.paidInstallments}
                      onChange={(e) => {
                        const newItems = [...parsedItems];
                        newItems[idx] = { ...newItems[idx], paidInstallments: Number(e.target.value) };
                        setParsedItems(newItems);
                      }}
                      className="w-12 bg-transparent border-b border-border focus:outline-none text-foreground font-mono text-center"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setParsedItems((prev) => prev.filter((_, i) => i !== idx))}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsReviewing(false)}>Cancelar</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={parsedItems.length === 0 || saveBatchMutation.isPending}
          >
            {saveBatchMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Confirmar e Salvar {parsedItems.length} Itens
          </Button>
        </div>
      </div>
    );
  }

  // ─── Tela Principal ───────────────────────────────────────────────────────
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> Leitor de Extrato IA
          </h3>
          <p className="text-sm text-muted-foreground">Cole o texto ou faça upload do PDF da sua fatura.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Seleção do Cartão */}
      <div className="space-y-2">
        <label className="text-sm font-medium">1. Selecione o Cartão</label>
        <Select value={selectedCardId} onValueChange={(val) => setSelectedCardId(val || "")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cartão..." />
          </SelectTrigger>
          <SelectContent>
            {cards.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.cardName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toggle Texto / PDF */}
      <div className="space-y-3">
        <label className="text-sm font-medium">2. Escolha como enviar o extrato</label>
        <div className="flex gap-2">
          <button
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              inputMode === "text"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <Type className="w-4 h-4" /> Colar Texto
          </button>
          <button
            onClick={() => setInputMode("pdf")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              inputMode === "pdf"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <FileText className="w-4 h-4" /> Upload PDF
          </button>
        </div>

        {/* Área de texto */}
        {inputMode === "text" && (
          <Textarea
            placeholder={"Ex:\n12/03 UBER *TRIP R$ 15,90\n15/03 AMAZON Parc 02/10 R$ 50,00\n20/03 MERCADO PAGO 01/06 R$ 120,00"}
            className="h-40 font-mono text-xs resize-none"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        )}

        {/* Área de upload PDF */}
        {inputMode === "pdf" && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !pdfFile && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20"
                : pdfFile
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-border hover:border-indigo-300 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {pdfFile ? (
              <div className="space-y-2">
                <FileText className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{pdfFile.name}</p>
                <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover arquivo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">Arraste o PDF aqui ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">Arquivo PDF da fatura do seu banco (max. 20MB)</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        onClick={handleParse}
        disabled={isPending || (!rawText && !pdfFile) || !selectedCardId}
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando com Gemini AI...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Extrair Compras</>
        )}
      </Button>
    </div>
  );
}
