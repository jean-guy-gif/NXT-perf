export interface ExtractedFields {
  contactsEntrants?: number;
  contactsTotaux?: number;
  rdvEstimation?: number;
  estimationsRealisees?: number;
  mandatsSignes?: number;
  rdvSuivi?: number;
  requalification?: number;
  baissePrix?: number;
  acheteursChaudsCount?: number;
  acheteursSortisVisite?: number;
  nombreVisites?: number;
  offresRecues?: number;
  compromisSignes?: number;
  actesSignes?: number;
  chiffreAffaires?: number;
}

export async function extractFromText(
  text: string,
  currentFields: Partial<ExtractedFields>
): Promise<{ extracted: ExtractedFields; followUpQuestion: string; missingImportant: string[]; confidence: number }> {
  const res = await fetch("/api/saisie-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "extract", text, currentFields }),
  });
  return res.json();
}

export async function extractFromImage(
  imageBase64: string,
  imageMediaType: string
): Promise<{ extracted: ExtractedFields; description: string; confidence: number }> {
  const res = await fetch("/api/saisie-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "extract_image", imageBase64, imageMediaType }),
  });
  return res.json();
}

export async function getGreeting(isMandatory: boolean): Promise<string> {
  const res = await fetch("/api/saisie-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "greet", currentFields: { isMandatory } }),
  });
  const data = await res.json();
  return data.message;
}

// Synthèse vocale — sélectionne la meilleure voix française disponible
export function speak(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const frVoices = voices.filter(v =>
      v.lang === "fr-FR" || v.lang === "fr" || v.lang.startsWith("fr-")
    );

    // Ordre de préférence strict — du plus naturel au moins naturel
    const PREFERRED = [
      "Google français",
      "Google French",
      "fr-FR-Neural2-C",
      "fr-FR-Neural2-A",
      "Amélie",
      "Thomas",
      "Microsoft Paul Online (Natural)",
      "Microsoft Hortense Online (Natural)",
      "fr-FR-DeniseNeural",
      "fr-FR-HenriNeural",
      "Microsoft Julie Online",
      "Microsoft Hortense",
    ];

    let selected: SpeechSynthesisVoice | undefined;
    for (const name of PREFERRED) {
      selected = frVoices.find(v => v.name === name || v.name.includes(name));
      if (selected) break;
    }

    // Fallback : première voix FR disponible
    if (!selected) selected = frVoices[0];
    // Fallback final : n'importe quelle voix
    if (!selected && voices.length > 0) selected = voices[0];

    if (selected) utterance.voice = selected;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
  };

  // Les voix peuvent ne pas être chargées immédiatement
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
    // Timeout de sécurité si onvoiceschanged ne se déclenche pas
    setTimeout(doSpeak, 500);
  }
}

export async function extractFromDocument(
  textContent: string,
  fileName: string
): Promise<{ extracted: ExtractedFields; description: string; confidence: number }> {
  const res = await fetch("/api/saisie-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "extract_document", textContent, fileName }),
  });
  return res.json();
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
