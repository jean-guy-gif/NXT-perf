import type { AgeficeDraft, TriAnswer } from "@/lib/plan-storage";
import { MICRO_NATURE_LABELS } from "@/lib/fundingRules";

function tri(v: TriAnswer): string {
  if (v === "oui") return "Oui";
  if (v === "non") return "Non";
  if (v === "ne_sais_pas") return "Ne sait pas";
  return "—";
}

const TAILLE_LABELS: Record<string, string> = {
  "1_10": "1-10 personnes",
  "11_49": "11-49 personnes",
  "50_PLUS": "50+ personnes",
  "JE_NE_SAIS_PAS": "Ne sait pas",
};

function formatDossierText(data: AgeficeDraft): string {
  const statutLabel =
    data.statut === "independant" ? "Indépendant"
    : data.statut === "salarie" ? "Salarié"
    : "Ne sait pas / mixte";

  const lines = [
    "═══════════════════════════════════════════════════════",
    "         DEMANDE DE FINANCEMENT",
    "═══════════════════════════════════════════════════════",
    "",
    `Date de la demande : ${new Date().toLocaleDateString("fr-FR")}`,
    "",
    "─── INFORMATIONS PERSONNELLES ─────────────────────────",
    "",
    `Nom                  : ${data.nom}`,
    `Prénom               : ${data.prenom}`,
    `Email                : ${data.email}`,
    `Téléphone            : ${data.telephone || "—"}`,
    "",
    "─── SITUATION PROFESSIONNELLE ─────────────────────────",
    "",
    `Statut               : ${statutLabel}`,
    `Bulletins de salaire : ${tri(data.bulletinsSalaireMensuels)}`,
    `Salaire par agence   : ${tri(data.versementSalaireParAgence)}`,
    `SIRET personnel      : ${tri(data.siretPersonnel)}`,
    `Immatriculation RSAC : ${tri(data.immatriculationRSAC)}`,
    `Micro-entrepreneur   : ${tri(data.microEntreprise)}`,
    `Cotisations à jour   : ${tri(data.cotisationsAJour)}`,
    `Attestation URSSAF   : ${tri(data.attestationUrssafCFPDisponible)}`,
    `Taille agence        : ${TAILLE_LABELS[data.tailleAgence] || "—"}`,
    `Début d'activité     : ${data.anneeDebutActivite || "—"}`,
  ];

  if (data.microEntreprise === "oui") {
    const natureLabel = data.natureActiviteMicro
      ? MICRO_NATURE_LABELS[data.natureActiviteMicro] || data.natureActiviteMicro
      : "—";
    lines.push(`Nature activité micro : ${natureLabel}`);
    lines.push(`CA N-1               : ${data.caN1 ? data.caN1 + " €" : "—"}`);
  }

  lines.push(
    "",
    "─── FORMATION SOUHAITÉE ───────────────────────────────",
    "",
    `Organisme            : ${data.organisme}`,
    `Formation choisie    : ${data.formationChoisie}`,
    `Dates souhaitées     : ${data.datesSouhaitees || "—"}`,
    `Montant (€ HT)       : ${data.montantFormationHT ? data.montantFormationHT + " €" : "—"}`,
    `Durée (heures)       : ${data.dureeHeures ? data.dureeHeures + " h" : "—"}`,
  );
  if (data.codeAPE) lines.push(`Code APE             : ${data.codeAPE}`);
  if (data.idcc) lines.push(`IDCC                 : ${data.idcc}`);

  lines.push(
    "",
    "─── FINANCEMENT ───────────────────────────────────────",
    "",
    `Formation financée cette année : ${tri(data.dejaFormationCetteAnnee)}`,
  );
  if (data.dejaFormationCetteAnnee === "oui") {
    lines.push(`Montant déjà consommé : ${data.montantDejaConsommeCetteAnnee ? data.montantDejaConsommeCetteAnnee + " €" : "—"}`);
  }

  lines.push(
    "",
    "─── NOTES ─────────────────────────────────────────────",
    "",
    "Ce document est un récapitulatif de votre demande de",
    "financement. Transmettez-le à votre organisme de",
    "formation qui vous accompagnera dans les démarches",
    "administratives.",
    "",
    "Contact Start Academy : formation@startacademy.fr",
    "",
    "═══════════════════════════════════════════════════════",
  );

  return lines.join("\n");
}

export function downloadDossierText(data: AgeficeDraft): boolean {
  try {
    const text = formatDossierText(data);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier-financement-${data.nom}-${data.prenom}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function copyDossierToClipboard(data: AgeficeDraft): Promise<boolean> {
  try {
    const text = formatDossierText(data);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
