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
  | "portefeuille-coach"
  | "mon-reseau"
  | "reseau-detail-agences";

export type ExportDataType = "all" | "volumes" | "ratios";

export type ExportDetailLevel = "global" | "detail" | "global-detail";

// ── Exportable fields ──

export type ExportFieldId =
  // Identity
  | "nom"
  | "categorie"
  | "equipe"
  | "periode"
  // Volumes — prospection
  | "contacts_entrants"
  | "contacts_totaux"
  | "rdv_estimation"
  // Volumes — vendeurs
  | "estimations"
  | "mandats_signes"
  | "mandats_exclusifs"
  | "mandats_simples"
  | "rdv_suivi"
  | "requalifications"
  | "baisses_prix"
  // Volumes — acheteurs
  | "acheteurs_chauds"
  | "acheteurs_sortis_visite"
  | "visites"
  | "offres"
  | "compromis"
  // Volumes — ventes
  | "actes"
  | "chiffre_affaires"
  // Computed
  | "score_global"
  | "pct_exclusivite"
  // Ratios (each ratio is a field)
  | "ratio_contacts_rdv"
  | "ratio_estimations_mandats"
  | "ratio_pct_mandats_exclusifs"
  | "ratio_visites_offre"
  | "ratio_offres_compromis"
  | "ratio_mandats_simples_vente"
  | "ratio_mandats_exclusifs_vente";

export interface ExportFieldDef {
  id: ExportFieldId;
  label: string;
  group: "identity" | "volumes" | "ratios" | "computed";
  /** Only available when dataType includes this */
  dataType: "volumes" | "ratios" | "both";
}

const ALL_FIELDS: ExportFieldDef[] = [
  // Identity
  { id: "nom", label: "Nom", group: "identity", dataType: "both" },
  { id: "categorie", label: "Catégorie", group: "identity", dataType: "both" },
  { id: "equipe", label: "Équipe", group: "identity", dataType: "both" },
  { id: "periode", label: "Période", group: "identity", dataType: "both" },
  // Volumes — prospection
  { id: "contacts_entrants", label: "Contacts entrants", group: "volumes", dataType: "volumes" },
  { id: "contacts_totaux", label: "Contacts totaux", group: "volumes", dataType: "volumes" },
  { id: "rdv_estimation", label: "RDV Estimation", group: "volumes", dataType: "volumes" },
  // Volumes — vendeurs
  { id: "estimations", label: "Estimations", group: "volumes", dataType: "volumes" },
  { id: "mandats_signes", label: "Mandats signés", group: "volumes", dataType: "volumes" },
  { id: "mandats_exclusifs", label: "Mandats exclusifs", group: "volumes", dataType: "volumes" },
  { id: "mandats_simples", label: "Mandats simples", group: "volumes", dataType: "volumes" },
  { id: "rdv_suivi", label: "RDV Suivi", group: "volumes", dataType: "volumes" },
  { id: "requalifications", label: "Requalifications", group: "volumes", dataType: "volumes" },
  { id: "baisses_prix", label: "Baisses de prix", group: "volumes", dataType: "volumes" },
  // Volumes — acheteurs
  { id: "acheteurs_chauds", label: "Acheteurs chauds", group: "volumes", dataType: "volumes" },
  { id: "acheteurs_sortis_visite", label: "Acheteurs sortis visite", group: "volumes", dataType: "volumes" },
  { id: "visites", label: "Visites", group: "volumes", dataType: "volumes" },
  { id: "offres", label: "Offres", group: "volumes", dataType: "volumes" },
  { id: "compromis", label: "Compromis", group: "volumes", dataType: "volumes" },
  // Volumes — ventes
  { id: "actes", label: "Actes", group: "volumes", dataType: "volumes" },
  { id: "chiffre_affaires", label: "Chiffre d'affaires", group: "volumes", dataType: "volumes" },
  // Computed
  { id: "pct_exclusivite", label: "% Exclusivité", group: "computed", dataType: "both" },
  { id: "score_global", label: "Score global", group: "computed", dataType: "both" },
  // Ratios
  { id: "ratio_contacts_rdv", label: "Contacts \u2192 RDV", group: "ratios", dataType: "ratios" },
  { id: "ratio_estimations_mandats", label: "Estimations \u2192 Mandats", group: "ratios", dataType: "ratios" },
  { id: "ratio_pct_mandats_exclusifs", label: "% Mandats exclusifs", group: "ratios", dataType: "ratios" },
  { id: "ratio_visites_offre", label: "Visites \u2192 Offre", group: "ratios", dataType: "ratios" },
  { id: "ratio_offres_compromis", label: "Offres \u2192 Compromis", group: "ratios", dataType: "ratios" },
  { id: "ratio_mandats_simples_vente", label: "Mandats simples / vente", group: "ratios", dataType: "ratios" },
  { id: "ratio_mandats_exclusifs_vente", label: "Mandats exclusifs / vente", group: "ratios", dataType: "ratios" },
];

