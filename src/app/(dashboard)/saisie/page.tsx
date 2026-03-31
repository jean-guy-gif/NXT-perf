"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PERIOD_LABELS, FIELD_TOOLTIPS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import { useResults } from "@/hooks/use-results";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { SaisieDrillDownModal } from "@/components/dashboard/saisie-drill-down-modal";
import type { SaisieSection } from "@/lib/formation";
import type { PeriodResults } from "@/types/results";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
  Phone,
  Home,
  Users,
  DollarSign,
  Info,
  HelpCircle,
  Mic,
} from "lucide-react";
import { NxtVoiceAssistant } from "@/components/saisie/nxt-voice-assistant";
import type { ExtractedFields } from "@/lib/saisie-ai-client";

type PeriodType = "day" | "week" | "month";

function getWeekRange(date: Date): { start: Date; end: Date; label: string } {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  const start = new Date(d);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) =>
    `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function SaisiePage() {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const { saveResult } = useSupabaseResults();
  const user = useAppStore((s) => s.user);
  const previousResults = useResults();
  const [selectedSection, setSelectedSection] = useState<SaisieSection | null>(null);

  const weekRange = useMemo(() => getWeekRange(selectedDate), [selectedDate]);

  // Form state - Prospection
  const [contactsEntrants, setContactsEntrants] = useState(0);
  const [contactsTotaux, setContactsTotaux] = useState(0);
  const [rdvEstimation, setRdvEstimation] = useState(0);
  const [infoVenteCount, setInfoVenteCount] = useState(0);
  const [infoVentes, setInfoVentes] = useState<
    Array<{ nom: string; commentaire: string }>
  >([]);

  // Vendeurs
  const [estimationsRealisees, setEstimationsRealisees] = useState(0);
  const [mandatsSignes, setMandatsSignes] = useState(0);
  const [mandats, setMandats] = useState<
    Array<{ nomVendeur: string; type: "simple" | "exclusif" }>
  >([]);
  const [rdvSuivi, setRdvSuivi] = useState(0);
  const [requalification, setRequalification] = useState(0);
  const [baissePrix, setBaissePrix] = useState(0);

  // Acheteurs
  const [acheteursChaudsCount, setAcheteursChaudsCount] = useState(0);
  const [acheteursChauds, setAcheteursChauds] = useState<
    Array<{ nom: string; commentaire: string }>
  >([]);
  const [acheteursSortisVisite, setAcheteursSortisVisite] = useState(0);
  const [nombreVisites, setNombreVisites] = useState(0);
  const [offresRecues, setOffresRecues] = useState(0);
  const [compromisSignes, setCompromisSignes] = useState(0);

  // Ventes
  const [actesSignes, setActesSignes] = useState(0);
  const [chiffreAffaires, setChiffreAffaires] = useState(0);

  const updateInfoVenteCount = (count: number) => {
    setInfoVenteCount(count);
    const current = [...infoVentes];
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push({ nom: "", commentaire: "" });
      }
    }
    setInfoVentes(current.slice(0, count));
  };

  const updateMandatsSignes = (count: number) => {
    setMandatsSignes(count);
    const current = [...mandats];
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push({ nomVendeur: "", type: "simple" });
      }
    }
    setMandats(current.slice(0, count));
  };

  const updateAcheteursChaudsCount = (count: number) => {
    setAcheteursChaudsCount(count);
    const current = [...acheteursChauds];
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push({ nom: "", commentaire: "" });
      }
    }
    setAcheteursChauds(current.slice(0, count));
  };

  const navigatePeriod = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    if (periodType === "day") d.setDate(d.getDate() + direction);
    else if (periodType === "week") d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setSelectedDate(d);
  };

  const getPeriodDates = () => {
    if (periodType === "day") {
      const d = selectedDate.toISOString().split("T")[0];
      return { start: d, end: d };
    }
    if (periodType === "week") {
      return {
        start: weekRange.start.toISOString().split("T")[0],
        end: weekRange.end.toISOString().split("T")[0],
      };
    }
    const start = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );
    const end = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    );
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { start, end } = getPeriodDates();
    const now = new Date();
    const result: PeriodResults = {
      id: `r-${Date.now()}`,
      userId: user.id,
      periodType,
      periodStart: start,
      periodEnd: end,
      prospection: {
        contactsEntrants,
        contactsTotaux,
        rdvEstimation,
        informationsVente: infoVentes.map((iv, i) => ({
          id: `iv-${i}`,
          nom: iv.nom,
          commentaire: iv.commentaire,
          statut: "en_cours" as const,
        })),
      },
      vendeurs: {
        rdvEstimation,
        estimationsRealisees,
        mandatsSignes,
        mandats: mandats.map((m, i) => ({
          id: `m-${i}`,
          nomVendeur: m.nomVendeur,
          type: m.type,
        })),
        rdvSuivi,
        requalificationSimpleExclusif: requalification,
        baissePrix,
      },
      acheteurs: {
        acheteursChauds: acheteursChauds.map((ac, i) => ({
          id: `ac-${i}`,
          nom: ac.nom,
          commentaire: ac.commentaire,
          statut: "en_cours" as const,
        })),
        acheteursSortisVisite,
        nombreVisites,
        offresRecues,
        compromisSignes,
      },
      ventes: {
        actesSignes,
        chiffreAffaires,
        delaiMoyenVente: 0,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const error = await saveResult(result);
    if (error) {
      const errObj = error as Record<string, unknown>;
      const msg = typeof error === "object" ? (String(errObj.message || errObj.details || errObj.hint || JSON.stringify(error))) : String(error);
      console.error("Failed to save:", msg);
      setSaveError("Erreur lors de la sauvegarde : " + msg);
      return;
    }
    setSaveError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleFieldsExtracted = (fields: ExtractedFields) => {
    if (fields.contactsEntrants !== undefined) setContactsEntrants(fields.contactsEntrants);
    if (fields.contactsTotaux !== undefined) setContactsTotaux(fields.contactsTotaux);
    if (fields.rdvEstimation !== undefined) setRdvEstimation(fields.rdvEstimation);
    if (fields.estimationsRealisees !== undefined) setEstimationsRealisees(fields.estimationsRealisees);
    if (fields.mandatsSignes !== undefined) updateMandatsSignes(fields.mandatsSignes);
    if (fields.rdvSuivi !== undefined) setRdvSuivi(fields.rdvSuivi);
    if (fields.requalification !== undefined) setRequalification(fields.requalification);
    if (fields.baissePrix !== undefined) setBaissePrix(fields.baissePrix);
    if (fields.acheteursChaudsCount !== undefined) updateAcheteursChaudsCount(fields.acheteursChaudsCount);
    if (fields.acheteursSortisVisite !== undefined) setAcheteursSortisVisite(fields.acheteursSortisVisite);
    if (fields.nombreVisites !== undefined) setNombreVisites(fields.nombreVisites);
    if (fields.offresRecues !== undefined) setOffresRecues(fields.offresRecues);
    if (fields.compromisSignes !== undefined) setCompromisSignes(fields.compromisSignes);
    if (fields.actesSignes !== undefined) setActesSignes(fields.actesSignes);
    if (fields.chiffreAffaires !== undefined) setChiffreAffaires(fields.chiffreAffaires);
  };

  const periodDisplay = () => {
    if (periodType === "day") {
      return selectedDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (periodType === "week") return `Semaine du ${weekRange.label}`;
    return getMonthLabel(selectedDate);
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-colors";

  const sectionIcons = {
    prospection: Phone,
    vendeurs: Home,
    acheteurs: Users,
    ventes: DollarSign,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Ma Saisie</h1>
          <button
            type="button"
            onClick={() => setShowVoiceAssistant(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">NXT Assistant</span>
            <span className="sm:hidden">🎙️</span>
          </button>
        </div>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500">
            <CheckCircle className="h-4 w-4" />
            Données enregistrées avec succès
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
            {saveError}
          </div>
        )}
      </div>

      {/* Period Selector */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["day", "week", "month"] as PeriodType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  periodType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {PERIOD_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigatePeriod(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="min-w-[180px] text-center capitalize">
                {periodDisplay()}
              </span>
            </div>
            <button
              onClick={() => navigatePeriod(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {periodType === "day" && (
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section Prospection */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div
            className="mb-5 flex cursor-pointer items-center gap-3"
            onClick={() => setSelectedSection("prospection")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
              <Phone className="h-4 w-4 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Prospection
            </h2>
            <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-blue-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Contacts entrants
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.contactsEntrants}
                />
              </label>
              <input
                type="number"
                min={0}
                value={contactsEntrants || ""}
                onChange={(e) => setContactsEntrants(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Contacts totaux
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.contactsTotaux}
                />
              </label>
              <input
                type="number"
                min={0}
                value={contactsTotaux || ""}
                onChange={(e) => setContactsTotaux(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                RDV Estimation
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.rdvEstimation}
                />
              </label>
              <input
                type="number"
                min={0}
                value={rdvEstimation || ""}
                onChange={(e) => setRdvEstimation(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Infos de vente obtenues
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.infosVente}
                />
              </label>
              <input
                type="number"
                min={0}
                value={infoVenteCount || ""}
                onChange={(e) => updateInfoVenteCount(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          {infoVentes.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Détail des informations de vente ({infoVentes.length})
              </p>
              {infoVentes.map((iv, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:grid-cols-2"
                >
                  <input
                    type="text"
                    placeholder={`Nom du contact ${idx + 1}`}
                    value={iv.nom}
                    onChange={(e) => {
                      const updated = [...infoVentes];
                      updated[idx] = { ...updated[idx], nom: e.target.value };
                      setInfoVentes(updated);
                    }}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Commentaire"
                    value={iv.commentaire}
                    onChange={(e) => {
                      const updated = [...infoVentes];
                      updated[idx] = {
                        ...updated[idx],
                        commentaire: e.target.value,
                      };
                      setInfoVentes(updated);
                    }}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section Vendeurs */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div
            className="mb-5 flex cursor-pointer items-center gap-3"
            onClick={() => setSelectedSection("vendeurs")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
              <Home className="h-4 w-4 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Vendeurs</h2>
            <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-green-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Estimations réalisées
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.estimationsRealisees}
                />
              </label>
              <input
                type="number"
                min={0}
                value={estimationsRealisees || ""}
                onChange={(e) =>
                  setEstimationsRealisees(Number(e.target.value))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Mandats signés
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.mandatsSignes}
                />
              </label>
              <input
                type="number"
                min={0}
                value={mandatsSignes || ""}
                onChange={(e) => updateMandatsSignes(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                RDV de suivi
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.rdvSuivi}
                />
              </label>
              <input
                type="number"
                min={0}
                value={rdvSuivi || ""}
                onChange={(e) => setRdvSuivi(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Requalification &rarr; exclusif
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.requalification}
                />
              </label>
              <input
                type="number"
                min={0}
                value={requalification || ""}
                onChange={(e) => setRequalification(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Baisse de prix
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.baissePrix}
                />
              </label>
              <input
                type="number"
                min={0}
                value={baissePrix || ""}
                onChange={(e) => setBaissePrix(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          {mandats.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Détail des mandats ({mandats.length})
              </p>
              {mandats.map((m, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:flex-row sm:items-center"
                >
                  <input
                    type="text"
                    placeholder={`Nom vendeur ${idx + 1}`}
                    value={m.nomVendeur}
                    onChange={(e) => {
                      const updated = [...mandats];
                      updated[idx] = {
                        ...updated[idx],
                        nomVendeur: e.target.value,
                      };
                      setMandats(updated);
                    }}
                    className={cn(inputClass, "flex-1")}
                  />
                  <div className="flex gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`mandat-type-${idx}`}
                        checked={m.type === "simple"}
                        onChange={() => {
                          const updated = [...mandats];
                          updated[idx] = { ...updated[idx], type: "simple" };
                          setMandats(updated);
                        }}
                        className="accent-yellow-500"
                      />
                      <span className="rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        Simple
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`mandat-type-${idx}`}
                        checked={m.type === "exclusif"}
                        onChange={() => {
                          const updated = [...mandats];
                          updated[idx] = { ...updated[idx], type: "exclusif" };
                          setMandats(updated);
                        }}
                        className="accent-green-500"
                      />
                      <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        Exclusif
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section Acheteurs */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div
            className="mb-5 flex cursor-pointer items-center gap-3"
            onClick={() => setSelectedSection("acheteurs")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
              <Users className="h-4 w-4 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Acheteurs
            </h2>
            <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-orange-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Acheteurs chauds
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.acheteursChauds}
                />
              </label>
              <input
                type="number"
                min={0}
                value={acheteursChaudsCount || ""}
                onChange={(e) =>
                  updateAcheteursChaudsCount(Number(e.target.value))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Sortis en visite
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.acheteursSortisVisite}
                />
              </label>
              <input
                type="number"
                min={0}
                value={acheteursSortisVisite || ""}
                onChange={(e) =>
                  setAcheteursSortisVisite(Number(e.target.value))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Nombre de visites
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.nombreVisites}
                />
              </label>
              <input
                type="number"
                min={0}
                value={nombreVisites || ""}
                onChange={(e) => setNombreVisites(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Offres reçues
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.offresRecues}
                />
              </label>
              <input
                type="number"
                min={0}
                value={offresRecues || ""}
                onChange={(e) => setOffresRecues(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Compromis signés
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.compromisSignes}
                />
              </label>
              <input
                type="number"
                min={0}
                value={compromisSignes || ""}
                onChange={(e) => setCompromisSignes(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          {acheteursChauds.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-foreground">
                Détail acheteurs chauds ({acheteursChauds.length})
              </p>
              {acheteursChauds.map((ac, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:grid-cols-2"
                >
                  <input
                    type="text"
                    placeholder={`Nom acheteur ${idx + 1}`}
                    value={ac.nom}
                    onChange={(e) => {
                      const updated = [...acheteursChauds];
                      updated[idx] = { ...updated[idx], nom: e.target.value };
                      setAcheteursChauds(updated);
                    }}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Commentaire"
                    value={ac.commentaire}
                    onChange={(e) => {
                      const updated = [...acheteursChauds];
                      updated[idx] = {
                        ...updated[idx],
                        commentaire: e.target.value,
                      };
                      setAcheteursChauds(updated);
                    }}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section Ventes */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div
            className="mb-5 flex cursor-pointer items-center gap-3"
            onClick={() => setSelectedSection("ventes")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
              <DollarSign className="h-4 w-4 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Ventes</h2>
            <Info className="h-4 w-4 text-muted-foreground transition-colors hover:text-purple-500" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Actes signés
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.actesSignes}
                />
              </label>
              <input
                type="number"
                min={0}
                value={actesSignes || ""}
                onChange={(e) => setActesSignes(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                Chiffre d&apos;affaires (&euro;)
                <HelpCircle
                  className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground/60"
                  data-tooltip-id="field-tooltip"
                  data-tooltip-content={FIELD_TOOLTIPS.chiffreAffaires}
                />
              </label>
              <input
                type="number"
                min={0}
                value={chiffreAffaires || ""}
                onChange={(e) => setChiffreAffaires(Number(e.target.value))}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="flex h-11 items-center gap-2 rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Save className="h-4 w-4" />
          Enregistrer les données
        </button>
      </form>

      {selectedSection && (
        <SaisieDrillDownModal
          section={selectedSection}
          previousResults={previousResults}
          onClose={() => setSelectedSection(null)}
        />
      )}

      <Tooltip
        id="field-tooltip"
        place="top"
        className="!max-w-xs !rounded-lg !bg-popover !px-3 !py-2 !text-xs !text-popover-foreground !shadow-lg !border !border-border"
        opacity={1}
      />

      <NxtVoiceAssistant
        isOpen={showVoiceAssistant}
        onClose={() => setShowVoiceAssistant(false)}
        onFieldsExtracted={handleFieldsExtracted}
      />
    </div>
  );
}
