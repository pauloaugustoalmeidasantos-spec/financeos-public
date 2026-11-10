import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/server/services/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const type = searchParams.get("type"); // e.g. "recovery", "signup"
  const authError = searchParams.get("error");
  const authErrorCode = searchParams.get("error_code");
  const authErrorDescription = searchParams.get("error_description");

  if (authError) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", authError);

    if (authErrorCode) {
      redirectUrl.searchParams.set("error_code", authErrorCode);
    }

    if (authErrorDescription) {
      redirectUrl.searchParams.set("error_description", authErrorDescription);
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("Auth callback error:", error?.message);
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed`
      );
    }

    const { user } = data;

    // For password recovery flow, skip upsert and welcome email —
    // the user already exists. Just redirect to where they need to set the new password.
    if (type === "recovery") {
      console.log("[callback] Password recovery flow, redirecting to:", next);
      return NextResponse.redirect(`${origin}${next}`);
    }

    try {
      // Upsert do usuário na tabela users do Prisma
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email ?? "",
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        },
        create: {
          id: user.id,
          email: user.email ?? "",
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
        },
      });

      // Upsert da subscription com trial de 14 dias
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          plan: "FREE",
          status: "TRIALING",
          trialEndsAt,
        },
      });
    } catch (syncError) {
      console.error("Auth callback Prisma sync failed:", syncError);
    }

    // Send welcome email asynchronously so it doesn't block the user's login redirection
    void sendWelcomeEmail({ 
      to: user.email ?? "", 
      name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Membro"
    });

    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    console.error("Auth callback unexpected error:", error);
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed`
    );
  }
}
