"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AssetCreateSchema } from "@/validations/asset";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Loader2, Search, TrendingUp } from "lucide-react";

const POPULAR_TICKERS = [
  // Ações Blue Chips
  "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3",
  "WEGE3", "RENT3", "BBAS3", "SANB11", "BRAP4",
  "GGBR4", "USIM5", "CSNA3", "KLBN11", "SUZB3",
  "LREN3", "MGLU3", "VBBR3", "CSAN3", "PRIO3",
  "RADL3", "FLRY3", "HAPV3", "RDOR3", "QUAL3",
  "ELET3", "ELET6", "CMIG4", "CPFE3", "ENGI11",
  "TAEE11", "TRPL4", "SBSP3", "SAPR11", "CPLE6",
  "EQTL3", "EGIE3", "NEOE3", "AURE3", "AESB3",
  "RAIL3", "CCRO3", "ECOR3", "AZUL4", "GOLL4",
  "EMBR3", "TIMS3", "VIVT3", "TOTS3", "LWSA3",
  "INTB3", "CASH3", "POSI3", "MLAS3", "BIDI11",
  "BBSE3", "IRBR3", "SULA11", "CXSE3", "PSSA3",
  "MRVE3", "CYRE3", "EZTC3", "TRIS3", "PLPL3",
  "GFSA3", "JHSF3", "EVEN3", "DIRR3", "LAVV3",
  "BRFS3", "JBSS3", "MRFG3", "BEEF3", "SMTO3",
  "SLCE3", "AGRO3", "TTEN3", "MILS3", "CAML3",
  "RRRP3", "RECV3", "BRAV3", "TREI5", "UNIP6",
  "RAIZ4", "UGPA3", "VAMO3", "SIMH3", "MOVI3",
  // FIIs populares
  "HGLG11", "MXRF11", "XPLG11", "KNRI11", "VILG11",
  "HGBS11", "HSML11", "BTLG11", "XPML11", "VGIR11",
  "CPTS11", "VRTA11", "KNCR11", "IRDM11", "RBRF11",
  "HGCR11", "BCFF11", "RBCO11", "BRCR11", "PVBI11",
  "RBRR11", "RZAK11", "GGRC11", "RBRP11", "HGRU11",
  "TGAR11", "VGHF11", "XPCI11", "OUJP11", "URPR11",
  // ETFs
  "BOVA11", "SMAL11", "IVVB11", "SPY11", "QQQ11",
  "HASH11", "DIVO11", "ECOO11", "MATB11", "FIND11",
  "ACWI11", "GOLD11", "GOLD39", "EURP11", "NASD11",
  "NASI11", "XINA11", "SMAC11", "BMEB11", "GOVB11",
];

