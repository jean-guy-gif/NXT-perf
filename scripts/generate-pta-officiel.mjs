// scripts/generate-pta-officiel.mjs
// Convertit agefice_points_accueil.xlsx en src/data/agefice-pta-officiel.ts
// Source: référentiel officiel AGEFICE 2025-2026 (438 PTA, 101 départements)

import { readFile, writeFile } from "fs/promises";
import { read, utils } from "xlsx";

const XLSX_PATH = "scripts/agefice_points_accueil.xlsx";
const OUT_PATH = "src/data/agefice-pta-officiel.ts";

function escape(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ").replace(/\r/g, "").trim();
}

function categorize(name) {
  const n = String(name || "").toUpperCase();
  if (n.includes("607") || n.includes("DÉMATÉRIALISÉ") || n.includes("DEMATERIALIS")) return "PTA_607";
  if (n.startsWith("CCI")) return "CCI";
  if (n.startsWith("CPME")) return "CPME";
  if (n.startsWith("UMIH")) return "UMIH";
  if (n.startsWith("MEDEF")) return "MEDEF";
  if (n.startsWith("UPE")) return "UPE";
  if (n.includes("U2P")) return "U2P";
  return "AUTRE";
}

function padCp(value) {
  if (value === null || value === undefined || value === "") return "";
  // Excel a perdu les zéros initiaux, on pad à 5 chiffres
  const str = String(value).replace(/\D/g, "");
  return str.padStart(5, "0").slice(0, 5);
}

/**
 * Pad un code département au format officiel :
 * - Codes numériques 1-9 → "01"-"09"
 * - Codes numériques 10-95 → "10"-"95" (intacts)
 * - Codes DOM-TOM 971-976 → intacts
 * - Codes Corse "2A"/"2B" → intacts
 */
function padDeptCode(value) {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value).trim();
  if (str === "2A" || str === "2B") return str;
  if (/^\d+$/.test(str)) {
    if (str.length === 1) return `0${str}`;
    return str;
  }
  return str;
}

function padTel(value) {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value).replace(/\D/g, "");
  // Si 9 chiffres → préfixer 0 (ex: 492565676 → 0492565676)
  if (str.length === 9) return `0${str}`;
  return str;
}

