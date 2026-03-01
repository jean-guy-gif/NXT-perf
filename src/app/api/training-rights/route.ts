import { NextResponse } from "next/server";
import { computeRights, extractInputFromDraft } from "@/lib/simulateTrainingRights";
import type { AgeficeDraft } from "@/lib/plan-storage";
import { appendFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const LOG_FILE = join(tmpdir(), "training_rights_logs.jsonl");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draft = body.draft as AgeficeDraft;
    const meta = body.meta as { page?: string; source?: string } | undefined;

    if (!draft || !draft.nom || !draft.email) {
      return NextResponse.json(
        { error: "Données incomplètes" },
        { status: 400 }
      );
    }

    const input = extractInputFromDraft(draft);
    const result = computeRights(input);

    // Log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      identity: {
        nom: draft.nom,
        prenom: draft.prenom,
        email: draft.email,
        telephone: draft.telephone,
      },
      inputs: input,
      result: {
        fundingBody: result.fundingBody,
        fundingLabel: result.fundingLabel,
        confidence: result.confidence,
        referenceYear: result.referenceYear,
        annualCapEUR: result.annualCapEUR,
        droitRestant: result.droitRestant,
        priseEnChargeEstimee: result.priseEnChargeEstimee,
        resteACharge: result.resteACharge,
        montantFormation: result.montantFormation,
      },
      ruleVersion: result.ruleVersion,
      meta: meta ?? null,
    };

    try {
      appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n", "utf-8");
    } catch {
      console.log("[training-rights] log entry:", JSON.stringify(logEntry));
    }

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