const TESOURO_TITLES = [
  { label: "Tesouro Selic 2026", ticker: "SELIC2026", rate: "Selic", type: "Pós-fixado" },
  { label: "Tesouro Selic 2027", ticker: "SELIC2027", rate: "Selic", type: "Pós-fixado" },
  { label: "Tesouro Selic 2029", ticker: "SELIC2029", rate: "Selic", type: "Pós-fixado" },
  { label: "Tesouro Selic 2031", ticker: "SELIC2031", rate: "Selic", type: "Pós-fixado" },
  { label: "Tesouro Prefixado 2026", ticker: "PRE2026", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro Prefixado 2027", ticker: "PRE2027", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro Prefixado 2029", ticker: "PRE2029", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro Prefixado 2031", ticker: "PRE2031", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro Prefixado c/ Juros 2027", ticker: "PREJ2027", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro Prefixado c/ Juros 2031", ticker: "PREJ2031", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro Prefixado c/ Juros 2035", ticker: "PREJ2035", rate: "Prefixado", type: "Prefixado" },
  { label: "Tesouro IPCA+ 2026", ticker: "IPCA2026", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ 2029", ticker: "IPCA2029", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ 2032", ticker: "IPCA2032", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ 2035", ticker: "IPCA2035", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ 2040", ticker: "IPCA2040", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ 2045", ticker: "IPCA2045", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ 2055", ticker: "IPCA2055", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ c/ Juros 2030", ticker: "IPCAJ2030", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ c/ Juros 2032", ticker: "IPCAJ2032", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ c/ Juros 2035", ticker: "IPCAJ2035", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ c/ Juros 2040", ticker: "IPCAJ2040", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro IPCA+ c/ Juros 2055", ticker: "IPCAJ2055", rate: "IPCA+", type: "Híbrido" },
  { label: "Tesouro Renda+ Aposentadoria 2030", ticker: "RENDA2030", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Renda+ Aposentadoria 2035", ticker: "RENDA2035", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Renda+ Aposentadoria 2040", ticker: "RENDA2040", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Renda+ Aposentadoria 2045", ticker: "RENDA2045", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Renda+ Aposentadoria 2050", ticker: "RENDA2050", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Renda+ Aposentadoria 2055", ticker: "RENDA2055", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Renda+ Aposentadoria 2060", ticker: "RENDA2060", rate: "IPCA+", type: "Renda+" },
  { label: "Tesouro Educa+ 2026", ticker: "EDUCA2026", rate: "IPCA+", type: "Educa+" },
  { label: "Tesouro Educa+ 2029", ticker: "EDUCA2029", rate: "IPCA+", type: "Educa+" },
  { label: "Tesouro Educa+ 2031", ticker: "EDUCA2031", rate: "IPCA+", type: "Educa+" },
];

// Standalone component that fetches real Tesouro prices from the official API
function TesouroPriceSelector({
  tickerInput,
  onSelect,
}: {
  tickerInput: string;
  onSelect: (title: (typeof TESOURO_TITLES)[0], unitPrice: number | null) => void;
}) {
  const { data: tesouroPrices = [], isLoading } = trpc.asset.getTesouroPrices.useQuery(undefined, {
    staleTime: 30 * 60 * 1000, // 30 min
    refetchOnWindowFocus: false,
  });

  const priceMap = new Map(tesouroPrices.map((p) => [p.ticker, p]));

  return (
    <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1 border border-border rounded-xl p-2 bg-muted/30">
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Carregando preços do Tesouro Direto...
        </div>
      )}
      {["Pós-fixado", "Prefixado", "Híbrido", "Renda+", "Educa+"].map((tipo) => (
        <div key={tipo}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 pt-1 pb-0.5">
            {tipo}
          </p>
          {TESOURO_TITLES.filter((t) => t.type === tipo).map((title) => {
            const livePrice = priceMap.get(title.ticker);
            const isSelected = tickerInput === title.ticker;
            return (
              <button
                key={title.ticker}
                type="button"
                onClick={() => onSelect(title, livePrice?.unitPrice ?? null)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  isSelected ? "bg-indigo-600 text-white" : "hover:bg-accent text-foreground"
                }`}
              >
                <span>{title.label}</span>
                {livePrice && (
                  <span className={`text-[10px] font-mono font-semibold ${isSelected ? "text-indigo-200" : "text-muted-foreground"}`}>
                    R$ {livePrice.unitPrice.toFixed(2).replace(".", ",")}
                    {livePrice.annualReturn > 0 && (
                      <span className={`ml-1.5 ${isSelected ? "text-indigo-100" : "text-emerald-600"}`}>
                        {livePrice.annualReturn.toFixed(2).replace(".", ",")}% a.a.
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface Props {
  asset: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvestimentoForm({ asset, isOpen, onClose, onSuccess }: Props) {
  const isEditing = !!asset;
  const [tickerInput, setTickerInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();

  const searchTickers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions(POPULAR_TICKERS);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await utils.asset.searchTickers.fetch({ query });
      if (res.stocks && res.stocks.length > 0) {
        setSuggestions(res.stocks.slice(0, 12));
      } else {
        // Fallback for search
        const upper = query.toUpperCase();
        setSuggestions(POPULAR_TICKERS.filter(t => t.startsWith(upper)));
      }
    } catch {
      const upper = query.toUpperCase();
      setSuggestions(POPULAR_TICKERS.filter(t => t.startsWith(upper)));
    } finally {
      setIsSearching(false);
    }
  }, [utils.asset.searchTickers]);

  const form = useForm<any>({
    resolver: zodResolver(AssetCreateSchema),
    defaultValues: {
      name: "",
      type: "FINANCIAL",
      category: "Ações",
      currentValue: 0,
      purchaseValue: 0,
      ticker: "",
      broker: "",
      quantity: 1,
      autoUpdate: true,
      averagePrice: 0,
      source: "BRAPI",
    },
  });

  useEffect(() => {
    if (asset && isOpen) {
      form.reset({
        name: asset.name,
        type: "FINANCIAL",
        category: asset.category || "Ações",
        currentValue: asset.currentValue,
        purchaseValue: asset.purchaseValue || 0,
        ticker: asset.ticker || "",
        broker: asset.broker || "",
        quantity: asset.quantity || 1,
        autoUpdate: asset.autoUpdate ?? true,
        averagePrice: asset.averagePrice || 0,
        source: asset.source || "BRAPI",
      });
      setTickerInput(asset.ticker || "");
    } else if (!asset && isOpen) {
      form.reset({
        name: "",
        type: "FINANCIAL",
        category: "Ações",
        currentValue: 0,
        purchaseValue: 0,
        ticker: "",
        broker: "",
        quantity: 1,
        autoUpdate: true,
        averagePrice: 0,
        source: "BRAPI",
      });
      setTickerInput("");
    }
  }, [asset, isOpen, form]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAndFillQuote = async (ticker: string) => {
    try {
      const quote = await utils.asset.getQuote.fetch({ ticker });
      if (quote) {
        const currentAvg = form.getValues("averagePrice");
        if (!currentAvg || currentAvg === 0) {
          form.setValue("averagePrice", quote.price);
        }
        form.setValue("currentValue", quote.price * (form.getValues("quantity") || 1));
        toast.success(`Preço atual: R$ ${quote.price.toFixed(2).replace('.', ',')}`);
      }
    } catch {
      // ignore silently (maybe missing token for BOVA11)
    }
  };

  const handleTickerSelect = (ticker: string) => {
    const upper = ticker.toUpperCase();
    form.setValue("ticker", upper);
    setTickerInput(upper);
    if (!form.getValues("name")) {
      form.setValue("name", upper);
    }
    setSuggestions([]);
    setShowSuggestions(false);
    fetchAndFillQuote(upper);
  };

  const handleTickerChange = (raw: string) => {
    const val = raw.toUpperCase();
    setTickerInput(val);
    form.setValue("ticker", val);
    if (!form.getValues("name") || form.getValues("name") === tickerInput) {
      form.setValue("name", val);
    }
    setShowSuggestions(true);
    // Debounce the API call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchTickers(val);
      if (val.length >= 5) {
        fetchAndFillQuote(val);
      }
    }, 500);
  };

  const createAsset = trpc.asset.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); toast.success("Investimento cadastrado!"); },
    onError: () => toast.error("Erro ao cadastrar investimento."),
  });
  const updateAsset = trpc.asset.update.useMutation({
    onSuccess: () => { onSuccess(); onClose(); toast.success("Investimento atualizado!"); },
    onError: () => toast.error("Erro ao atualizar investimento."),
  });

  const onSubmit = (data: any) => {
    const cleaned = {
      ...data,
      ticker: data.ticker || undefined,
      broker: data.broker || undefined,
      description: undefined,
      purchaseValue: data.averagePrice && data.quantity ? data.averagePrice * data.quantity : data.purchaseValue || undefined,
    };

    if (isEditing) {
      updateAsset.mutate({ id: asset.id, ...cleaned });
    } else {
      createAsset.mutate(cleaned);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Investimento" : "Novo Investimento"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Atualize os dados do seu ativo." : "Cadastre um ativo para acompanhar automaticamente."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-6">
          {/* Ticker / Profitability */}
          {form.watch("category") === "Tesouro Direto" ? (
            <div className="space-y-2">
              <Label>Título do Tesouro Direto</Label>
              <TesouroPriceSelector
                tickerInput={tickerInput}
                onSelect={(title, unitPrice) => {
                  form.setValue("ticker", title.ticker);
                  setTickerInput(title.ticker);
                  form.setValue("name", title.label);
                  if (unitPrice && unitPrice > 0) {
                    const qty = form.getValues("quantity") || 1;
                    form.setValue("currentValue", unitPrice * qty);
                    toast.success(`Preço unitário: R$ ${unitPrice.toFixed(2).replace(".", ",")} — Valor atualizado!`);
                  }
                }}
              />
              <p className="text-[10px] text-muted-foreground">
                Selecione o título. O valor atual será preenchido automaticamente com base no preço de compra atual do Tesouro Direto.
              </p>
            </div>

          ) : form.watch("category") === "Renda Fixa" ? (
            <div className="space-y-2">
              <Label>Rentabilidade Anual (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 10.5"
                  value={tickerInput.startsWith("RATE:") ? tickerInput.replace("RATE:", "") : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTickerInput(`RATE:${val}`);
                    form.setValue("ticker", `RATE:${val}`);
                    if (!form.getValues("name")) {
                      form.setValue("name", `Renda Fixa ${val}% aa`);
                    }
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">% a.a.</span>
              </div>
              <p className="text-[10px] text-muted-foreground">O rendimento será calculado automaticamente ao valor todos os dias.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Ticker</Label>
              <div className="relative" ref={wrapperRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin z-10 pointer-events-none" />
                )}
                <Input
                  value={tickerInput}
                  placeholder="Ex: PETR4, VALE3, BOVA11..."
                  className="pl-9 pr-9 uppercase font-mono"
                  autoComplete="off"
                  onChange={(e) => handleTickerChange(e.target.value)}
                  onFocus={() => {
                    setShowSuggestions(true);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => searchTickers(tickerInput), 100);
                  }}
                />

                {/* Suggestions dropdown */}
                {showSuggestions && (suggestions.length > 0 || isSearching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl border border-border shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
                    {!tickerInput && (
                      <div className="px-4 py-2 border-b border-border flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] text-muted-foreground font-medium">Ações e ETFs populares</span>
                      </div>
                    )}
                    {isSearching ? (
                      <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                      </div>
                    ) : (
                      suggestions.map((ticker) => (
                        <button
                          key={ticker}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-accent flex items-center gap-3 transition-colors border-b border-border last:border-b-0"
                          onClick={() => handleTickerSelect(ticker)}
                        >
                          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {ticker.slice(0, 2)}
                          </span>
                          <span className="font-mono font-semibold text-sm text-foreground">{ticker}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {showSuggestions && !isSearching && tickerInput.length >= 2 && suggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover rounded-xl border border-border shadow-lg z-50 px-4 py-3 text-sm text-muted-foreground">
                    Pressione &quot;Enter&quot; para usar {tickerInput}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label>Nome do Ativo</Label>
            <Input {...form.register("name")} placeholder="Petrobras, Vale..." />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ações">📈 Ações</SelectItem>
                    <SelectItem value="FIIs">🏢 FIIs</SelectItem>
                    <SelectItem value="ETF">📊 ETF</SelectItem>
                    <SelectItem value="Crypto">₿ Crypto</SelectItem>
                    <SelectItem value="Renda Fixa">📄 Renda Fixa</SelectItem>
                    <SelectItem value="Tesouro Direto">🏛️ Tesouro Direto</SelectItem>
                    <SelectItem value="Previdência">🔮 Previdência</SelectItem>
                    <SelectItem value="Outros">📁 Outros</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Quantity + Average Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                {...form.register("quantity", { valueAsNumber: true })}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Médio (R$)</Label>
              <Controller
                control={form.control}
                name="averagePrice"
                render={({ field }) => (
                  <CurrencyInput value={field.value || 0} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* Current Value */}
          <div className="space-y-2">
            <Label>Valor Atual Total (R$)</Label>
            <Controller
              control={form.control}
              name="currentValue"
              render={({ field }) => (
                <CurrencyInput value={field.value} onChange={field.onChange} />
              )}
            />
            <p className="text-[10px] text-muted-foreground">Será atualizado automaticamente se o ticker estiver configurado.</p>
          </div>

          {/* Broker */}
          <div className="space-y-2">
            <Label>Corretora</Label>
            <Input {...form.register("broker")} placeholder="Ex: XP, Nu Invest, BTG..." />
          </div>

          {/* Auto Update Toggle */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Cotação Automática</p>
              <p className="text-xs text-muted-foreground">Atualizar cotações via brapi.dev diariamente</p>
            </div>
            <Controller
              control={form.control}
              name="autoUpdate"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={createAsset.isPending || updateAsset.isPending}>
            {createAsset.isPending || updateAsset.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            ) : isEditing ? "Salvar Alterações" : "Cadastrar Investimento"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
