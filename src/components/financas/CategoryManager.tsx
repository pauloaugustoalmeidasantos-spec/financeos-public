"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryBadge } from "./CategoryBadge";
import {
  Trash2, Upload, X, ImageIcon,
  ShoppingCart, Car, UtensilsCrossed, Heart, Home,
  GraduationCap, Music, Plane, Shirt, Smartphone,
  PiggyBank, Package, Zap, Wifi, Dumbbell, Coffee,
  Gift, Dog, Baby, Tv, Wrench, Briefcase, Leaf,
  Star, Shield, CreditCard, TrendingUp, BookOpen,
  Camera, Gamepad2, Stethoscope, Bus, Bike, Train,
  Fuel, ShoppingBag, Apple, Pizza, Wine, Landmark,
  Banknote, Wallet, Clock, Scissors, Flower2,
} from "lucide-react";

export const ICON_OPTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "shopping-cart", label: "Mercado", icon: ShoppingCart },
  { id: "shopping-bag", label: "Compras", icon: ShoppingBag },
  { id: "utensils", label: "Restaurante", icon: UtensilsCrossed },
  { id: "pizza", label: "Delivery", icon: Pizza },
  { id: "apple", label: "Alimentação", icon: Apple },
  { id: "coffee", label: "Café", icon: Coffee },
  { id: "wine", label: "Bar / Social", icon: Wine },
  { id: "car", label: "Carro", icon: Car },
  { id: "bus", label: "Ônibus", icon: Bus },
  { id: "bike", label: "Bicicleta", icon: Bike },
  { id: "train", label: "Metrô", icon: Train },
  { id: "fuel", label: "Combustível", icon: Fuel },
  { id: "plane", label: "Viagem", icon: Plane },
  { id: "home", label: "Moradia", icon: Home },
  { id: "zap", label: "Energia", icon: Zap },
  { id: "wifi", label: "Internet", icon: Wifi },
  { id: "wrench", label: "Manutenção", icon: Wrench },
  { id: "heart", label: "Saúde", icon: Heart },
  { id: "stethoscope", label: "Médico", icon: Stethoscope },
  { id: "dumbbell", label: "Academia", icon: Dumbbell },
  { id: "graduation-cap", label: "Educação", icon: GraduationCap },
  { id: "book-open", label: "Livros", icon: BookOpen },
  { id: "music", label: "Música", icon: Music },
  { id: "tv", label: "Streaming", icon: Tv },
  { id: "gamepad2", label: "Games", icon: Gamepad2 },
  { id: "camera", label: "Fotografia", icon: Camera },
  { id: "star", label: "Lazer", icon: Star },
  { id: "shirt", label: "Roupas", icon: Shirt },
  { id: "scissors", label: "Beleza", icon: Scissors },
  { id: "flower2", label: "Bem-estar", icon: Flower2 },
  { id: "smartphone", label: "Celular", icon: Smartphone },
  { id: "briefcase", label: "Trabalho", icon: Briefcase },
  { id: "piggy-bank", label: "Poupança", icon: PiggyBank },
  { id: "trending-up", label: "Investimento", icon: TrendingUp },
  { id: "banknote", label: "Banco", icon: Banknote },
  { id: "wallet", label: "Carteira", icon: Wallet },
  { id: "credit-card", label: "Cartão", icon: CreditCard },
  { id: "landmark", label: "Financeiro", icon: Landmark },
  { id: "shield", label: "Seguro", icon: Shield },
  { id: "gift", label: "Presentes", icon: Gift },
  { id: "baby", label: "Filhos", icon: Baby },
  { id: "dog", label: "Pet", icon: Dog },
  { id: "leaf", label: "Natureza", icon: Leaf },
  { id: "package", label: "Assinatura", icon: Package },
  { id: "clock", label: "Serviços", icon: Clock },
];

export const LUCIDE_ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.id, o.icon])
);

const COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#F59E0B", "#22C55E", "#14B8A6", "#0EA5E9", "#6B7280",
  "#DC2626", "#16A34A", "#2563EB", "#9333EA", "#D97706",
];

const MAX_IMAGE_BYTES = 300 * 1024; // 300 KB

