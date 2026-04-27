"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  extractDepartmentFromPostalCode,
  getPTA607Dematerialisee,
  getPTAByDepartment,
  type PTAOfficiel,
  type PTAType,
} from "@/data/agefice-pta-officiel";
import type { AgeficeDraftPTA } from "@/lib/plan-storage";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";

interface PTASelectorProps {
  codePostalEntreprise: string | undefined;
  value: AgeficeDraftPTA | undefined;
  onChange: (pta: AgeficeDraftPTA | undefined) => void;
}

const INPUT_CLS =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const LABEL_CLS = "mb-1 block text-xs font-medium text-muted-foreground";

const TYPE_BADGE: Record<PTAType, string> = {
  CCI: "bg-blue-500/10 text-blue-500",
  CPME: "bg-emerald-500/10 text-emerald-500",
  UMIH: "bg-purple-500/10 text-purple-500",
  MEDEF: "bg-orange-500/10 text-orange-500",
  UPE: "bg-cyan-500/10 text-cyan-500",
  U2P: "bg-amber-500/10 text-amber-500",
  PTA_607: "bg-primary/10 text-primary",
  AUTRE: "bg-muted text-muted-foreground",
};

function ptaToDraft(p: PTAOfficiel): AgeficeDraftPTA {
  return {
    source: "officiel",
    nom: p.nom,
    adresse: [p.adresse, p.adresseSuite].filter(Boolean).join(" ").trim() || undefined,
    codePostal: p.codePostal,
    ville: p.ville,
    telephone: p.telephone || undefined,
    email: p.email || undefined,
    // numero et interlocuteur volontairement undefined — saisie manuelle optionnelle
  };
}

export function PTASelector({ codePostalEntreprise, value, onChange }: PTASelectorProps) {
  const [manualMode, setManualMode] = useState(value?.source === "manuel");

  const departement = useMemo(() => {
    if (!codePostalEntreprise) return null;
    return extractDepartmentFromPostalCode(codePostalEntreprise);
  }, [codePostalEntreprise]);

  const ptaList = useMemo(() => {
    if (!departement) return [] as PTAOfficiel[];
    const local = getPTAByDepartment(departement);
    const dematerialisee = getPTA607Dematerialisee();
    if (!dematerialisee) return local;
    // Place 607 en tête, sans doublon
    const filtered = local.filter((p) => p.type !== "PTA_607");
    return [dematerialisee, ...filtered];
  }, [departement]);

  // Mode manuel
  if (manualMode) {
    const m = value ?? ({ source: "manuel" } as AgeficeDraftPTA);
    const update = (patch: Partial<AgeficeDraftPTA>) =>
      onChange({ ...m, ...patch, source: "manuel" });

    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Saisie manuelle</p>
          <button
            type="button"
            onClick={() => {
              setManualMode(false);
              onChange(undefined);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Revenir à la liste
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={LABEL_CLS}>Nom du PTA</label>
            <input
              type="text"
              value={m.nom ?? ""}
              onChange={(e) => update({ nom: e.target.value })}
              className={INPUT_CLS}
              placeholder="ex : CCI Hérault"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>N° de PTA</label>
            <input
              type="text"
              value={m.numero ?? ""}
              onChange={(e) => update({ numero: e.target.value })}
              className={INPUT_CLS}
              placeholder="ex : 533"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Interlocuteur</label>
            <input
              type="text"
              value={m.interlocuteur ?? ""}
              onChange={(e) => update({ interlocuteur: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLS}>Adresse</label>
            <input
              type="text"
              value={m.adresse ?? ""}
              onChange={(e) => update({ adresse: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Code postal</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={m.codePostal ?? ""}
              onChange={(e) => update({ codePostal: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Ville</label>
            <input
              type="text"
              value={m.ville ?? ""}
              onChange={(e) => update({ ville: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Téléphone</label>
            <input
              type="tel"
              value={m.telephone ?? ""}
              onChange={(e) => update({ telephone: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Email</label>
            <input
              type="email"
              value={m.email ?? ""}
              onChange={(e) => update({ email: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>
    );
  }

  // Pas de CP renseigné OU CP invalide
  if (!codePostalEntreprise || !departement) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-foreground">
              {!codePostalEntreprise
                ? "Renseignez le code postal de votre entreprise (section précédente) pour voir les Points d'Accueil disponibles."
                : "Code postal invalide ou non couvert par le référentiel AGEFICE (DOM-TOM 97x non listés)."}
            </p>
            <button
              type="button"
              onClick={() => {
                setManualMode(true);
                onChange({ source: "manuel" });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Saisir manuellement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CP valide → afficher la liste
  if (ptaList.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Aucun Point d&apos;Accueil trouvé pour le département {departement}.
        </p>
        <button
          type="button"
          onClick={() => {
            setManualMode(true);
            onChange({ source: "manuel" });
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Saisir manuellement
        </button>
      </div>
    );
  }

  // Mode liste : cards si <= 10, dropdown sinon
  const useDropdown = ptaList.length > 10;
  const selectedNom = value?.source === "officiel" ? value.nom : "";

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {ptaList.length} Point{ptaList.length > 1 ? "s" : ""} d&apos;Accueil disponible
        {ptaList.length > 1 ? "s" : ""} pour le département {departement}.
      </p>

      {useDropdown ? (
        <select
          value={selectedNom}
          onChange={(e) => {
            const found = ptaList.find((p) => p.nom === e.target.value);
            onChange(found ? ptaToDraft(found) : undefined);
          }}
          className={INPUT_CLS}
        >
          <option value="">Sélectionnez un Point d&apos;Accueil…</option>
          {ptaList.map((p) => (
            <option key={`${p.nom}-${p.codePostal}`} value={p.nom}>
              {p.nom} — {p.ville}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          {ptaList.map((p) => {
            const isSelected =
              value?.source === "officiel" &&
              value.nom === p.nom &&
              value.codePostal === p.codePostal;
            const is607 = p.type === "PTA_607";
            return (
              <button
                key={`${p.nom}-${p.codePostal}`}
                type="button"
                onClick={() => onChange(ptaToDraft(p))}
                className={cn(
                  "block w-full rounded-lg border p-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <div className="flex items-start gap-3">
                  {is607 ? (
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.nom}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          TYPE_BADGE[p.type],
                        )}
                      >
                        {is607 ? "Recommandé · 100 % digital" : p.type}
                      </span>
                    </div>
                    {is607 ? (
                      <p className="text-xs text-muted-foreground">
                        Aucun envoi papier. Dossier traité par mail.
                      </p>
                    ) : (
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {p.ville && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{p.codePostal} {p.ville}</span>
                          </div>
                        )}
                        {p.telephone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{p.telephone}</span>
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{p.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Compléments optionnels si PTA officiel sélectionné */}
      {value?.source === "officiel" && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Vous pouvez compléter ces informations si vous les connaissez (optionnel) :
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLS}>N° de PTA</label>
              <input
                type="text"
                placeholder="ex : 533"
                value={value.numero ?? ""}
                onChange={(e) => onChange({ ...value, numero: e.target.value })}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Interlocuteur</label>
              <input
                type="text"
                value={value.interlocuteur ?? ""}
                onChange={(e) => onChange({ ...value, interlocuteur: e.target.value })}
                className={INPUT_CLS}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setManualMode(true);
          onChange({ source: "manuel" });
        }}
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
      >
        Mon Point d&apos;Accueil n&apos;est pas dans la liste
      </button>
    </div>
  );
}
