"use client";

import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

export default function StubPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Construction className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold">Page en cours de construction</h1>
      <p className="text-sm text-muted-foreground mt-2">
        À venir Phase 2 de la refonte réseau v2.0
      </p>
      <Link
        href="/reseau/dashboard"
        className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Link>
    </div>
  );
}
