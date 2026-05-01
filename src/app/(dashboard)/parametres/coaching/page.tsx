"use client";

import Link from "next/link";
import { Users, ArrowLeft } from "lucide-react";

export default function CoachingPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Mon Coach NXT</h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground leading-relaxed">
        Le pool de coachs NXT est en cours de constitution. Cette fonctionnalité sera bientôt disponible.
      </p>
      <Link
        href="/parametres"
        className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux paramètres
      </Link>
    </div>
  );
}
