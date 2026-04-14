// ── Types ────────────────────────────────────────────────────────────────────

export interface MandatDetail {
  nomVendeur: string;
  type: "simple" | "exclusif";
}

/** Champs numériques extraits */
export interface ExtractedFields {
  // Prospection vendeur
  contactsTotaux?: number;
  rdvEstimation?: number;
  estimationsRealisees?: number;
  mandatsSignes?: number;
  // Pilotage portefeuille
  rdvSuivi?: number;
  requalificationSimpleExclusif?: number;
  baissePrix?: number;
  // Transaction acheteur
  acheteursSortisVisite?: number;
  nombreVisites?: number;
  offresRecues?: number;
  compromisSignes?: number;
  chiffreAffairesCompromis?: number;
  actesSignes?: number;
  chiffreAffaires?: number;
}

/** Tableaux structurés extraits (noms, détails) */
export interface ExtractedArrays {
  mandats: MandatDetail[];
}

/** Résultat complet d'une extraction */
export interface ExtractionResult {
  extracted: ExtractedFields;
  arrays: ExtractedArrays;
  uncertain: string[];
  unmapped: string[];
  description: string;
  confidence: number;
}

const EMPTY_RESULT: ExtractionResult = {
  extracted: {},
  arrays: { mandats: [] },
  uncertain: [],
  unmapped: [],
  description: "",
  confidence: 0,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeResult(data: Record<string, unknown>): ExtractionResult {
  const raw = (data.extracted ?? {}) as Record<string, unknown>;
  const extracted: ExtractedFields = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "number" && !isNaN(value)) {
      (extracted as Record<string, number>)[key] = value;
    }
  }

  const arrays = (data.arrays ?? {}) as Partial<ExtractedArrays>;

  return {
    extracted,
    arrays: {
      mandats: Array.isArray(arrays.mandats) ? arrays.mandats : [],
    },
    uncertain: Array.isArray(data.uncertain) ? (data.uncertain as string[]) : [],
    unmapped: Array.isArray(data.unmapped) ? (data.unmapped as string[]) : [],
    description: typeof data.description === "string" ? data.description : "",
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
  };
}

// ── API Calls ────────────────────────────────────────────────────────────────

export async function extractFromConversation(
  text: string,
  currentFields: Partial<ExtractedFields>,
  targetFields: string[],
): Promise<ExtractionResult> {
  try {
    const res = await fetch("/api/saisie-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extract", text, currentFields, targetFields }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("[saisie-ai] extract error:", data.error);
      return { ...EMPTY_RESULT, description: `Erreur : ${data.error}` };
    }
    return normalizeResult(data);
  } catch (err) {
    console.error("[saisie-ai-client] extractFromConversation error:", err);
    return EMPTY_RESULT;
  }
}

export async function extractFromDocument(
  textContent: string,
  fileName: string,
): Promise<ExtractionResult> {
  try {
    const res = await fetch("/api/saisie-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extract_document", textContent, fileName }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("[saisie-ai] extract_document error:", data.error);
      return { ...EMPTY_RESULT, description: `Erreur : ${data.error}` };
    }
    return normalizeResult(data);
  } catch (err) {
    console.error("[saisie-ai-client] extractFromDocument error:", err);
    return EMPTY_RESULT;
  }
}

export async function extractFromImage(
  imageBase64: string,
  imageMediaType: string,
): Promise<ExtractionResult> {
  try {
    const res = await fetch("/api/saisie-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extract_image", imageBase64, imageMediaType }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("[saisie-ai] extract_image error:", data.error);
      return { ...EMPTY_RESULT, description: `Erreur : ${data.error}` };
    }
    return normalizeResult(data);
  } catch (err) {
    console.error("[saisie-ai-client] extractFromImage error:", err);
    return EMPTY_RESULT;
  }
}
