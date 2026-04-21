import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import * as XLSX from "xlsx";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const EXTRACTION_PROMPT = `Tu es un expert en analyse de performance immobilière.
Analyse ce document et extrais toutes les métriques de performance.
Réponds UNIQUEMENT en JSON valide sans markdown avec cette structure :
{
  "periods": [
    {
      "year": 2024,
      "month": null,
      "metrics": {
        "contacts_entrants": null,
        "mandats_signes": null,
        "visites_realisees": null,
        "offres_recues": null,
        "compromis_signes": null,
        "actes_signes": null,
        "ca_encaisse": null
      }
    }
  ],
  "individuals": [],
  "confidence": "high",
  "missing_fields": []
}`;

// ── Known column name aliases for direct Excel mapping ──────────────────────

const METRIC_ALIASES: Record<string, string> = {
  // contacts_entrants (champ d'import legacy, mappé côté client vers contactsTotaux)
  "contacts entrants": "contacts_entrants", "contacts totaux": "contacts_entrants",
  "contacts": "contacts_entrants",
  "leads": "contacts_entrants", "prospects": "contacts_entrants",
  "appels entrants": "contacts_entrants", "portail": "contacts_entrants",
  // mandats_signes
  "mandats signés": "mandats_signes", "mandats signes": "mandats_signes",
  "mandats": "mandats_signes", "prises de mandat": "mandats_signes",
  // visites_realisees
  "visites réalisées": "visites_realisees", "visites realisees": "visites_realisees",
  "visites": "visites_realisees", "sorties visite": "visites_realisees",
  // offres_recues
  "offres reçues": "offres_recues", "offres recues": "offres_recues",
  "offres": "offres_recues", "offres d'achat": "offres_recues",
  // compromis_signes
  "compromis signés": "compromis_signes", "compromis signes": "compromis_signes",
  "compromis": "compromis_signes", "ssp": "compromis_signes",
  // actes_signes
  "actes signés": "actes_signes", "actes signes": "actes_signes",
  "actes": "actes_signes", "actes authentiques": "actes_signes",
  "ventes": "actes_signes",
  // ca_encaisse
  "ca encaissé": "ca_encaisse", "ca encaisse": "ca_encaisse",
  "chiffre d'affaires": "ca_encaisse", "ca": "ca_encaisse",
  "honoraires": "ca_encaisse", "commissions": "ca_encaisse",
};

const ALL_METRICS = [
  "contacts_entrants", "mandats_signes", "visites_realisees",
  "offres_recues", "compromis_signes", "actes_signes", "ca_encaisse",
];

// ── Supabase helper ─────────────────────────────────────────────────────────

function getSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    },
  );
}

// ── Direct Excel parsing (no LLM needed) ────────────────────────────────────

function parseExcelDirectly(buffer: Buffer): {
  periods: Array<{ year: number; month: number | null; metrics: Record<string, number | null> }>;
  confidence: string;
  missing_fields: string[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const metrics: Record<string, number | null> = {};
  ALL_METRICS.forEach((m) => { metrics[m] = null; });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    if (rows.length === 0) continue;

    // Strategy 1: headers are metric names (columns = metrics, rows = periods/values)
    const headers = Object.keys(rows[0]);
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      const metricKey = METRIC_ALIASES[normalized];
      if (metricKey) {
        // Sum all rows for this column
        let total = 0;
        for (const row of rows) {
          const val = row[header];
          if (typeof val === "number") total += val;
          else if (typeof val === "string") {
            const parsed = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
            if (!isNaN(parsed)) total += parsed;
          }
        }
        if (total > 0 || rows.some((r) => r[header] !== null)) {
          metrics[metricKey] = total;
        }
      }
    }

    // Strategy 2: first column is metric label, second column is value (vertical layout)
    if (headers.length >= 2) {
      for (const row of rows) {
        const label = String(row[headers[0]] ?? "").toLowerCase().trim();
        const value = row[headers[1]];
        const metricKey = METRIC_ALIASES[label];
        if (metricKey && value != null) {
          const numVal = typeof value === "number" ? value
            : parseFloat(String(value).replace(/[^\d.,]/g, "").replace(",", "."));
          if (!isNaN(numVal)) {
            metrics[metricKey] = (metrics[metricKey] ?? 0) + numVal;
          }
        }
      }
    }
  }

  const filledCount = ALL_METRICS.filter((m) => metrics[m] !== null).length;
  const missingFields = ALL_METRICS.filter((m) => metrics[m] === null);

  return {
    periods: [{
      year: new Date().getFullYear(),
      month: null,
      metrics,
    }],
    confidence: filledCount >= 5 ? "high" : filledCount >= 3 ? "medium" : "low",
    missing_fields: missingFields,
  };
}

