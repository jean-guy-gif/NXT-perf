"use client";

import { useRouter } from "next/navigation";
import { MondayGate } from "@/components/saisie/monday-gate";

interface SaisieGateProps {
  gateType: "monday";
  onDismiss: () => void;
  onSaisieDone: () => void;
}

export function SaisieGate({ onDismiss, onSaisieDone }: SaisieGateProps) {
  const router = useRouter();

  return (
    <MondayGate
      onDismiss={onDismiss}
      onStartVoice={() => {
        onDismiss();
        router.push("/saisie?mode=voice");
      }}
      onStartImport={() => {
        onDismiss();
        router.push("/saisie?mode=import");
      }}
      onSaisieDone={onSaisieDone}
    />
  );
}
