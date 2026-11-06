import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Requête légère quotidienne (cron Vercel) pour empêcher la mise en pause
// automatique du projet Supabase après 7 jours d'inactivité.
// Pas d'IA, pas d'auth — simple ping lecture sur une table publique.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("ratio_configs")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
