import * as XLSX from "xlsx";
import type { User, UserRole } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId, ComputedRatio } from "@/types/ratios";
import { computeAllRatios } from "@/lib/ratios";
import { CATEGORY_LABELS } from "@/lib/constants";

// ── Types ──

export type ExportScope =
  | "mes-donnees"
  | "mon-equipe"
  | "mon-agence"
  | "detail-collaborateurs"
  | "client-coach"
  | "portefeuille-coach";

export type ExportDataType = "all" | "volumes" | "ratios";

export type ExportDetailLevel = "global" | "detail" | "global-detail";

export interface ExportConfig {
  scope: ExportScope;
  dataType: ExportDataType;
  periodStart: string; // YYYY-MM
  periodEnd: string;   // YYYY-MM
  detailLevel: ExportDetailLevel;
  /** For coach: selected client assignment IDs */
  selectedClientIds?: string[];
}

// ── Scope options per role ──

export interface ScopeOption {
  value: ExportScope;
  label: string;
}

export function getScopeOptionsForRole(role: UserRole, isCoach: boolean): ScopeOption[] {
  const options: ScopeOption[] = [];

  if (role === "coach" && isCoach) {
    options.push(
      { value: "client-coach", label: "Un client coaché" },
      { value: "portefeuille-coach", label: "Mon portefeuille coach" },
    );
    return options;
  }

  options.push({ value: "mes-donnees", label: "Mes données" });

  if (role === "manager") {
    options.push(
      { value: "mon-equipe", label: "Mon équipe" },
      { value: "detail-collaborateurs", label: "Détail par collaborateur" },
    );
  }

  if (role === "directeur") {
    options.push(
      { value: "mon-equipe", label: "Mon équipe" },
      { value: "mon-agence", label: "Mon agence" },
      { value: "detail-collaborateurs", label: "Détail par collaborateur" },
    );
  }

  return options;
}

export function needsDetailLevel(scope: ExportScope): boolean {
  return ["mon-equipe", "mon-agence", "portefeuille-coach"].includes(scope);
}

// ── Period helpers ──

export function getAvailableMonths(results: PeriodResults[]): string[] {
  const months = new Set<string>();
  for (const r of results) {
    if (r.periodType === "month") {
      months.add(r.periodStart.slice(0, 7));
    }
  }
  return [...months].sort();
}

function filterResultsByPeriod(
  results: PeriodResults[],
  periodStart: string,
  periodEnd: string
): PeriodResults[] {
  return results.filter((r) => {
    if (r.periodType !== "month") return false;
    const month = r.periodStart.slice(0, 7);
    return month >= periodStart && month <= periodEnd;
  });
}

// ── Data extraction helpers ──

interface VolumeRow {
  Collaborateur: string;
  Catégorie: string;
  Période: string;
  "Contacts entrants": number;
  "Contacts totaux": number;
  "RDV Estimation": number;
  Estimations: number;
  "Mandats signés": number;
  "Mandats exclusifs": number;
  "Mandats simples": number;
  "RDV Suivi": number;
  "Requalifications": number;
  "Baisses de prix": number;
  "Acheteurs chauds": number;
  "Acheteurs sortis visite": number;
  Visites: number;
  Offres: number;
  Compromis: number;
  Actes: number;
  "Chiffre d'affaires": number;
}

function buildVolumeRow(user: User, r: PeriodResults): VolumeRow {
  const exclusifs = r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
  const simples = r.vendeurs.mandats.filter((m) => m.type === "simple").length;
  return {
    Collaborateur: `${user.firstName} ${user.lastName}`,
    Catégorie: CATEGORY_LABELS[user.category] ?? user.category,
    Période: r.periodStart.slice(0, 7),
    "Contacts entrants": r.prospection.contactsEntrants,
    "Contacts totaux": r.prospection.contactsTotaux,
    "RDV Estimation": r.prospection.rdvEstimation,
    Estimations: r.vendeurs.estimationsRealisees,
    "Mandats signés": r.vendeurs.mandatsSignes,
    "Mandats exclusifs": exclusifs,
    "Mandats simples": simples,
    "RDV Suivi": r.vendeurs.rdvSuivi,
    "Requalifications": r.vendeurs.requalificationSimpleExclusif,
    "Baisses de prix": r.vendeurs.baissePrix,
    "Acheteurs chauds": r.acheteurs.acheteursChauds.length,
    "Acheteurs sortis visite": r.acheteurs.acheteursSortisVisite,
    Visites: r.acheteurs.nombreVisites,
    Offres: r.acheteurs.offresRecues,
    Compromis: r.acheteurs.compromisSignes,
    Actes: r.ventes.actesSignes,
    "Chiffre d'affaires": r.ventes.chiffreAffaires,
  };
}

interface RatioRow {
  Collaborateur: string;
  Catégorie: string;
  Période: string;
  Ratio: string;
  Valeur: number;
  Seuil: number;
  "% Objectif": number;
  Statut: string;
}

const STATUS_LABELS: Record<string, string> = {
  ok: "Conforme",
  warning: "Attention",
  danger: "Critique",
};

