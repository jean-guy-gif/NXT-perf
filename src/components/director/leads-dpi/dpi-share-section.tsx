"use client";

import { useState, useMemo } from "react";
import { Copy, Mail, MessageCircle, Phone, Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DpiShareSectionProps {
  /** ID du Directeur — sert à construire le lien tracké ?ref=. */
  directeurId: string;
}

const SHARE_MESSAGE_TEMPLATE = (url: string) =>
  `Bonjour, je vous propose de découvrir votre potentiel commercial avec ce test offert par NXT (15 min). C'est l'occasion de faire le point sur vos forces et axes de progrès. Cliquez ici : ${url}`;

const EMAIL_SUBJECT = "Test de potentiel commercial — offert par NXT";

export function DpiShareSection({ directeurId }: DpiShareSectionProps) {
  const [copied, setCopied] = useState(false);

  // Construit l'URL tracquée (origin réel côté client uniquement).
  const trackedUrl = useMemo(() => {
    if (typeof window === "undefined") return `/dpi?ref=${directeurId}`;
    return `${window.location.origin}/dpi?ref=${directeurId}`;
  }, [directeurId]);

  const message = useMemo(() => SHARE_MESSAGE_TEMPLATE(trackedUrl), [trackedUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(trackedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencieux
    }
  }

  function handleEmail() {
    const href = `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  }

  function handleSms() {
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Partagez votre lien de test à un futur conseiller
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Chaque candidat qui passe le test via ce lien apparaît dans votre suivi ci-dessous —
        avec ses scores et un guide d&apos;accroche personnalisé pour le recruter.
      </p>

      {/* Lien + Copier */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          readOnly
          value={trackedUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            copied
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Lien copié
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copier le lien
            </>
          )}
        </button>
      </div>

      {/* Boutons partage rapide */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleEmail}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
        <button
          type="button"
          onClick={handleSms}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Phone className="h-4 w-4" />
          SMS
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
      </div>
    </div>
  );
}
