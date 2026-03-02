"use client";

import { useState } from "react";
import { Copy, Check, Mail, MessageCircle } from "lucide-react";

interface InviteSharePanelProps {
  code: string;
  label: string;
  description: string;
}

function buildOnboardingLink(code: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/onboarding?join=${encodeURIComponent(code)}`;
}

function buildShareMessage(code: string, link: string): string {
  return [
    "Salut,",
    `Rejoins NXT-Perf avec ce code : ${code}`,
    `Lien : ${link}`,
  ].join("\n");
}

export function InviteSharePanel({ code, label, description }: InviteSharePanelProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const link = buildOnboardingLink(code);
  const message = buildShareMessage(code, link);

  const mailtoUrl = `mailto:?subject=${encodeURIComponent("Invitation NXT-Perf")}&body=${encodeURIComponent(message)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>

      <div className="mt-4 flex items-center gap-3">
        <code className="rounded-lg bg-background px-6 py-3 text-lg font-bold tracking-wider text-primary">
          {code}
        </code>
        <button
          onClick={handleCopyCode}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Copier le code"
        >
          {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-primary/10 pt-4">
        <button
          onClick={handleCopyMessage}
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {copiedMsg ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          {copiedMsg ? "Copié !" : "Copier le message"}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={mailtoUrl}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
      </div>
    </div>
  );
}