/** Get available fields based on selected data type */
export function getAvailableFields(dataType: ExportDataType): ExportFieldDef[] {
  return ALL_FIELDS.filter((f) => {
    if (dataType === "all") return true;
    if (f.dataType === "both") return true;
    return f.dataType === dataType;
  });
}

/** Get default selected field IDs for a data type */
export function getDefaultFieldIds(dataType: ExportDataType): Set<ExportFieldId> {
  const available = getAvailableFields(dataType);
  return new Set(available.map((f) => f.id));
}

export const FIELD_GROUPS: { key: string; label: string }[] = [
  { key: "identity", label: "Identité" },
  { key: "volumes", label: "Volumes" },
  { key: "computed", label: "Indicateurs calculés" },
  { key: "ratios", label: "Ratios de performance" },
];

// ── Config ──

export interface ExportConfig {
  scope: ExportScope;
  dataType: ExportDataType;
  periodStart: string; // YYYY-MM
  periodEnd: string;   // YYYY-MM
  detailLevel: ExportDetailLevel;
  selectedFields: Set<ExportFieldId>;
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

  if (role === "reseau") {
    options.push(
      { value: "mon-reseau", label: "Vue globale réseau" },
      { value: "reseau-detail-agences", label: "Détail par agence" },
    );
  }

  return options;
}

export function needsDetailLevel(scope: ExportScope): boolean {
  return ["mon-equipe", "mon-agence", "portefeuille-coach", "mon-reseau", "reseau-detail-agences"].includes(scope);
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

// ── Helpers ──

const has = (fields: Set<ExportFieldId>, id: ExportFieldId) => fields.has(id);

const STATUS_LABELS: Record<string, string> = {
  ok: "Conforme",
  warning: "Attention",
  danger: "Critique",
};

function getUserTeamLabel(user: User, allUsers: User[]): string {
  const manager = allUsers.find((u) => u.id === user.managerId);
  if (manager) return `Équipe ${manager.firstName} ${manager.lastName}`;
  if (user.role === "manager" || user.role === "directeur") return `Équipe ${user.firstName} ${user.lastName}`;
  return "—";
}

// ── Volume row builder (filtered by selected fields) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildVolumeRow(user: User, r: PeriodResults, fields: Set<ExportFieldId>, allUsers: User[]): Record<string, any> {
  const exclusifs = r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
  const simples = r.vendeurs.mandats.filter((m) => m.type === "simple").length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};

  if (has(fields, "nom")) row["Collaborateur"] = `${user.firstName} ${user.lastName}`;
  if (has(fields, "categorie")) row["Catégorie"] = CATEGORY_LABELS[user.category] ?? user.category;
  if (has(fields, "equipe")) row["Équipe"] = getUserTeamLabel(user, allUsers);
  if (has(fields, "periode")) row["Période"] = r.periodStart.slice(0, 7);
  if (has(fields, "contacts_entrants")) row["Contacts entrants"] = r.prospection.contactsEntrants;
  if (has(fields, "contacts_totaux")) row["Contacts totaux"] = r.prospection.contactsTotaux;
  if (has(fields, "rdv_estimation")) row["RDV Estimation"] = r.prospection.rdvEstimation;
  if (has(fields, "estimations")) row["Estimations"] = r.vendeurs.estimationsRealisees;
  if (has(fields, "mandats_signes")) row["Mandats signés"] = r.vendeurs.mandatsSignes;
  if (has(fields, "mandats_exclusifs")) row["Mandats exclusifs"] = exclusifs;
  if (has(fields, "mandats_simples")) row["Mandats simples"] = simples;
  if (has(fields, "rdv_suivi")) row["RDV Suivi"] = r.vendeurs.rdvSuivi;
  if (has(fields, "requalifications")) row["Requalifications"] = r.vendeurs.requalificationSimpleExclusif;
  if (has(fields, "baisses_prix")) row["Baisses de prix"] = r.vendeurs.baissePrix;
  if (has(fields, "acheteurs_chauds")) row["Acheteurs chauds"] = r.acheteurs.acheteursChauds.length;
  if (has(fields, "acheteurs_sortis_visite")) row["Acheteurs sortis visite"] = r.acheteurs.acheteursSortisVisite;
  if (has(fields, "visites")) row["Visites"] = r.acheteurs.nombreVisites;
  if (has(fields, "offres")) row["Offres"] = r.acheteurs.offresRecues;
  if (has(fields, "compromis")) row["Compromis"] = r.acheteurs.compromisSignes;
  if (has(fields, "actes")) row["Actes"] = r.ventes.actesSignes;
  if (has(fields, "chiffre_affaires")) row["Chiffre d'affaires"] = r.ventes.chiffreAffaires;
  if (has(fields, "pct_exclusivite")) {
    const total = r.vendeurs.mandats.length;
    row["% Exclusivité"] = total > 0 ? Math.round((exclusifs / total) * 100) : 0;
  }

  return row;
}

