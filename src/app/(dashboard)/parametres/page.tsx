"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabaseRatioConfigs } from "@/hooks/use-supabase-ratio-configs";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { RatioId } from "@/types/ratios";
import {
  Settings,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  HeartHandshake,
  Play,
  Mic,
  ChevronRight,
  Users,
  Building2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { resetTourStatus, getTourRole } from "@/lib/guided-tour";

export default function ParametresPage() {
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const { updateThreshold } = useSupabaseRatioConfigs();
  const resetRatioConfigs = useAppStore((s) => s.resetRatioConfigs);
  const [saved, setSaved] = useState(false);

  const user = useAppStore((s) => s.user);
  const coachAssignments = useAppStore((s) => s.coachAssignments);
  const allUsers = useAppStore((s) => s.users);
  const revokeCoachAssignment = useAppStore((s) => s.revokeCoachAssignment);

  const myCoachAssignment = coachAssignments.find(
    (a) =>
      a.status === "ACTIVE" &&
      ((a.targetType === "AGENT" && a.targetId === user?.id) ||
        (a.targetType === "MANAGER" && a.targetId === user?.id) ||
        (a.targetType === "INSTITUTION" && a.targetId === user?.institutionId))
  );
  const myCoach = myCoachAssignment
    ? allUsers.find((u) => u.id === myCoachAssignment.coachId)
    : null;

  const ratioIds = Object.keys(ratioConfigs) as RatioId[];

  const handleSave = () => {
    // In production, this would persist to a backend
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetRatioConfigs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Parametres Performance
            </h1>
            <p className="text-sm text-muted-foreground">
              Modifier les seuils de performance par niveau et vos préférences voix.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" />
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Mon profil card */}
      <Link href="/parametres/profil" className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"><UserIcon className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Mon profil</p>
          <p className="text-xs text-muted-foreground">Photo, logo agence, thème</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Voix & Saisie card */}
      <Link
        href="/parametres/voix"
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Voix & Saisie</p>
          <p className="text-xs text-muted-foreground">Choisis ta voix de guidage et ton mode de saisie préféré</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Équipe card (managers) */}
      {user && (user.mainRole === "manager" || user.availableRoles?.includes("manager")) && (
        <Link href="/parametres/equipe" className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"><Users className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Mon équipe</p>
            <p className="text-xs text-muted-foreground">Code d'invitation, membres, gestion</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Agence card (directeurs) */}
      {user && (user.mainRole === "directeur" || user.availableRoles?.includes("directeur")) && (
        <Link href="/parametres/agence" className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"><Building2 className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Mon agence</p>
            <p className="text-xs text-muted-foreground">Codes, équipes, structure</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Coaching card */}
      <Link href="/parametres/coaching" className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-primary/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"><HeartHandshake className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Coaching</p>
          <p className="text-xs text-muted-foreground">Rattacher ou gérer un coach</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {/* Notifications */}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm font-medium text-green-500">
          <CheckCircle className="h-4 w-4" />
          Paramètres sauvegardés. Les statuts des conseillers ont été recalculés.
        </div>
      )}
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
        <div className="text-sm text-foreground">
          <p className="font-medium">Recalcul automatique</p>
          <p className="mt-0.5 text-muted-foreground">
            Toute modification des seuils recalcule immédiatement les indicateurs
            de performance de tous les conseillers.
          </p>
        </div>
      </div>

      {/* Mon coach */}
      {myCoach && myCoachAssignment && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Mon coach</h3>
          </div>
          <p className="text-sm">
            {myCoach.firstName} {myCoach.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            Depuis le{" "}
            {new Date(myCoachAssignment.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <button
            onClick={() => {
              if (
                confirm(
                  "Voulez-vous vraiment retirer votre coach ? Il perdra immédiatement l'accès à vos données."
                )
              ) {
                revokeCoachAssignment(myCoachAssignment.id);
              }
            }}
            className="mt-3 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
          >
            Retirer le coach
          </button>
        </div>
      )}

      {/* Visite guidée */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Visite guidée</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Revoir la présentation des fonctionnalités de votre espace.
            </p>
          </div>
          <button
            onClick={() => {
              if (!user) return;
              const role = getTourRole(user.availableRoles, user.mainRole);
              resetTourStatus(role);
              window.location.reload();
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Play className="h-3.5 w-3.5" />
            Relancer la visite
          </button>
        </div>
      </div>

      {/* Thresholds Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3.5 text-left text-sm font-semibold text-foreground">
                  Ratio
                </th>
                {(["debutant", "confirme", "expert"] as const).map((level) => (
                  <th
                    key={level}
                    className="px-4 py-3.5 text-center text-sm font-semibold text-foreground"
                  >
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        level === "debutant"
                          ? "bg-gray-500/15 text-gray-500"
                          : level === "confirme"
                            ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                            : "bg-green-500/15 text-green-600 dark:text-green-400"
                      )}
                    >
                      {CATEGORY_LABELS[level]}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground">
                  Unité
                </th>
                <th className="px-4 py-3.5 text-left text-sm font-medium text-muted-foreground">
                  Direction
                </th>
              </tr>
            </thead>
            <tbody>
              {ratioIds.map((ratioId, idx) => {
                const config = ratioConfigs[ratioId];
                return (
                  <tr
                    key={ratioId}
                    className={cn(
                      "border-b border-border last:border-b-0 transition-colors",
                      idx % 2 === 0 ? "" : "bg-muted/20"
                    )}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {config.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </td>
                    {(["debutant", "confirme", "expert"] as const).map(
                      (level) => (
                        <td key={level} className="px-4 py-3 text-center">
                          <input
                            type="number"
                            step={config.isPercentage ? 5 : 0.5}
                            min={0}
                            value={config.thresholds[level]}
                            onChange={(e) =>
                              updateThreshold(
                                ratioId,
                                level,
                                Number(e.target.value)
                              )
                            }
                            className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-center text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      )
                    )}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {config.unit}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          config.isLowerBetter
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-purple-500/10 text-purple-500"
                        )}
                      >
                        {config.isLowerBetter ? "Plus bas = mieux" : "Plus haut = mieux"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
