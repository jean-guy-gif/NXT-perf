import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

type AuthSuccess = { user: User; error: null };
type AuthFailure = { user: null; error: NextResponse };

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

/**
 * Variante "soft auth" — retourne le user si authentifié, sinon `null` sans
 * erreur. Utilisée par les endpoints RAG accessibles en mode démo (anonyme).
 * Les callers doivent faire eux-mêmes la rate-limit (par IP si user=null).
 */
export async function getOptionalAuth(): Promise<{ user: User | null }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  );
  const { data } = await supabase.auth.getUser();
  return { user: data.user ?? null };
}

/**
 * Récupère l'IP du client depuis les headers reverse-proxy (Vercel).
 * Fallback "anonymous" si absent.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}
