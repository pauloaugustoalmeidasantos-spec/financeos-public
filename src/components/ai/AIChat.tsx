"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Como estão meus gastos este mês?",
  "Minhas metas são viáveis?",
  "Quando posso me aposentar?",
  "Quais categorias posso economizar?",
];

/**
 * Extract text content from a UIMessage's parts array.
 */
function getMessageText(message: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  if (message.content) return message.content;
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("");
  }
  return "";
}

export function AIChat() {
  const { messages, input, handleInputChange, handleSubmit, setInput, status } = useChat({
    transport: new TextStreamChatTransport({
      api: "/api/ai/insights",
    }),
    messages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Olá! 👋 Sou seu planejador financeiro pessoal. Tenho acesso aos seus dados financeiros e posso te ajudar com análises, dicas e planejamento. Como posso te ajudar hoje?",
        createdAt: new Date(),
      } as any,
    ],
  }) as any;

  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const showSuggestions = messages.length <= 1;

  const handleSuggestion = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const form = document.querySelector('form[name="ai-chat-form"]') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
          <Sparkles className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground">
            Planejador IA
          </h3>
          <p className="text-[11px] text-foreground-muted">
            Converse sobre suas finanças
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {(messages as any[])?.map((message: any) => {
          const text = getMessageText(message);
          if (!text) return null;

          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                (message.role as string) === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  (message.role as string) === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : "bg-surface-elevated text-foreground rounded-bl-md"
                )}
              >
                <div className="whitespace-pre-wrap">{text}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-elevated rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-sm text-foreground-muted">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
              Sugestões
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="text-left text-sm px-3 py-2.5 rounded-xl border border-border text-foreground-muted hover:border-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-600 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        name="ai-chat-form"
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-3 border-t border-border bg-surface-elevated/30"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Pergunte sobre suas finanças..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all placeholder:text-foreground-muted"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input?.trim()}
          className="shrink-0 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