async function main() {
  console.log(`Reading ${XLSX_PATH}...`);
  const buf = await readFile(XLSX_PATH);
  const wb = read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(sheet, { defval: "" });
  console.log(`Loaded ${rows.length} rows.`);

  const lines = [];
  lines.push("// src/data/agefice-pta-officiel.ts");
  lines.push("// Source: agefice_points_accueil.xlsx (référentiel officiel AGEFICE 2025-2026)");
  lines.push(`// ${rows.length} points d'accueil sur ${new Set(rows.map(r => r["Département (code)"])).size} départements (DOM-TOM inclus).`);
  lines.push("// Codes postaux et téléphones normalisés (zéros initiaux préservés).");
  lines.push("//");
  lines.push("// Remplace l'ancien pta-agefice-france.ts (96 entrées CCI/CMA approximatives).");
  lines.push("");
  lines.push('export type PTAType = "CCI" | "CPME" | "UMIH" | "MEDEF" | "UPE" | "U2P" | "PTA_607" | "AUTRE";');
  lines.push("");
  lines.push("export interface PTAOfficiel {");
  lines.push("  /** Code département : \"01\"-\"95\", \"2A\", \"2B\", \"971\"-\"976\" */");
  lines.push("  departementCode: string;");
  lines.push("  /** Nom complet du département */");
  lines.push("  departementNom: string;");
  lines.push("  /** Nom du Point d'Accueil */");
  lines.push("  nom: string;");
  lines.push("  /** Catégorie pour filtrage UI */");
  lines.push("  type: PTAType;");
  lines.push("  /** Adresse principale (ligne 1) */");
  lines.push("  adresse: string;");
  lines.push("  /** Adresse complémentaire (ligne 2) */");
  lines.push("  adresseSuite: string;");
  lines.push("  /** Code postal à 5 chiffres */");
  lines.push("  codePostal: string;");
  lines.push("  /** Ville */");
  lines.push("  ville: string;");
  lines.push("  /** Téléphone (10 chiffres avec 0 initial) */");
  lines.push("  telephone: string;");
  lines.push("  /** Email */");
  lines.push("  email: string;");
  lines.push("  /** Site web (souvent vide) */");
  lines.push("  siteWeb: string;");
  lines.push("}");
  lines.push("");
  lines.push("export const PTA_OFFICIEL: PTAOfficiel[] = [");

  for (const row of rows) {
    const code = padDeptCode(row["Département (code)"]);
    const nomDept = escape(row["Nom Département"]);
    const nomPta = escape(row["Nom Point d'Accueil"]);
    const adresse = escape(row["Adresse"]);
    const adresseSuite = escape(row["Adresse (suite)"]);
    const cp = padCp(row["Code Postal"]);
    const ville = escape(row["Ville"]);
    const tel = padTel(row["Téléphone"]);
    const email = escape(row["Email"]);
    const site = escape(row["Site Web"]);
    const type = categorize(nomPta);

    lines.push("  {");
    lines.push(`    departementCode: "${code}",`);
    lines.push(`    departementNom: "${nomDept}",`);
    lines.push(`    nom: "${nomPta}",`);
    lines.push(`    type: "${type}",`);
    lines.push(`    adresse: "${adresse}",`);
    lines.push(`    adresseSuite: "${adresseSuite}",`);
    lines.push(`    codePostal: "${cp}",`);
    lines.push(`    ville: "${ville}",`);
    lines.push(`    telephone: "${tel}",`);
    lines.push(`    email: "${email}",`);
    lines.push(`    siteWeb: "${site}",`);
    lines.push("  },");
  }

  lines.push("];");
  lines.push("");
  lines.push("// =============================================================================");
  lines.push("// HELPERS");
  lines.push("// =============================================================================");
  lines.push("");
  lines.push("/**");
  lines.push(" * Retourne tous les PTA disponibles pour un département donné.");
  lines.push(" * Inclut la PTA 607 dématérialisée (présente dans tous les départements).");
  lines.push(" */");
  lines.push("export function getPTAByDepartment(departementCode: string): PTAOfficiel[] {");
  lines.push("  if (!departementCode) return [];");
  lines.push("  return PTA_OFFICIEL.filter((p) => p.departementCode === departementCode);");
  lines.push("}");
  lines.push("");
  lines.push("/**");
  lines.push(" * Retourne la PTA 607 dématérialisée nationale (option par défaut digital).");
  lines.push(" */");
  lines.push("export function getPTA607Dematerialisee(): PTAOfficiel | undefined {");
  lines.push('  return PTA_OFFICIEL.find((p) => p.type === "PTA_607");');
  lines.push("}");
  lines.push("");
  lines.push("/**");
  lines.push(" * Extrait le code département depuis un code postal français.");
  lines.push(" * Gère Corse (2A/2B), DOM-TOM (971-976), métropole.");
  lines.push(" * @returns null si CP invalide");
  lines.push(" */");
  lines.push("export function extractDepartmentFromPostalCode(cp) {");
  lines.push("  if (!cp) return null;");
  lines.push('  const cleaned = cp.replace(/\\s/g, "");');
  lines.push("  if (cleaned.length !== 5 || !/^\\d{5}$/.test(cleaned)) return null;");
  lines.push("");
  lines.push('  if (cleaned.startsWith("20")) {');
  lines.push("    const num = parseInt(cleaned.slice(2), 10);");
  lines.push('    return num <= 199 ? "2A" : "2B";');
  lines.push("  }");
  lines.push("");
  lines.push('  if (cleaned.startsWith("97")) return cleaned.slice(0, 3);');
  lines.push("");
  lines.push("  // Métropole : on conserve le code à 2 chiffres tel quel (\"01\", \"75\"...)");
  lines.push("  // pour matcher les clés de PTA_OFFICIEL.");
  lines.push("  return cleaned.slice(0, 2);");
  lines.push("}");
  lines.push("");

  // Convert the JS function signature to TS in the output
  const tsOutput = lines.join("\n").replace(
    "export function extractDepartmentFromPostalCode(cp) {",
    "export function extractDepartmentFromPostalCode(cp: string): string | null {"
  );

  await writeFile(OUT_PATH, tsOutput, "utf8");
  console.log(`✓ Generated ${OUT_PATH}`);
  console.log(`  Lines: ${tsOutput.split("\n").length}`);
  console.log(`  Size: ${tsOutput.length} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