// ── LLM call (for PDFs and images only) ─────────────────────────────────────

async function callLLM(content: string, isImage: boolean, imageBase64?: string, mimeType?: string) {
  const model = isImage ? "google/gemini-flash-1.5" : "meta-llama/llama-3.3-70b-instruct";

  const messages = isImage
    ? [{
        role: "user" as const,
        content: [
          { type: "text" as const, text: EXTRACTION_PROMPT },
          { type: "image_url" as const, image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      }]
    : [{
        role: "user" as const,
        content: `${EXTRACTION_PROMPT}\n\nContenu du document :\n\n${content.slice(0, 15000)}`,
      }];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.1 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in LLM response");
  return JSON.parse(jsonMatch[0]);
}

// ── Gemini PDF support (native via inlineData) ──────────────────────────────

async function callGeminiPDF(base64: string) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64 } },
            { text: EXTRACTION_PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");
  return JSON.parse(jsonMatch[0]);
}

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase(request);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { allowed } = checkRateLimit(`import-performance:${user.id}`, 5, 60_000);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extracted: { periods?: Array<{ year: number; month: number | null; metrics?: Record<string, number | null> }>; confidence?: string; missing_fields?: string[]; individuals?: unknown[] };

    if (["xlsx", "xls", "csv"].includes(ext)) {
      // Direct parsing — no LLM needed, instant result
      extracted = parseExcelDirectly(buffer);

      // If direct parsing found very few metrics, fallback to LLM
      const filledCount = ALL_METRICS.filter((m) => extracted.periods?.[0]?.metrics?.[m] !== null).length;
      if (filledCount < 2 && OPENROUTER_API_KEY) {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const csv = workbook.SheetNames.map((name) =>
          `--- ${name} ---\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`
        ).join("\n\n");
        try {
          extracted = await callLLM(csv, false);
        } catch {
          // Keep direct parsing result if LLM fails
        }
      }
    } else if (ext === "pdf") {
      let pdfTextResult: typeof extracted | null = null;

      // Essai 1 : pdf-parse (PDFs textuels → Llama 3.3 70B, rapide et pas cher)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
        const result = await pdfParse(buffer);
        if (result.text && result.text.trim().length > 200) {
          pdfTextResult = await callLLM(result.text, false);
        } else {
          console.warn("[import-performance] pdf-parse returned insufficient text, falling back to Anthropic");
        }
      } catch (e) {
        console.warn("[import-performance] pdf-parse failed, falling back to Anthropic:", e);
      }

      // Fallback : Gemini 2.5 Flash (support natif PDF via inlineData, API Google directe)
      if (pdfTextResult) {
        extracted = pdfTextResult;
      } else {
        const base64 = buffer.toString("base64");
        extracted = await callGeminiPDF(base64);
      }
    } else if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        webp: "image/webp", heic: "image/heic",
      };
      const base64 = buffer.toString("base64");
      extracted = await callLLM("", true, base64, mimeMap[ext] || "image/jpeg");
    } else {
      return NextResponse.json({ error: `Type non supporté: .${ext}` }, { status: 400 });
    }

    // Save to DB (best-effort)
    const periods = (extracted.periods ?? []).map(
      (p: { year: number; month: number | null }) => `${p.year}-${p.month ?? "annual"}`
    );
    await supabase.from("performance_imports").insert({
      user_id: user.id,
      file_name: fileName,
      file_type: ext,
      status: "extracted",
      extracted_data: extracted,
      periods_detected: periods,
    });

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("[import-performance] FAILED", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: "Extraction échouée", details: message }, { status: 500 });
  }
}
