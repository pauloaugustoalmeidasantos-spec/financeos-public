import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis and Ratelimit if configured
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://dummy.example",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy",
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "10 s"), // 30 reqs / 10s is safe for a generic global blanket
  analytics: true,
});

// Rotas públicas que não exigem autenticação base do Next.js
const PUBLIC_ROUTES = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/api/auth/callback",
  "/api/stripe/webhook",
  "/api/webhooks/whatsapp",
  "/api/cron",
];

// As rotas de tRPC protegem a si mesmas através de middlewares próprios
const PUBLIC_PREFIXES = [
  "/api/trpc"
];

// Rotas de autenticação (usuário autenticado não deve acessar)
const AUTH_ROUTES = ["/login", "/cadastro", "/recuperar-senha"];

export async function middleware(request: NextRequest) {
  // Global Rate Limiting checks (Only if Upstash is properly configured)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    try {
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return new NextResponse(
          JSON.stringify({ error: "Muitas requisições. Tente novamente mais tarde." }),
          { status: 429, headers: { "content-type": "application/json" } }
        );
      }
    } catch (err) {
      console.warn("[RateLimit] Falha ao verificar limites:", err);
    }
  }
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use supabase.auth.getSession() in middleware.
  // Use getUser() instead for security — it validates the JWT against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Verificar se a rota é pública baseada nos arrays
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  ) || PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));

  // Verificar se é rota de auth
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Usuário não autenticado tentando acessar rota protegida
  if (!user && !isPublicRoute) {
    // Se for uma chamada de API, não faz redirect HTML, retorna erro 401
    if (pathname.startsWith("/api/")) {
       return new NextResponse(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { "content-type": "application/json" } }
       );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Usuário autenticado tentando acessar rota de auth → redireciona para dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Usuário autenticado acessando raiz → redireciona para dashboard
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
