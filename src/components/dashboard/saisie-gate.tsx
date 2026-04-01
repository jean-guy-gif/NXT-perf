"use client";

import { useRouter } from "next/navigation";
import { MondayGate } from "@/components/saisie/monday-gate";

interface SaisieGateProps {
  gateType: "monday";
  onDismiss: () => void;
}

export function SaisieGate({ onDismiss }: SaisieGateProps) {
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
      onStartManual={() => {
        onDismiss();
        router.push("/saisie?mode=manual");
      }}
    />
  );
}
