/**
 * /api/webhooks/whatsapp/route.ts
 * 
 * Webhook da Meta Cloud API para WhatsApp.
 * 
 * GET  → verificação do webhook pela Meta (obrigatório)
 * POST → recebe mensagens dos usuários (texto ou áudio)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  processTextMessage,
  processAudioMessage,
  findUserByWhatsAppPhone,
} from "@/server/services/whatsapp-ai";

// ── Configuração ──────────────────────────────────────────────────────

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${WA_PHONE_NUMBER_ID}/messages`;

// ── GET — Verificação do Webhook ──────────────────────────────────────

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST — Recebe Mensagens ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Estrutura do payload da Meta
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Ignora eventos que não são mensagens (status updates, etc.)
    if (!value?.messages || value.messages.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    const message = value.messages[0];
    const senderPhone = message.from; // número do remetente (ex: "5511999998888")

    console.log(`[WhatsApp] Message from ${senderPhone}, type: ${message.type}`);

    // 1. Busca o usuário pelo número de WhatsApp
    const user = await findUserByWhatsAppPhone(prisma, senderPhone);

    if (!user) {
      await sendWhatsAppMessage(
        senderPhone,
        "⚠️ Seu número não está vinculado ao FinanceOS. Acesse o app e registre seu WhatsApp nas configurações de perfil."
      );
      return NextResponse.json({ status: "ok" });
    }

    let result;

    // 2. Processa conforme o tipo de mensagem
    if (message.type === "text") {
      const text = message.text?.body;
      if (!text) {
        return NextResponse.json({ status: "ok" });
      }

      result = await processTextMessage(prisma, user.id, text);
    } else if (message.type === "audio") {
      const audioId = message.audio?.id;
      if (!audioId) {
        return NextResponse.json({ status: "ok" });
      }

      // Baixa o áudio da Meta API
      const audioBase64 = await downloadWhatsAppMedia(audioId);
      if (!audioBase64) {
        await sendWhatsAppMessage(
          senderPhone,
          "❌ Não consegui processar o áudio. Tente enviar por texto."
        );
        return NextResponse.json({ status: "ok" });
      }

      result = await processAudioMessage(prisma, user.id, audioBase64);
    } else {
      // Tipo não suportado (imagem, vídeo, documento, etc.)
      await sendWhatsAppMessage(
        senderPhone,
        "📝 Apenas mensagens de texto e áudio são suportadas. Envie algo como:\n• \"gastei 50 reais no mercado\"\n• 🎙️ Áudio dizendo o gasto"
      );
      return NextResponse.json({ status: "ok" });
    }

    // 3. Envia a mensagem de confirmação de volta
    await sendWhatsAppMessage(senderPhone, result.confirmationMessage);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    // Sempre retornar 200 para a Meta não reenviar o webhook
    return NextResponse.json({ status: "ok" });
  }
}

// ── Helpers: Meta API ─────────────────────────────────────────────────

/**
 * Envia uma mensagem de texto de volta ao usuário via WhatsApp
 */
async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("[WhatsApp] Failed to send message:", err);
    }
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
  }
}

/**
 * Baixa um arquivo de mídia da Meta API e retorna em base64
 */
async function downloadWhatsAppMedia(mediaId: string): Promise<string | null> {
  try {
    // 1. Obtém a URL do arquivo
    const urlResponse = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
        },
      }
    );

    if (!urlResponse.ok) return null;
    const urlData = await urlResponse.json();
    const mediaUrl = urlData.url;

    // 2. Baixa o arquivo
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
      },
    });

    if (!mediaResponse.ok) return null;

    // 3. Converte para base64
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  } catch (error) {
    console.error("[WhatsApp] Error downloading media:", error);
    return null;
  }
}
