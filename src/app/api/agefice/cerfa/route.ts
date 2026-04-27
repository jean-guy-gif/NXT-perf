import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { generateCerfaPdf, mapDraftToCerfaInput } from "@/lib/cerfa-agefice";
import type { AgeficeDraft } from "@/lib/plan-storage";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/agefice/cerfa
 * Génère un CERFA AGEFICE prérempli depuis un AgeficeDraft du wizard.
 *
 * Body: { draft: AgeficeDraft }
 * Retour: PDF binaire (Content-Type: application/pdf)
 */
export async function POST(req: NextRequest) {
  // Auth obligatoire (cohérent avec /api/training-rights)
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: { draft?: AgeficeDraft };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const draft = body.draft;
  if (!draft) {
    return NextResponse.json({ error: "Champ 'draft' manquant" }, { status: 400 });
  }

  try {
    // Charger le PDF source depuis public/
    const pdfPath = join(process.cwd(), "public/cerfa/agefice-2025-2026.pdf");
    const pdfBytes = await readFile(pdfPath);

    // Mapper draft vers CerfaInput puis générer le PDF rempli
    const cerfaInput = mapDraftToCerfaInput(draft);
    const filledPdf = await generateCerfaPdf(cerfaInput, pdfBytes);

    // Nom de fichier suggéré
    const safeName = (draft.nom || "demande").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `agefice-cerfa-${safeName}-${Date.now()}.pdf`;

    return new NextResponse(filledPdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(filledPdf.length),
      },
    });
  } catch (err) {
    console.error("[/api/agefice/cerfa] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération du CERFA" },
      { status: 500 },
    );
  }
}
