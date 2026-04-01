"use client";

import { MondayGate } from "@/components/saisie/monday-gate";

interface SaisieGateProps {
  gateType: "monday";
  onDismiss: () => void;
  onSaisieDone: () => void;
}

export function SaisieGate({ onDismiss, onSaisieDone }: SaisieGateProps) {
  return (
    <MondayGate
      onDismiss={onDismiss}
      onSaisieDone={onSaisieDone}
    />
  );
}