function buildRatioRows(
  user: User,
  r: PeriodResults,
  ratioConfigs: Record<RatioId, RatioConfig>
): RatioRow[] {
  const ratios = computeAllRatios(r, user.category, ratioConfigs);
  return ratios.map((cr) => {
    const config = ratioConfigs[cr.ratioId as RatioId];
    return {
      Collaborateur: `${user.firstName} ${user.lastName}`,
      Catégorie: CATEGORY_LABELS[user.category] ?? user.category,
      Période: r.periodStart.slice(0, 7),
      Ratio: config?.name ?? cr.ratioId,
      Valeur: cr.value,
      Seuil: cr.thresholdForCategory,
      "% Objectif": cr.percentageOfTarget,
      Statut: STATUS_LABELS[cr.status] ?? cr.status,
    };
  });
}

// ── Synthèse (summary) row ──

interface SynthèseRow {
  Collaborateur: string;
  Catégorie: string;
  Contacts: number;
  Estimations: number;
  Mandats: number;
  "% Exclusivité": number;
  Visites: number;
  Offres: number;
  Compromis: number;
  Actes: number;
  CA: number;
  "Score moyen": number;
}

function buildSynthèseRow(
  user: User,
  userResults: PeriodResults[],
  ratioConfigs: Record<RatioId, RatioConfig>
): SynthèseRow {
  let contacts = 0, estimations = 0, mandats = 0, exclusifs = 0;
  let visites = 0, offres = 0, compromis = 0, actes = 0, ca = 0;

  for (const r of userResults) {
    contacts += r.prospection.contactsTotaux;
    estimations += r.vendeurs.estimationsRealisees;
    mandats += r.vendeurs.mandatsSignes;
    exclusifs += r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
    visites += r.acheteurs.nombreVisites;
    offres += r.acheteurs.offresRecues;
    compromis += r.acheteurs.compromisSignes;
    actes += r.ventes.actesSignes;
    ca += r.ventes.chiffreAffaires;
  }

  // Compute average ratio score from most recent period
  const latest = [...userResults].sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
  let avgScore = 0;
  if (latest) {
    const ratios = computeAllRatios(latest, user.category, ratioConfigs);
    avgScore = ratios.length > 0
      ? Math.round(ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length)
      : 0;
  }

  return {
    Collaborateur: `${user.firstName} ${user.lastName}`,
    Catégorie: CATEGORY_LABELS[user.category] ?? user.category,
    Contacts: contacts,
    Estimations: estimations,
    Mandats: mandats,
    "% Exclusivité": mandats > 0 ? Math.round((exclusifs / mandats) * 100) : 0,
    Visites: visites,
    Offres: offres,
    Compromis: compromis,
    Actes: actes,
    CA: ca,
    "Score moyen": avgScore,
  };
}

// ── Main export function ──

export interface ExportInput {
  config: ExportConfig;
  currentUser: User;
  allUsers: User[];
  allResults: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  /** Coach portfolio client info if applicable */
  coachClients?: Array<{
    assignmentId: string;
    name: string;
    targetType: string;
    memberUserIds: string[];
  }>;
}

export function generateExcelExport(input: ExportInput): { success: boolean; error?: string } {
  const { config, currentUser, allUsers, allResults, ratioConfigs } = input;

  // 1. Determine which users are in scope
  const scopeUsers = resolveScope(input);
  if (scopeUsers.length === 0) {
    return { success: false, error: "Aucune donnée disponible pour cette sélection." };
  }

  // 2. Filter results by period and scope users
  const scopeUserIds = new Set(scopeUsers.map((u) => u.id));
  const filteredResults = filterResultsByPeriod(allResults, config.periodStart, config.periodEnd)
    .filter((r) => scopeUserIds.has(r.userId));

  if (filteredResults.length === 0) {
    return { success: false, error: "Aucune donnée trouvée pour la période sélectionnée." };
  }

  // 3. Build workbook
  const wb = XLSX.utils.book_new();
  const showDetail = config.detailLevel === "detail" || config.detailLevel === "global-detail";
  const showGlobal = config.detailLevel === "global" || config.detailLevel === "global-detail";
  const isSingleUser = scopeUsers.length === 1;

  // For single-user or when no detail level distinction needed
  if (isSingleUser || !needsDetailLevel(config.scope)) {
    // Simpler export: volumes + ratios on separate sheets
    if (config.dataType === "all" || config.dataType === "volumes") {
      const volumeRows: VolumeRow[] = [];
      for (const user of scopeUsers) {
        const userResults = filteredResults.filter((r) => r.userId === user.id);
        for (const r of userResults) {
          volumeRows.push(buildVolumeRow(user, r));
        }
      }
      if (volumeRows.length > 0) {
        addSheet(wb, "Volumes", volumeRows);
      }
    }

    if (config.dataType === "all" || config.dataType === "ratios") {
      const ratioRows: RatioRow[] = [];
      for (const user of scopeUsers) {
        const userResults = filteredResults.filter((r) => r.userId === user.id);
        for (const r of userResults) {
          ratioRows.push(...buildRatioRows(user, r, ratioConfigs));
        }
      }
      if (ratioRows.length > 0) {
        addSheet(wb, "Ratios", ratioRows);
      }
    }
  } else {
    // Multi-user export with detail levels
    if (showGlobal) {
      // Synthèse sheet
      const synthèseRows = scopeUsers.map((user) => {
        const userResults = filteredResults.filter((r) => r.userId === user.id);
        return buildSynthèseRow(user, userResults, ratioConfigs);
      });
      addSheet(wb, "Synthèse", synthèseRows);
    }

    if (showDetail || config.dataType !== "ratios") {
      if (config.dataType === "all" || config.dataType === "volumes") {
        const volumeRows: VolumeRow[] = [];
        for (const user of scopeUsers) {
          const userResults = filteredResults.filter((r) => r.userId === user.id);
          for (const r of userResults) {
            volumeRows.push(buildVolumeRow(user, r));
          }
        }
        if (volumeRows.length > 0) {
          addSheet(wb, "Volumes", volumeRows);
        }
      }
    }

    if (config.dataType === "all" || config.dataType === "ratios") {
      const ratioRows: RatioRow[] = [];
      for (const user of scopeUsers) {
        const userResults = filteredResults.filter((r) => r.userId === user.id);
        for (const r of userResults) {
          ratioRows.push(...buildRatioRows(user, r, ratioConfigs));
        }
      }
      if (ratioRows.length > 0) {
        addSheet(wb, "Ratios", ratioRows);
      }
    }
  }

  // 4. Check we have at least one sheet
  if (wb.SheetNames.length === 0) {
    return { success: false, error: "Aucune donnée à exporter pour cette configuration." };
  }

  // 5. Generate and trigger download
  const filename = buildFilename(config, currentUser);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  triggerDownload(blob, filename);

  return { success: true };
}

