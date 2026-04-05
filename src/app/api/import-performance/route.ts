import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

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

function getSupabase(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll() { /* read-only in API routes */ },
    },
  });
}

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

  // Extract JSON from response (may be wrapped in markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in LLM response");

  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = getSupabase(request);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const buffer = Buffer.from(await file.arrayBuffer());

    let extracted;

    // Parse based on file type
    if (["xlsx", "xls", "csv"].includes(ext)) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets = workbook.SheetNames.map((name) => ({
        name,
        data: XLSX.utils.sheet_to_csv(workbook.Sheets[name]),
      }));
      const textContent = sheets.map((s) => `--- Feuille: ${s.name} ---\n${s.data}`).join("\n\n");
      extracted = await callLLM(textContent, false);
    } else if (ext === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const pdfResult = await parser.getText();
      extracted = await callLLM(pdfResult.text, false);
    } else if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        webp: "image/webp", heic: "image/heic",
      };
      const base64 = buffer.toString("base64");
      extracted = await callLLM("", true, base64, mimeMap[ext] || "image/jpeg");
    } else {
      return NextResponse.json({ error: `Type de fichier non supporté: .${ext}` }, { status: 400 });
    }

    // Save to DB
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
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[import-performance]", message);
    return NextResponse.json({ error: "Extraction échouée", details: message }, { status: 500 });
  }
}
