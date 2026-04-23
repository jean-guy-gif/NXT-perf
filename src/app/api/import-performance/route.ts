import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  parseExcelRobust,
  countFilledFields,
  type ExcelExtractionResult,
  type FieldResult,
  type UnknownLabel,
} from "@/lib/excel-parser";
import {
  EXTRACTION_FIELDS,
  buildSynonymListForPrompt,
  type ExtractionFieldId,
} from "@/lib/extraction-dictionary";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.0-flash";
const MIN_EXCEL_FIELDS_BEFORE_FALLBACK = 4;

// ── Response shape ──────────────────────────────────────────────────────────

export type ImportPerformanceResponse = {
  fileName: string;
  fileType: "excel" | "pdf" | "image" | "other";
  fields: Record<ExtractionFieldId, FieldResult>;
  unknownLabels: UnknownLabel[];
  sheetsRead: string[];
  sheetsSkipped: string[];
};

// ── Prompt Gemini ───────────────────────────────────────────────────────────

function buildGeminiPrompt(): string {
  const fieldList = buildSynonymListForPrompt();
  const fieldNames = EXTRACTION_FIELDS.join(", ");

  return `Tu es un expert en extraction de données de performance immobilière (marché français).

Analyse ce document et extrais UNIQUEMENT les VOLUMES BRUTS (compteurs d'actes posés sur une période).

RÈGLE ABSOLUE #1 — IGNORE TOUT CE QUI EST RATIO :
- Pas de pourcentage (%)
- Pas de taux (de conversion, transformation, mandat, exclusivité, etc.)
- Pas de moyenne (délai moyen, ticket moyen, etc.)
- Pas de ratio calculé (CA/mandat, visites/offre, etc.)
Si tu vois "85%" ou "taux de conversion 15%", tu IGNORES ces cellules.

RÈGLE ABSOLUE #2 — NE PAS DEVINER :
Si tu n'es pas sûr d'un champ, laisse { "value": null, "confidence": 0 }.
Confidence: 1.0 = valeur explicite clairement labellée ; 0.7 = déduction plausible ;
0.5 = interprétation ; <0.5 = incertain (préfère null).

LES 12 CHAMPS À EXTRAIRE (aucun autre) :
${fieldList}

RÈGLE MANDATS SIMPLE/EXCLUSIF :
- Si tu vois DEUX colonnes distinctes (Simple/MS d'un côté, Exclusif/ME/MEX de l'autre) :
  mandatsSignes = somme MS + ME
  mandatsExclusifs = ME seul
- Si tu vois UNE SEULE colonne "Mandats" ou "Total mandats" :
  mandatsSignes = cette valeur
  mandatsExclusifs = null (laisse null, on ne devine pas)

CONTACTS — TOUT COMPTE :
contactsTotaux agrège tous les contacts : appels entrants + sortants, mails,
messages, conversations, discussions, leads, prospects, relances. Si plusieurs
colonnes de contacts existent (entrants, sortants…), SOMMER toutes ces colonnes
dans contactsTotaux (un seul total).

AGRÉGATION MULTI-PÉRIODES :
Si le document contient plusieurs périodes (ex: hebdo + mensuel + annuel),
privilégie la vue la plus complète (cumul annuel > mensuel > hebdo). Ne double
jamais un chiffre déjà comptabilisé dans une vue plus large.

FORMAT DE SORTIE — JSON STRICT, PAS DE MARKDOWN, PAS DE TEXTE AVANT/APRÈS :
{
  "fields": {
${EXTRACTION_FIELDS.map((f) => `    "${f}": { "value": null, "confidence": 0 }`).join(",\n")}
  },
  "unknownLabels": ["Intitulé vu mais non mappé à un des 12 champs", "..."],
  "sheetsRead": ["Nom de feuille/page lue 1", "..."],
  "sheetsSkipped": ["Nom de feuille/page ignorée (pas de données chiffrées)", "..."]
}

Clés fields autorisées (exactement ces 12, aucune autre) : ${fieldNames}
Si le document est un PDF ou une image sans feuilles, renvoie "sheetsRead": ["document"] et "sheetsSkipped": [].
unknownLabels : intitulés de colonnes/lignes vus dans le document qui ressemblent à des libellés métier mais que tu n'as pas pu rattacher à un des 12 champs. Ne mets PAS les noms des 12 champs eux-mêmes dans cette liste.`;
}