// ── Ratio row builder (filtered by selected fields) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRatioRows(user: User, r: PeriodResults, ratioConfigs: Record<RatioId, RatioConfig>, fields: Set<ExportFieldId>, allUsers: User[]): Record<string, any>[] {
  const ratios = computeAllRatios(r, user.category, ratioConfigs);

  // Filter to only selected ratio fields
  const selectedRatioIds = new Set<string>();
  for (const f of fields) {
    if (f.startsWith("ratio_")) {
      selectedRatioIds.add(f.replace("ratio_", ""));
    }
  }

  const filtered = selectedRatioIds.size > 0
    ? ratios.filter((cr) => selectedRatioIds.has(cr.ratioId))
    : ratios;

  return filtered.map((cr) => {
    const config = ratioConfigs[cr.ratioId as RatioId];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: Record<string, any> = {};
    if (has(fields, "nom")) row["Collaborateur"] = `${user.firstName} ${user.lastName}`;
    if (has(fields, "categorie")) row["Catégorie"] = CATEGORY_LABELS[user.category] ?? user.category;
    if (has(fields, "equipe")) row["Équipe"] = getUserTeamLabel(user, allUsers);
    if (has(fields, "periode")) row["Période"] = r.periodStart.slice(0, 7);
    row["Ratio"] = config?.name ?? cr.ratioId;
    row["Valeur"] = cr.value;
    row["Seuil"] = cr.thresholdForCategory;
    row["% Objectif"] = cr.percentageOfTarget;
    row["Statut"] = STATUS_LABELS[cr.status] ?? cr.status;
    return row;
  });
}

// ── Synthèse row builder ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSynthèseRow(user: User, userResults: PeriodResults[], ratioConfigs: Record<RatioId, RatioConfig>, fields: Set<ExportFieldId>, allUsers: User[]): Record<string, any> {
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

  const latest = [...userResults].sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
  let avgScore = 0;
  if (latest) {
    const ratios = computeAllRatios(latest, user.category, ratioConfigs);
    avgScore = ratios.length > 0
      ? Math.round(ratios.reduce((s, r) => s + r.percentageOfTarget, 0) / ratios.length)
      : 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: Record<string, any> = {};
  if (has(fields, "nom")) row["Collaborateur"] = `${user.firstName} ${user.lastName}`;
  if (has(fields, "categorie")) row["Catégorie"] = CATEGORY_LABELS[user.category] ?? user.category;
  if (has(fields, "equipe")) row["Équipe"] = getUserTeamLabel(user, allUsers);
  if (has(fields, "contacts_totaux") || has(fields, "contacts_entrants")) row["Contacts"] = contacts;
  if (has(fields, "estimations")) row["Estimations"] = estimations;
  if (has(fields, "mandats_signes") || has(fields, "mandats_exclusifs") || has(fields, "mandats_simples")) row["Mandats"] = mandats;
  if (has(fields, "pct_exclusivite") || has(fields, "mandats_exclusifs")) row["% Exclusivité"] = mandats > 0 ? Math.round((exclusifs / mandats) * 100) : 0;
  if (has(fields, "visites")) row["Visites"] = visites;
  if (has(fields, "offres")) row["Offres"] = offres;
  if (has(fields, "compromis")) row["Compromis"] = compromis;
  if (has(fields, "actes")) row["Actes"] = actes;
  if (has(fields, "chiffre_affaires")) row["CA"] = ca;
  if (has(fields, "score_global")) row["Score moyen"] = avgScore;

  return row;
}

// ── Main export function ──

export interface ExportInput {
  config: ExportConfig;
  currentUser: User;
  allUsers: User[];
  allResults: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  coachClients?: Array<{
    assignmentId: string;
    name: string;
    targetType: string;
    memberUserIds: string[];
  }>;
}

export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
}

