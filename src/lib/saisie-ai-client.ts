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
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const frVoices = voices.filter(v => v.lang.startsWith("fr"));

  const preferred = frVoices.find(v =>
    v.name.includes("Neural") ||
    v.name.includes("Google") ||
    v.name.includes("Amélie") ||
    v.name.includes("Microsoft Hortense") ||
    v.name.includes("Microsoft Julie")
  ) || frVoices[0];

  if (preferred) utterance.voice = preferred;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
