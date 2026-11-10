import { Resend } from "resend";
import { render } from "@react-email/render";
import WelcomeEmail from "@/emails/WelcomeEmail";
import TrialExpiringEmail from "@/emails/TrialExpiringEmail";
import PaymentConfirmationEmail from "@/emails/PaymentConfirmationEmail";
import CancellationEmail from "@/emails/CancellationEmail";

// Lazy initialization — avoids throwing at build time when env var is missing
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL = "FinanceOS <onboarding@resend.dev>"; // Use standard test domain if no verified domain

export async function sendWelcomeEmail({ to, name }: { to: string; name: string }) {
  try {
    const client = getResend();
    if (!client) return { success: false, error: "Resend not configured" };
    const htmlInfo = await render(WelcomeEmail({ name }));
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Bem-vindo ao FinanceOS!",
      html: htmlInfo,
    });
    return { success: true, result };
  } catch (error) {
    console.error("Failed to send welcome email", error);
    return { success: false, error };
  }
}

export async function sendTrialExpiringEmail({ to, name }: { to: string; name: string }) {
  try {
    const client = getResend();
    if (!client) return { success: false, error: "Resend not configured" };
    const htmlInfo = await render(TrialExpiringEmail({ name }));
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Seu teste grátis do FinanceOS está acabando",
      html: htmlInfo,
    });
    return { success: true, result };
  } catch (error) {
    console.error("Failed to send trial expiring email", error);
    return { success: false, error };
  }
}

export async function sendPaymentConfirmationEmail({
  to,
  name,
  planName,
}: {
  to: string;
  name: string;
  planName: string;
}) {
  try {
    const client = getResend();
    if (!client) return { success: false, error: "Resend not configured" };
    const htmlInfo = await render(PaymentConfirmationEmail({ name, planName }));
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Confirmação de Pagamento - FinanceOS",
      html: htmlInfo,
    });
    return { success: true, result };
  } catch (error) {
    console.error("Failed to send payment confirmation email", error);
    return { success: false, error };
  }
}

export async function sendCancellationEmail({ to, name }: { to: string; name: string }) {
  try {
    const client = getResend();
    if (!client) return { success: false, error: "Resend not configured" };
    const htmlInfo = await render(CancellationEmail({ name }));
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Sua assinatura do FinanceOS foi cancelada",
      html: htmlInfo,
    });
    return { success: true, result };
  } catch (error) {
    console.error("Failed to send cancellation email", error);
    return { success: false, error };
  }
}
