// ── Types ────────────────────────────────────────────────────────────────────

export interface MandatDetail {
  nomVendeur: string;
  type: "simple" | "exclusif";
}

export interface InfoVenteDetail {
  nom: string;
  commentaire: string;
}

export interface AcheteurDetail {
  nom: string;
  commentaire: string;
}

/** Champs numériques extraits — PRD section 9 mapping complet */
export interface ExtractedFields {
  // Prospection
  contactsTotaux?: number;
  contactsEntrants?: number;
  rdvEstimation?: number;
  // Vendeurs
  estimationsRealisees?: number;
  mandatsSignes?: number;
  rdvSuivi?: number;
  requalificationSimpleExclusif?: number;
  baissePrix?: number;
  // Acheteurs
  acheteursChaudsCount?: number;
  acheteursSortisVisite?: number;
  nombreVisites?: number;
  offresRecues?: number;
  compromisSignes?: number;
  // Ventes
  actesSignes?: number;
  chiffreAffaires?: number;
  delaiMoyenVente?: number;
}

/** Tableaux structurés extraits (noms, détails) */
export interface ExtractedArrays {
  mandats: MandatDetail[];
  informationsVente: InfoVenteDetail[];
  acheteursChauds: AcheteurDetail[];
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
  arrays: { mandats: [], informationsVente: [], acheteursChauds: [] },
  uncertain: [],
  unmapped: [],
  description: "",
  confidence: 0,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeResult(data: Record<string, unknown>): ExtractionResult {
  const raw = (data.extracted ?? {}) as Record<string, unknown>;
  const extracted: ExtractedFields = {};

  // Ne garder que les champs numériques valides
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
      informationsVente: Array.isArray(arrays.informationsVente)
        ? arrays.informationsVente
        : [],
      acheteursChauds: Array.isArray(arrays.acheteursChauds)
        ? arrays.acheteursChauds
        : [],
    },
    uncertain: Array.isArray(data.uncertain) ? (data.uncertain as string[]) : [],
    unmapped: Array.isArray(data.unmapped) ? (data.unmapped as string[]) : [],
    description: typeof data.description === "string" ? data.description : "",
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
  };
}

// ── API Calls ────────────────────────────────────────────────────────────────

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
