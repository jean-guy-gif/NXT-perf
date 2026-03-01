import { CATEGORY_LABELS } from "@/lib/constants";
import type { UserCategory } from "@/types/user";

export function buildInviteLink(code: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register?code=${encodeURIComponent(code)}`;
}

export function buildMailtoUrl(
  code: string,
  inviteLink: string,
  category: UserCategory
): string {
  const niveau = CATEGORY_LABELS[category] ?? category;
  const subject = encodeURIComponent("Invitation NXT-Perf (code d'accès)");
  const body = [
    "Bonjour,",
    "",
    `Tu peux créer ton compte NXT-Perf avec ce code : ${code}`,
    `Lien : ${inviteLink}`,
    `Niveau : ${niveau}`,
    "",
    "À tout de suite.",
  ].join("\r\n");

  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export function buildWhatsappUrl(
  code: string,
  inviteLink: string,
  category: UserCategory
): string {
  const niveau = CATEGORY_LABELS[category] ?? category;
  const message = [
    "Salut \u{1F642}",
    `Voici ton accès NXT-Perf : ${code}`,
    `Lien : ${inviteLink}`,
    `Niveau : ${niveau}`,
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildInviteMessage(
  code: string,
  inviteLink: string,
  category: UserCategory
): string {
  const niveau = CATEGORY_LABELS[category] ?? category;
  return [
    "Salut,",
    `Voici ton accès NXT-Perf : ${code}`,
    `Lien : ${inviteLink}`,
    `Niveau : ${niveau}`,
  ].join("\n");
}
