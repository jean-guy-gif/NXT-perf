import type { AgeficeDraft } from "@/lib/plan-storage";

function formatDossierText(data: AgeficeDraft): string {
  const lines = [
    "═══════════════════════════════════════════════════════",
    "         DEMANDE DE FINANCEMENT AGEFICE",
    "═══════════════════════════════════════════════════════",
    "",
    `Date de la demande : ${new Date().toLocaleDateString("fr-FR")}`,
    "",
    "─── INFORMATIONS PERSONNELLES ─────────────────────────",
    "",
    `Nom            : ${data.nom}`,
    `Prénom         : ${data.prenom}`,
    `Email          : ${data.email}`,
    `Téléphone      : ${data.telephone}`,
    `Statut         : ${data.statut === "independant" ? "Indépendant" : "Salarié"}`,
    `Cotisant AGEFICE : ${data.cotisantAgefice === "oui" ? "Oui" : data.cotisantAgefice === "non" ? "Non" : "Ne sait pas"}`,
    "",
    "─── FORMATION SOUHAITÉE ───────────────────────────────",
    "",
    `Organisme de formation : ${data.organisme}`,
    `Formation choisie      : ${data.formationChoisie}`,
    `Dates souhaitées       : ${data.datesSouhaitees}`,
    "",
    "─── NOTES ─────────────────────────────────────────────",
    "",
    "Ce document est un récapitulatif de votre demande de",
    "financement AGEFICE. Transmettez-le à votre organisme",
    "de formation qui vous accompagnera dans les démarches",
    "administratives.",
    "",
    "Contact Start Academy : formation@startacademy.fr",
    "",
    "═══════════════════════════════════════════════════════",
  ];

  return lines.join("\n");
}

export function downloadDossierText(data: AgeficeDraft): boolean {
  try {
    const text = formatDossierText(data);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier-agefice-${data.nom}-${data.prenom}.txt`;
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
