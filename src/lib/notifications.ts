import type { User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import { computeAllRatios } from "@/lib/ratios";
import { getGlobalScore } from "@/lib/scoring";
import { shouldNotifyManager } from "@/lib/weekly-gate";
import type { RatioConfig, RatioId } from "@/types/ratios";

export interface AppNotification {
  id: string;
  type: "warning" | "info";
  message: string;
  detail: string;
  link?: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000);
}

function formatDays(days: number): string {
  const rounded = Math.floor(days);
  return rounded <= 1 ? "1 jour" : `${rounded} jours`;
}

/** Check if any results for a user contain treated contacts (statut !== "en_cours") */
function hasTreatedContacts(userResults: PeriodResults[]): boolean {
  return userResults.some(
    (r) =>
      r.prospection.informationsVente.some((i) => i.statut !== "en_cours") ||
      r.acheteurs.acheteursChauds.some((i) => i.statut !== "en_cours")
  );
}

/** Latest updatedAt among results that have treated contacts */
function latestTreatedAt(userResults: PeriodResults[]): string | null {
  return userResults.reduce<string | null>((latest, r) => {
    const hasTreated =
      r.prospection.informationsVente.some((i) => i.statut !== "en_cours") ||
      r.acheteurs.acheteursChauds.some((i) => i.statut !== "en_cours");
    if (hasTreated && (!latest || r.updatedAt > latest)) return r.updatedAt;
    return latest;
  }, null);
}

export function computeNotifications(
  user: User | null,
  results: PeriodResults[],
  allUsers: User[],
  ratioConfigs?: Record<RatioId, RatioConfig>
): AppNotification[] {
  if (!user) return [];

  if (user.role === "directeur") {
    return computeDirecteurNotifications(user, results, allUsers, ratioConfigs);
  }

  if (user.role === "manager") {
    return computeManagerNotifications(user, results, allUsers, ratioConfigs);
  }

  return computeConseillerNotifications(user, results, ratioConfigs);
}

function computeConseillerNotifications(
  user: User,
  results: PeriodResults[],
  ratioConfigs?: Record<RatioId, RatioConfig>
): AppNotification[] {
  const notifs: AppNotification[] = [];

  // Check last data entry
  const userResults = results.filter((r) => r.userId === user.id);
  const latestUpdatedAt = userResults.reduce<string | null>((latest, r) => {
    if (!latest || r.updatedAt > latest) return r.updatedAt;
    return latest;
  }, null);

  if (!latestUpdatedAt || Date.now() - new Date(latestUpdatedAt).getTime() > SEVEN_DAYS_MS) {
    const days = latestUpdatedAt ? daysSince(latestUpdatedAt) : null;
    notifs.push({
      id: "saisie-retard",
      type: "warning",
      message: "Pas de saisie depuis plus d'une semaine",
      detail: days
        ? `Dernière saisie il y a ${formatDays(days)}`
        : "Aucune saisie enregistrée",
      link: "/dashboard",
    });
  }

  // Check last contact action (deal/abandon) — derived from treated contacts in results
  const lastTreated = latestTreatedAt(userResults);

  if (!lastTreated || Date.now() - new Date(lastTreated).getTime() > SEVEN_DAYS_MS) {
    const hasTreated = hasTreatedContacts(userResults);
    const days = lastTreated ? daysSince(lastTreated) : null;
    notifs.push({
      id: "contacts-retard",
      type: "warning",
      message: "Pas d'action sur vos contacts depuis plus d'une semaine",
      detail: days
        ? `Dernière action il y a ${formatDays(days)}`
        : hasTreated
          ? "Aucune action récente"
          : "Aucune action dealé/abandonné enregistrée",
      link: "/dashboard?tab=suivi",
    });
  }

  // Ratio-based alerts
  if (ratioConfigs) {
    const latestResult = userResults.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
    if (latestResult) {
      const ratios = computeAllRatios(latestResult, user.category, ratioConfigs);
      const dangerRatios = ratios.filter((r) => r.status === "danger");
      const globalScore = getGlobalScore(ratios);

      if (dangerRatios.length >= 3) {
        notifs.push({
          id: "ratios-critiques",
          type: "warning",
          message: `${dangerRatios.length} ratios en zone critique`,
          detail: dangerRatios.map((r) => ratioConfigs[r.ratioId as RatioId]?.name?.split("→")[0].trim()).join(", "),
          link: "/performance",
        });
      } else if (dangerRatios.length > 0) {
        for (const ratio of dangerRatios) {
          const config = ratioConfigs[ratio.ratioId as RatioId];
          notifs.push({
            id: `ratio-danger-${ratio.ratioId}`,
            type: "warning",
            message: `${config?.name?.split("→")[0].trim()} en zone critique`,
            detail: `${ratio.value}${config?.unit ?? ""} — objectif : ${ratio.thresholdForCategory}${config?.unit ?? ""}`,
            link: "/performance",
          });
        }
      }

      if (globalScore.level === "critique") {
        notifs.push({
          id: "score-global-critique",
          type: "warning",
          message: "Performance globale critique",
          detail: `Score : ${globalScore.score}% — des actions urgentes sont nécessaires`,
          link: "/formation",
        });
      }
    }
  }

  return notifs;
}