// ── Scope resolution ──

function resolveScope(input: ExportInput): User[] {
  const { config, currentUser, allUsers, coachClients } = input;

  switch (config.scope) {
    case "mes-donnees":
      return [currentUser];

    case "mon-equipe": {
      // Manager: self + agents in team
      const teamUsers = allUsers.filter(
        (u) => u.teamId === currentUser.teamId
      );
      return teamUsers;
    }

    case "mon-agence": {
      // Director: all users in the same institution
      if (currentUser.institutionId) {
        return allUsers.filter(
          (u) => u.institutionId === currentUser.institutionId
        );
      }
      // Fallback: all users in same team
      return allUsers.filter((u) => u.teamId === currentUser.teamId);
    }

    case "detail-collaborateurs": {
      // Same as mon-equipe or mon-agence depending on role
      if (currentUser.role === "directeur" && currentUser.institutionId) {
        return allUsers.filter(
          (u) => u.institutionId === currentUser.institutionId && u.role === "conseiller"
        );
      }
      // Manager: just team agents
      return allUsers.filter(
        (u) => u.teamId === currentUser.teamId && u.role === "conseiller"
      );
    }

    case "client-coach": {
      if (!coachClients || !config.selectedClientIds?.length) return [];
      const selectedId = config.selectedClientIds[0];
      const client = coachClients.find((c) => c.assignmentId === selectedId);
      if (!client) return [];
      return allUsers.filter((u) => client.memberUserIds.includes(u.id));
    }

    case "portefeuille-coach": {
      if (!coachClients) return [];
      const allMemberIds = new Set<string>();
      const selectedIds = config.selectedClientIds;
      const clients = selectedIds?.length
        ? coachClients.filter((c) => selectedIds.includes(c.assignmentId))
        : coachClients;
      for (const client of clients) {
        for (const uid of client.memberUserIds) {
          allMemberIds.add(uid);
        }
      }
      return allUsers.filter((u) => allMemberIds.has(u.id));
    }

    default:
      return [];
  }
}

// ── Sheet helper ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addSheet(wb: XLSX.WorkBook, name: string, data: any[]) {
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths: number[] = [];
  const keys = Object.keys(data[0] ?? {});
  for (let i = 0; i < keys.length; i++) {
    let maxLen = keys[i].length;
    for (const row of data) {
      const val = String(row[keys[i]] ?? "");
      if (val.length > maxLen) maxLen = val.length;
    }
    colWidths.push(Math.min(maxLen + 2, 30));
  }
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ── Filename builder ──

function buildFilename(config: ExportConfig, user: User): string {
  const parts = ["nxt-export"];

  switch (config.scope) {
    case "mes-donnees":
      parts.push("agent");
      break;
    case "mon-equipe":
      parts.push(user.role === "directeur" ? "directeur-equipe" : "manager-equipe");
      break;
    case "mon-agence":
      parts.push("directeur-agence");
      break;
    case "detail-collaborateurs":
      parts.push(user.role === "directeur" ? "directeur-detail" : "manager-detail");
      break;
    case "client-coach":
      parts.push("coach-client");
      break;
    case "portefeuille-coach":
      parts.push("coach-portefeuille");
      break;
  }

  parts.push(`${config.periodStart}_${config.periodEnd}`);

  return `${parts.join("-")}.xlsx`;
}

// ── Download trigger ──

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