// ── Supabase helper ─────────────────────────────────────────────────────────

function getSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          /* read-only */
        },
      },
    },
  );
}

// ── Gemini call (unifié PDF / image / Excel fallback) ───────────────────────

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiExtraction = {
  fields: Record<ExtractionFieldId, FieldResult>;
  unknownLabels: string[];
  sheetsRead: string[];
  sheetsSkipped: string[];
};

async function callGemini(parts: GeminiPart[]): Promise<GeminiExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildGeminiPrompt() }, ...parts],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");

  const parsed = JSON.parse(jsonMatch[0]) as {
    fields?: Record<string, { value: unknown; confidence: unknown }>;
    unknownLabels?: unknown[];
    sheetsRead?: unknown[];
    sheetsSkipped?: unknown[];
  };

  return normalizeGeminiResponse(parsed);
}

function normalizeGeminiResponse(parsed: {
  fields?: Record<string, { value: unknown; confidence: unknown }>;
  unknownLabels?: unknown[];
  sheetsRead?: unknown[];
  sheetsSkipped?: unknown[];
}): GeminiExtraction {
  const fields = {} as Record<ExtractionFieldId, FieldResult>;
  for (const f of EXTRACTION_FIELDS) {
    const raw = parsed.fields?.[f];
    const value =
      typeof raw?.value === "number" && !isNaN(raw.value) ? raw.value : null;
    const confidence =
      typeof raw?.confidence === "number" && !isNaN(raw.confidence)
        ? Math.max(0, Math.min(1, raw.confidence))
        : 0;
    fields[f] = { value, confidence: value === null ? 0 : confidence };
  }

  const toStringArray = (v: unknown[] | undefined): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  return {
    fields,
    unknownLabels: toStringArray(parsed.unknownLabels),
    sheetsRead: toStringArray(parsed.sheetsRead),
    sheetsSkipped: toStringArray(parsed.sheetsSkipped),
  };
}

// ── Extraction per file type ───────────────────────────────────────────────

async function extractPDF(buffer: Buffer): Promise<GeminiExtraction> {
  return callGemini([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: buffer.toString("base64"),
      },
    },
  ]);
}

async function extractImage(
  buffer: Buffer,
  mimeType: string,
): Promise<GeminiExtraction> {
  return callGemini([
    {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    },
  ]);
}

async function extractExcelWithFallback(buffer: Buffer): Promise<{
  result: Omit<ImportPerformanceResponse, "fileName">;
  usedFallback: boolean;
}> {
  const fast: ExcelExtractionResult = parseExcelRobust(buffer);
  const filled = countFilledFields(fast.fields);

  if (filled >= MIN_EXCEL_FIELDS_BEFORE_FALLBACK) {
    return {
      result: {
        fileType: "excel",
        fields: fast.fields,
        unknownLabels: fast.unknownLabels,
        sheetsRead: fast.sheetsRead,
        sheetsSkipped: fast.sheetsSkipped,
      },
      usedFallback: false,
    };
  }

  // Fallback Gemini avec CSV de tous les onglets
  try {
    const geminiOut = await callGemini([
      {
        text: `Contenu Excel (CSV concaténé des onglets) :\n\n${fast.csvDump.slice(0, 30000)}`,
      },
    ]);

    const unknownFromGemini: UnknownLabel[] = geminiOut.unknownLabels.map(
      (l) => ({ rawLabel: l }),
    );
    const mergedUnknowns = mergeUnknowns(fast.unknownLabels, unknownFromGemini);

    return {
      result: {
        fileType: "excel",
        fields: geminiOut.fields,
        unknownLabels: mergedUnknowns,
        sheetsRead: fast.sheetsRead,
        sheetsSkipped: fast.sheetsSkipped,
      },
      usedFallback: true,
    };
  } catch (err) {
    console.warn(
      "[import-performance] Gemini fallback failed, keeping fast-path result",
      err,
    );
    return {
      result: {
        fileType: "excel",
        fields: fast.fields,
        unknownLabels: fast.unknownLabels,
        sheetsRead: fast.sheetsRead,
        sheetsSkipped: fast.sheetsSkipped,
      },
      usedFallback: false,
    };
  }
}

