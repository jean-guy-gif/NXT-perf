// src/lib/coach-trigger-utils.ts

export function buildCooldownKey(userId: string, triggerType: string, ratioId?: string): string {
  if (ratioId) return `coach_bubble:${userId}:${triggerType}:${ratioId}`
  return `coach_bubble:${userId}:${triggerType}`
}

export function isCooldownActive(key: string): boolean {
  if (typeof localStorage === 'undefined') return false
  const stored = localStorage.getItem(key)
  if (!stored) return false
  return Date.now() < parseInt(stored)
}

export function setCooldown(key: string, durationMs: number): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, String(Date.now() + durationMs))
}

export function shouldTriggerLundi(now: Date = new Date()): boolean {
  const timezone = process.env.APP_TIMEZONE ?? 'Europe/Paris'
  const formatter = new Intl.DateTimeFormat('fr-FR', { timeZone: timezone, weekday: 'long' })
  const dayName = formatter.format(now)
  return dayName === 'lundi'
}
