import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Placeholder URL/key used when env vars are missing (demo/preview deploys)
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder";

let _warned = false;

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    if (!_warned) {
      console.warn("Supabase env vars missing — using placeholder client (auth/DB will not work)");
      _warned = true;
    }
    return createBrowserClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