function mergeUnknowns(a: UnknownLabel[], b: UnknownLabel[]): UnknownLabel[] {
  const seen = new Set<string>();
  const out: UnknownLabel[] = [];
  for (const item of [...a, ...b]) {
    const key = item.rawLabel.toLowerCase().trim();
    if (!seen.has(key) && key.length > 0) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// ── Extraction summary for audit ───────────────────────────────────────────

function buildExtractionSummary(res: ImportPerformanceResponse) {
  const extractedCount = EXTRACTION_FIELDS.filter(
    (f) => res.fields[f].value !== null,
  ).length;
  const confidences = EXTRACTION_FIELDS.map(
    (f) => res.fields[f].confidence,
  ).filter((c) => c > 0);
  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  return {
    sheetsRead: res.sheetsRead,
    sheetsSkipped: res.sheetsSkipped,
    fieldsExtracted: extractedCount,
    fieldsTotal: EXTRACTION_FIELDS.length,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    unknownCount: res.unknownLabels.length,
  };
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase(request);
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { allowed } = checkRateLimit(
      `import-performance:${user.id}`,
      5,
      60_000,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 Mo)" },
        { status: 400 },
      );
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let response: ImportPerformanceResponse;

    if (["xlsx", "xls", "csv"].includes(ext)) {
      const { result } = await extractExcelWithFallback(buffer);
      response = { ...result, fileName };
    } else if (ext === "pdf") {
      const geminiOut = await extractPDF(buffer);
      response = {
        fileName,
        fileType: "pdf",
        fields: geminiOut.fields,
        unknownLabels: geminiOut.unknownLabels.map((l) => ({ rawLabel: l })),
        sheetsRead:
          geminiOut.sheetsRead.length > 0 ? geminiOut.sheetsRead : ["document"],
        sheetsSkipped: geminiOut.sheetsSkipped,
      };
    } else if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
      const mimeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        heic: "image/heic",
      };
      const geminiOut = await extractImage(buffer, mimeMap[ext] || "image/jpeg");
      response = {
        fileName,
        fileType: "image",
        fields: geminiOut.fields,
        unknownLabels: geminiOut.unknownLabels.map((l) => ({ rawLabel: l })),
        sheetsRead:
          geminiOut.sheetsRead.length > 0 ? geminiOut.sheetsRead : ["capture"],
        sheetsSkipped: geminiOut.sheetsSkipped,
      };
    } else {
      return NextResponse.json(
        { error: `Type non supporté : .${ext}` },
        { status: 400 },
      );
    }

    // ── Audit : performance_imports (1 ligne par upload) ─────────────────
    const summary = buildExtractionSummary(response);
    const { error: importErr } = await supabase
      .from("performance_imports")
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_type: response.fileType,
        status: "extracted",
        extracted_data: response,
        extraction_summary: summary,
        periods_detected: response.sheetsRead,
      });
    if (importErr) {
      console.warn(
        "[import-performance] failed to insert performance_imports",
        importErr.message,
      );
    }

    // ── Collecte : extraction_unknowns (N lignes par upload) ──────────────
    if (response.unknownLabels.length > 0) {
      const rows = response.unknownLabels.map((u) => ({
        user_id: user.id,
        file_name: fileName,
        file_type: response.fileType,
        raw_label: u.rawLabel,
        sheet_name: u.sheetName ?? null,
        row_number: u.rowNumber ?? null,
        column_letter: u.columnLetter ?? null,
        suggested_field: u.suggestedField ?? null,
      }));
      const { error: unknownsErr } = await supabase
        .from("extraction_unknowns")
        .insert(rows);
      if (unknownsErr) {
        console.warn(
          "[import-performance] failed to log extraction_unknowns",
          unknownsErr.message,
        );
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[import-performance] FAILED", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Extraction échouée", details: message },
      { status: 500 },
    );
  }
}
