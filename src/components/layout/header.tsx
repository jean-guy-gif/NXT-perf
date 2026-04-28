"use client";

import Image from "next/image";
import { Bell, Plus, Sun, Moon, AlertTriangle, Info, LogOut, Upload, Download, X, Mail, HelpCircle } from "lucide-react";
import { AvatarDisplay } from "@/components/profile/avatar-upload";
import { useAppStore, VIEW_LABELS, rolesToViews, getVisibleViews } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { calculateDynamicProfile } from "@/lib/profile-calculator";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { computeNotifications } from "@/lib/notifications";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_ICONS } from "@/types/notifications";
import type { NotificationType } from "@/types/notifications";
import { resetTourStatus, getTourRole } from "@/lib/guided-tour";
import { useSubscription } from "@/hooks/use-subscription";
import { AddAgentModal } from "@/components/manager/add-agent-modal";
import { ExportModal } from "@/components/export/export-modal";

function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/resultats": "Mon Volume d'Activité",
  "/performance": "Mes Ratios de Transformation",
  "/comparaison": "Ma Comparaison",
  "/formation": "Ma Formation",
  "/manager/dashboard": "Tableau de bord",
  "/manager/equipe": "Mon Volume d'Activité",
  "/manager/comparaison": "Ma Comparaison",
  "/manager/notifications": "Notifications",
  "/parametres": "Paramètres",
  "/manager/formation": "Ma Formation",
  "/manager/formation-collective": "Ma Formation Collective",
  "/directeur/dashboard": "Tableau de bord",
  "/directeur/resultats": "Mon Volume d'Activité",
  "/directeur/performance": "Mes Ratios de Transformation",
  "/directeur/comparaison": "Ma Comparaison",
  "/directeur/formation": "Ma Formation",
  "/directeur/pilotage-financier": "Pilotage Financier",
  "/directeur/leads-dpi": "Leads DPI",
  "/coach/cockpit": "Cockpit Coach",
  "/reseau/dashboard": "Tableau de bord Réseau",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const users = useAppStore((s) => s.users);
  const results = useAppStore((s) => s.results);
  const hiddenViews = useAppStore((s) => s.hiddenViews);
  const toggleViewVisibility = useAppStore((s) => s.toggleViewVisibility);
  const isDemo = useAppStore((s) => s.isDemo);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const orgLogoUrl = useAppStore((s) => s.orgLogoUrl);

  // Logo priority: org logo > personal logo
  const agencyLogoUrl = orgLogoUrl || profile?.agency_logo_url || null;

  const availableViews = useMemo(
    () => rolesToViews(user?.availableRoles ?? []),
    [user?.availableRoles]
  );
  const visibleViews = useMemo(
    () => getVisibleViews(user?.availableRoles ?? [], hiddenViews),
    [user?.availableRoles, hiddenViews]
  );
  const [isDark, setIsDark] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const localNotifs = useMemo(
    () => computeNotifications(user, results, users, ratioConfigs),
    [user, results, users, ratioConfigs]
  );
  const { notifications: dbNotifs, unreadCount: dbUnreadCount, markAsRead, markAllAsRead } = useNotifications();
  const totalBadge = localNotifs.length + dbUnreadCount;
  const { isTrial, trialDaysLeft } = useSubscription();

  // Close dropdown on click outside
  useEffect(() => {
    if (!showNotifs) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifs]);

  const pageTitle = pageTitles[pathname] || "Dashboard";
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const toggleTheme = () => {
    const html = document.documentElement;
    const agencyDark = getComputedStyle(html).getPropertyValue("--agency-dark").trim();

    if (isDark) {
      html.classList.remove("dark");
      // Light mode: remove --background override
      html.style.removeProperty("--background");
    } else {
      html.classList.add("dark");
      // Dark mode: apply --agency-dark as --background if set
      if (agencyDark && agencyDark !== "#1A1A2E") {
        html.style.setProperty("--background", agencyDark);
      }
    }
    setIsDark(!isDark);
  };

  return (
    <header className="relative z-40 flex flex-col border-b border-[var(--agency-primary,#6C5CE7)]/30 bg-card/50 backdrop-blur-sm">
      {/* Trial expiry banner */}
      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 7 && trialDaysLeft > 0 && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 px-3 py-1 text-xs text-amber-600">
          <span>Votre essai gratuit se termine dans {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""}</span>
          <a href="/souscrire" className="font-semibold underline hover:no-underline">Souscrire</a>
        </div>
      )}
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
      <div className="flex items-center gap-4">
        <h1 className="truncate text-lg font-[var(--w-title)] tracking-tight text-agency-primary">{pageTitle}</h1>
        {user && (() => {
          const userResults = results.filter((r) => r.userId === user.id);
          const dynamicLevel = calculateDynamicProfile(userResults, user.category);
          const creationLevel = user.category;
          const evolved = dynamicLevel !== creationLevel;
          const progression = dynamicLevel === "expert" ? 2 : dynamicLevel === "confirme" ? 1 : 0;
          const creation = creationLevel === "expert" ? 2 : creationLevel === "confirme" ? 1 : 0;

          return (
            <div className="flex items-center gap-1.5">
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", CATEGORY_COLORS[dynamicLevel])}>
                {CATEGORY_LABELS[dynamicLevel]}
                {evolved && (progression > creation ? " ↑" : " ↓")}
              </span>
              {evolved && (
                <span className="text-[10px] text-muted-foreground italic">
                  Inscrit en {CATEGORY_LABELS[creationLevel]}
                </span>
              )}
            </div>
          );
        })()}
      </div>

      <div className="flex items-center gap-3">
        {availableViews.length > 1 && (
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5">
            {availableViews.map((view) => {
              const isVisible = visibleViews.includes(view);
              return (
                <button
                  key={view}
                  onClick={() => toggleViewVisibility(view)}
                  title={`${isVisible ? "Masquer" : "Afficher"} la vue ${VIEW_LABELS[view]}`}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-[var(--transition-fast)]",
                    isVisible
                      ? "bg-agency-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                  )}
                >
                  {VIEW_LABELS[view]}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setShowImportModal(true)}
          title="Importer des données"
          className="hidden items-center gap-2 rounded-[var(--radius-button)] border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground sm:flex"
        >
          <Upload className="h-3.5 w-3.5" />
          Importer
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          title="Importer des données"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground sm:hidden"
        >
          <Upload className="h-4 w-4" />
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          title="Exporter les données"
          className="hidden items-center gap-2 rounded-[var(--radius-button)] border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground sm:flex"
        >
          <Download className="h-3.5 w-3.5" />
          Exporter
        </button>
        <button
          onClick={() => setShowExportModal(true)}
          title="Exporter les données"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground sm:hidden"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {(user?.availableRoles?.includes("manager") || user?.availableRoles?.includes("directeur")) && (
          <button
            onClick={() => setShowAddModal(true)}
            title="Ajouter un conseiller"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] bg-gradient-agency text-white shadow-sm transition-all duration-[var(--transition-fast)] hover:brightness-110 hover:-translate-y-px"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Help / replay tour button */}
        <button
          type="button"
          onClick={() => {
            if (user) {
              const tourRole = getTourRole(user.availableRoles, user.mainRole);
              resetTourStatus(tourRole);
              window.location.reload();
            }
          }}
          title="Revoir le tour guidé"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Notifications bell + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs((prev) => !prev)}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] text-muted-foreground transition-all duration-[var(--transition-fast)] hover:bg-muted hover:text-foreground",
              showNotifs && "bg-muted text-foreground"
            )}
          >
            <Bell className="h-4 w-4" />
            {totalBadge > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {totalBadge > 9 ? "9+" : totalBadge}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-2)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  {dbUnreadCount > 0 && (
                    <button type="button" onClick={markAllAsRead} className="text-[10px] text-primary hover:text-primary/80">
                      Tout lire
                    </button>
                  )}
                  {totalBadge > 0 && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      {totalBadge}
                    </span>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <div className="max-h-72 overflow-y-auto">
                {totalBadge === 0 && dbNotifs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Aucune notification
                  </div>
                ) : (
                  <>
                    {/* Supabase notifications (newest first, max 5) */}
                    {dbNotifs.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => { markAsRead(notif.id); setShowNotifs(false); }}
                        className={cn(
                          "flex gap-3 border-b border-border/50 px-4 py-3 last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50",
                          !notif.read && "bg-primary/5"
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0 text-sm">
                          {NOTIFICATION_ICONS[notif.type as NotificationType] ?? "🔔"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm text-foreground", !notif.read && "font-medium")}>
                            {notif.message}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatRelativeDate(notif.created_at)}
                          </p>
                        </div>
                        {!notif.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                    ))}
                    {/* Local computed notifications */}
                    {localNotifs.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.link) { router.push(notif.link); setShowNotifs(false); }
                        }}
                        className={cn(
                          "flex gap-3 border-b border-border/50 px-4 py-3 last:border-b-0",
                          notif.link && "cursor-pointer transition-colors hover:bg-muted/50"
                        )}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {notif.type === "warning" ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Info className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{notif.message}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{notif.detail}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {/* Footer link */}
              <div className="border-t border-border px-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetUrl = pathname.startsWith("/manager") ? "/manager/notifications" : "/notifications";
                    router.push(targetUrl);
                    setShowNotifs(false);
                  }}
                  className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logo agence or avatar — top right */}
        {agencyLogoUrl ? (
          <Image
            src={agencyLogoUrl}
            alt="Logo agence"
            width={120}
            height={36}
            className="object-contain rounded-md dark:mix-blend-screen mix-blend-multiply"
            style={{ maxHeight: 36, width: "auto" }}
          />
        ) : (
          <AvatarDisplay avatarUrl={profile?.avatar_url} initials={initials} size={32} />
        )}
        <button
          onClick={async () => {
            if (!isDemo) {
              const supabase = createClient();
              await supabase.auth.signOut();
            }
            useAppStore.getState().logout();
            window.location.href = "/login";
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Se déconnecter"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      {showAddModal && user && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          managerTeamId={user.teamId}
          managerId={user.id}
        />
      )}
      {showImportModal && (
        <ImportDataModal onClose={() => setShowImportModal(false)} />
      )}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
    </header>
  );
}

function ImportDataModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-2)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Importer vos données existantes dans NXT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vous utilisez déjà un CRM, un logiciel immobilier ou des fichiers de suivi pour piloter votre activité ?
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nous pouvons importer les données chiffrées utiles à votre analyse afin de reconstituer votre historique et consolider vos indicateurs dans NXT.
          </p>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Ce que nous pouvons importer</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Votre chiffre d'affaires historique</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Vos volumes d'activité</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Votre stock de mandats actifs</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Les noms des propriétaires et le type de mandat</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Vos informations de vente</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Vos acheteurs chauds</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />Plus largement, toutes les données chiffrées et structurées utiles au pilotage</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Ce que NXT peut faire après l'import</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />Consolider vos données dans un seul environnement</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />Reconstituer vos historiques de performance</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />Analyser vos progressions</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />Comparer vos résultats dans le temps</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />Générer des analyses et recommandations à partir de vos données réelles</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Un accompagnement simple et sécurisé</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Chaque import est étudié avec notre équipe afin de vérifier la qualité, la structure et la cohérence des données à reprendre.
            </p>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Pour activer l'import de vos données :</p>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-primary">contact@nxt-perf.fr</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-button)] px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Fermer
          </button>
          <a
            href="mailto:contact@nxt-perf.fr?subject=Demande%20d%27import%20de%20donn%C3%A9es%20NXT"
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110"
          >
            <Mail className="h-4 w-4" />
            Nous contacter
          </a>
        </div>
      </div>
    </div>
  );
}
