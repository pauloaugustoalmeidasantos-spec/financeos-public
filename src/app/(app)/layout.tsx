import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // We only need 'get' for verification in layout
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar se onboarding está completo
  // Isso normalmente exigiria uma query no Prisma `prisma.user.findUnique`
  // Para evitar quebrar se o Prisma config nao estive completo, usamos user_metadata como fallback.
  // Note: O banco deve ter 'onboardingComplete' na tabela users conforme E1 P2.
  const isOnboardingComplete = user.user_metadata?.onboardingComplete === true;
  
  // Como nao temos a rota de onboarding pronta e o banco pode nao ter essa flag populada via auth,
  // vamos apenas registrar e não redirecionar cegamente se causar loop.
  // if (!isOnboardingComplete && process.env.NODE_ENV !== 'development') {
  //   redirect("/onboarding");
  // }

  return <AppShell>{children}</AppShell>;
}