export function CategoryManager({
  open,
  onOpenChange,
  defaultType = "EXPENSE",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "INCOME" | "EXPENSE";
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(defaultType);
  const [name, setName] = useState("");
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // base64 dataURL
  const [color, setColor] = useState(COLORS[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: categories = [], isLoading } = trpc.category.list.useQuery({ type });
  const createMutation = trpc.category.create.useMutation();
  const deleteMutation = trpc.category.delete.useMutation();
  const customCategories = categories.filter((c) => !c.isDefault);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Arquivo inválido. Use PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Imagem muito grande (${(file.size / 1024).toFixed(0)} KB). Máximo: 300 KB.`);
      // clear so user can try again
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setSelectedIconId(null);
    };
    reader.onerror = () => setImageError("Erro ao ler o arquivo.");
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setUploadedImage(null);
    setImageError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const getIconValue = () => {
    if (uploadedImage) return uploadedImage;
    if (selectedIconId) return `:lucide:${selectedIconId}`;
    return undefined;
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({ name, icon: getIconValue(), color, type });
      toast.success("Categoria criada!");
      setName("");
      setSelectedIconId(null);
      setUploadedImage(null);
      setImageError(null);
      utils.category.list.invalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint") || msg.includes("P2002")) {
        toast.error("Já existe uma categoria com esse nome.");
      } else {
        toast.error("Erro ao criar categoria.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Categoria removida.");
      setDeletingId(null);
      utils.category.list.invalidate();
    } catch {
      toast.error("Erro ao deletar categoria.");
    }
  };

  const selectedIconComp = selectedIconId ? LUCIDE_ICON_MAP[selectedIconId] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Tipo */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${type === "EXPENSE" ? "bg-white shadow text-red-600" : "text-gray-500"}`}
              onClick={() => setType("EXPENSE")}
            >Despesas</button>
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${type === "INCOME" ? "bg-white shadow text-emerald-600" : "text-gray-500"}`}
              onClick={() => setType("INCOME")}
            >Receitas</button>
          </div>

          {/* Formulário */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-4 shadow-inner">
            <h4 className="text-sm font-semibold text-gray-700">Nova Categoria</h4>

            <Input
              placeholder="Nome da categoria..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="bg-white"
            />

            {/* Upload de imagem */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Imagem personalizada <span className="normal-case font-normal text-gray-400">(PNG/JPG até 300 KB)</span>
              </p>
              <div className="flex items-center gap-3">
                {uploadedImage ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-indigo-400 shadow flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadedImage} alt="preview" className="w-full h-full object-cover" />
                    <button
                      onClick={clearImage}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-gray-400 hover:text-indigo-500 flex-shrink-0"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[9px] font-semibold">ENVIAR</span>
                  </button>
                )}
                <div className="flex-1">
                  {imageError ? (
                    <p className="text-xs text-red-600 font-medium">{imageError}</p>
                  ) : uploadedImage ? (
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Imagem carregada com sucesso
                      </p>
                      <button onClick={clearImage} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                        Remover e usar ícone
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Clique para enviar uma foto.<br />
                      <span className="text-amber-600 font-medium">Máximo: 300 KB</span>
                    </p>
                  )}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleImagePick}
              />
            </div>

            {/* Ícones Lucide (só aparece se não houver imagem) */}
            {!uploadedImage && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ou escolha um ícone
                </p>
                <div className="grid grid-cols-8 gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                  {ICON_OPTIONS.map(({ id, label, icon: IconComp }) => (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() => setSelectedIconId(id === selectedIconId ? null : id)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all p-1 ${
                        selectedIconId === id
                          ? "ring-2 ring-offset-1 shadow-md"
                          : "bg-white border border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50"
                      }`}
                      style={selectedIconId === id ? {
                        backgroundColor: `${color}20`,
                        borderColor: color,
                        color: color,
                      } : undefined}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  ))}
                </div>
                {selectedIconId && (
                  <p className="text-xs font-semibold" style={{ color }}>
                    ✓ {ICON_OPTIONS.find((o) => o.id === selectedIconId)?.label} selecionado
                  </p>
                )}
              </div>
            )}

            {/* Cores */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cor</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${color === c ? "scale-125 shadow-lg" : "border-transparent"}`}
                    style={{ backgroundColor: c, borderColor: color === c ? c : "transparent", boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {name.trim() && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-dashed" style={{ borderColor: `${color}40` }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: `${color}20` }}
                >
                  {uploadedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={uploadedImage} alt="preview" className="w-full h-full object-cover rounded-xl" />
                  ) : selectedIconComp ? (
                    (() => { const I = selectedIconComp; return <I className="w-5 h-5" style={{ color }} />; })()
                  ) : (
                    <span className="text-lg">📁</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color }}>{name}</p>
                  <p className="text-xs text-gray-400">Prévia da categoria</p>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!name.trim() || createMutation.isPending}
              onClick={handleCreate}
              style={{ backgroundColor: color }}
            >
              {createMutation.isPending ? "Criando..." : "Adicionar Categoria"}
            </Button>
          </div>

          {/* Lista de categorias */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-700">Suas Categorias</h4>
            {isLoading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : customCategories.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {customCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <CategoryBadge category={cat} size="sm" />
                    {deletingId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => handleDelete(cat.id)}>
                          Confirmar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setDeletingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        onClick={() => setDeletingId(cat.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                Nenhuma categoria customizada ainda.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