function computeManagerNotifications(
  user: User,
  results: PeriodResults[],
  allUsers: User[],
  ratioConfigs?: Record<RatioId, RatioConfig>
): AppNotification[] {
  const notifs: AppNotification[] = [];

  // Check each team member's last data entry
  const teamConseillers = allUsers.filter(
    (u) => u.role === "conseiller" && u.teamId === user.teamId
  );

  const lateName: string[] = [];

  for (const conseiller of teamConseillers) {
    const userResults = results.filter((r) => r.userId === conseiller.id);
    const latestUpdatedAt = userResults.reduce<string | null>((latest, r) => {
      if (!latest || r.updatedAt > latest) return r.updatedAt;
      return latest;
    }, null);

    if (!latestUpdatedAt || Date.now() - new Date(latestUpdatedAt).getTime() > SEVEN_DAYS_MS) {
      lateName.push(`${conseiller.firstName} ${conseiller.lastName}`);
    }
  }

  if (lateName.length > 0) {
    notifs.push({
      id: "manager-saisie-retard",
      type: "warning",
      message: `${lateName.length} conseiller${lateName.length > 1 ? "s" : ""} sans saisie récente`,
      detail: lateName.join(", "),
    });
  }

  // Weekly gate: Monday notification if agents missed Friday submission
  const overdueFriday: string[] = [];
  for (const conseiller of teamConseillers) {
    const userResults = results.filter((r) => r.userId === conseiller.id);
    const latestDate = userResults.reduce<string | null>((latest, r) => {
      if (!latest || r.updatedAt > latest) return r.updatedAt;
      return latest;
    }, null);
    if (shouldNotifyManager({ agentLastSubmissionDate: latestDate })) {
      overdueFriday.push(conseiller.firstName);
    }
  }
  if (overdueFriday.length > 0) {
    const names = overdueFriday.length <= 3
      ? overdueFriday.join(", ")
      : `${overdueFriday.slice(0, 3).join(", ")} et ${overdueFriday.length - 3} autre${overdueFriday.length - 3 > 1 ? "s" : ""}`;
    notifs.push({
      id: "manager-weekly-overdue",
      type: "warning",
      message: `Saisie manquante : ${overdueFriday.length} agent${overdueFriday.length > 1 ? "s" : ""}`,
      detail: `${names} — saisie de la semaine passée non complétée`,
      link: "/manager/cockpit",
    });
  }

  // Check global contact actions — derived from results
  const lastTreated = latestTreatedAt(results);

  if (!lastTreated || Date.now() - new Date(lastTreated).getTime() > SEVEN_DAYS_MS) {
    notifs.push({
      id: "manager-contacts-retard",
      type: "warning",
      message: "Aucune action récente sur les contacts",
      detail: "Aucun deal ou abandon enregistré cette semaine",
      link: "/dashboard?tab=suivi",
    });
  }

  // Ratio-based team alerts
  if (ratioConfigs) {
    let weakCount = 0;
    for (const conseiller of teamConseillers) {
      const cResults = results.filter((r) => r.userId === conseiller.id);
      const latest = cResults.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
      if (latest) {
        const ratios = computeAllRatios(latest, conseiller.category, ratioConfigs);
        const score = getGlobalScore(ratios);
        if (score.level === "faible" || score.level === "critique") weakCount++;
      }
    }

    if (weakCount > 0 && teamConseillers.length > 0) {
      const pct = Math.round((weakCount / teamConseillers.length) * 100);
      notifs.push({
        id: "team-weak-performers",
        type: "warning",
        message: `${weakCount} conseiller${weakCount > 1 ? "s" : ""} en difficulté (${pct}% de l'équipe)`,
        detail: "Consultez le GPS Équipe pour identifier les axes d'amélioration",
        link: "/manager/gps",
      });
    }
  }

  return notifs;
}

function computeDirecteurNotifications(
  user: User,
  results: PeriodResults[],
  allUsers: User[],
  ratioConfigs?: Record<RatioId, RatioConfig>
): AppNotification[] {
  const notifs: AppNotification[] = [];

  const allConseillers = allUsers.filter(
    (u) => u.role === "conseiller" && u.institutionId === user.institutionId
  );

  const lateName: string[] = [];
  for (const c of allConseillers) {
    const cResults = results.filter((r) => r.userId === c.id);
    const latestUpdatedAt = cResults.reduce<string | null>((latest, r) => {
      if (!latest || r.updatedAt > latest) return r.updatedAt;
      return latest;
    }, null);
    if (!latestUpdatedAt || Date.now() - new Date(latestUpdatedAt).getTime() > SEVEN_DAYS_MS) {
      lateName.push(`${c.firstName} ${c.lastName}`);
    }
  }

  if (lateName.length > 0) {
    notifs.push({
      id: "directeur-saisie-retard",
      type: "warning",
      message: `${lateName.length} collaborateur${lateName.length > 1 ? "s" : ""} sans saisie récente`,
      detail: lateName.slice(0, 5).join(", ") + (lateName.length > 5 ? ` et ${lateName.length - 5} autres` : ""),
      link: "/directeur/performance",
    });
  }

  if (ratioConfigs) {
    let totalScore = 0;
    let scoredCount = 0;
    for (const c of allConseillers) {
      const cResults = results.filter((r) => r.userId === c.id);
      const latest = cResults.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
      if (latest) {
        const ratios = computeAllRatios(latest, c.category, ratioConfigs);
        const score = getGlobalScore(ratios);
        totalScore += score.score;
        scoredCount++;
      }
    }
    if (scoredCount > 0) {
      const avgScore = Math.round(totalScore / scoredCount);
      if (avgScore < 60) {
        notifs.push({
          id: "directeur-performance-faible",
          type: "warning",
          message: "Performance globale agence en dessous des objectifs",
          detail: `Score moyen : ${avgScore}% — consultez le pilotage pour identifier les leviers`,
          link: "/directeur/pilotage",
        });
      }
    }
  }

  return notifs;
}
