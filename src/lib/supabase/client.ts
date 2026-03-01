import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase env vars missing — auth will not work");
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