export function generateExcelExport(input: ExportInput): ExportResult {
  const { config, currentUser, allUsers, allResults, ratioConfigs } = input;
  const fields = config.selectedFields;

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

  // 3. Determine what to generate
  const wb = XLSX.utils.book_new();
  const isMultiUser = scopeUsers.length > 1;
  const showGlobal = config.detailLevel === "global" || config.detailLevel === "global-detail";
  const showDetail = config.detailLevel === "detail" || config.detailLevel === "global-detail";
  const wantsVolumes = config.dataType === "all" || config.dataType === "volumes";
  const wantsRatios = config.dataType === "all" || config.dataType === "ratios";
  const hasVolumeFields = Array.from(fields).some((f) => {
    const def = ALL_FIELDS.find((d) => d.id === f);
    return def && (def.group === "volumes" || def.group === "computed");
  });
  const hasRatioFields = Array.from(fields).some((f) => f.startsWith("ratio_"));

  // 4. Build sheets

  // Sheet 1: Synthèse — always generated for multi-user when global view requested, or single-user as overview
  if (isMultiUser && (showGlobal || !needsDetailLevel(config.scope))) {
    const synthRows = scopeUsers.map((user) => {
      const userResults = filteredResults.filter((r) => r.userId === user.id);
      return buildSynthèseRow(user, userResults, ratioConfigs, fields, allUsers);
    }).filter((row) => Object.keys(row).length > 0);

    if (synthRows.length > 0) {
      addSheet(wb, "Synthèse", synthRows);
    }
  } else if (!isMultiUser) {
    // Single user: build a summary overview sheet
    const user = scopeUsers[0];
    const userResults = filteredResults.filter((r) => r.userId === user.id);
    if (userResults.length > 0) {
      const synthRow = buildSynthèseRow(user, userResults, ratioConfigs, fields, allUsers);
      if (Object.keys(synthRow).length > 0) {
        addSheet(wb, "Synthèse", [synthRow]);
      }
    }
  }

  // Sheet 2: Volumes (detail) — for multi-user with detail, or always for single-user
  if (wantsVolumes && hasVolumeFields) {
    const shouldShowVolumes = !isMultiUser || showDetail || !needsDetailLevel(config.scope);
    if (shouldShowVolumes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const volumeRows: Record<string, any>[] = [];
      for (const user of scopeUsers) {
        const userResults = filteredResults.filter((r) => r.userId === user.id);
        for (const r of userResults) {
          const row = buildVolumeRow(user, r, fields, allUsers);
          if (Object.keys(row).length > 0) volumeRows.push(row);
        }
      }
      if (volumeRows.length > 0) {
        addSheet(wb, isMultiUser ? "Détail collaborateurs" : "Volumes", volumeRows);
      }
    }
  }

  // Sheet 3: Ratios — when ratios requested and ratio fields selected
  if (wantsRatios && hasRatioFields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ratioRows: Record<string, any>[] = [];
    for (const user of scopeUsers) {
      const userResults = filteredResults.filter((r) => r.userId === user.id);
      for (const r of userResults) {
        ratioRows.push(...buildRatioRows(user, r, ratioConfigs, fields, allUsers));
      }
    }
    if (ratioRows.length > 0) {
      addSheet(wb, "Ratios", ratioRows);
    }
  }

  // 5. Check we have at least one sheet
  if (wb.SheetNames.length === 0) {
    return { success: false, error: "Aucune donnée à exporter pour cette configuration." };
  }

  // 6. Generate and trigger download
  const filename = buildFilename(config, currentUser);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  triggerDownload(blob, filename);

  return { success: true, filename };
}

// ── Scope resolution ──

function resolveScope(input: ExportInput): User[] {
  const { config, currentUser, allUsers, coachClients } = input;

  switch (config.scope) {
    case "mes-donnees":
      return [currentUser];

    case "mon-equipe": {
      const teamUsers = allUsers.filter(
        (u) => u.teamId === currentUser.teamId
      );
      return teamUsers;
    }

    case "mon-agence": {
      if (currentUser.institutionId) {
        return allUsers.filter(
          (u) => u.institutionId === currentUser.institutionId
        );
      }
      return allUsers.filter((u) => u.teamId === currentUser.teamId);
    }

    case "detail-collaborateurs": {
      if (currentUser.role === "directeur" && currentUser.institutionId) {
        return allUsers.filter(
          (u) => u.institutionId === currentUser.institutionId && u.role === "conseiller"
        );
      }
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

    case "mon-reseau":
    case "reseau-detail-agences": {
      // Réseau scope: all users across all institutions in the network
      // In the current architecture, the réseau user sees all users
      return allUsers.filter((u) => u.role === "conseiller" || u.role === "manager" || u.role === "directeur");
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

export function buildFilename(config: ExportConfig, user: User): string {
  const parts = ["nxt-export"];

  switch (config.scope) {
    case "mes-donnees":
      parts.push("conseiller");
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
    case "mon-reseau":
      parts.push("reseau-global");
      break;
    case "reseau-detail-agences":
      parts.push("reseau-detail");
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
