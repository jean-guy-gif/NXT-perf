const MAX_RETRIES = 10;

function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/**
 * Generate a unique AG-XXXX institution code.
 * In demo mode, checks against existing codes in the provided set.
 */
export function generateInstitutionCode(existingCodes: Set<string> = new Set()): string {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = `AG-${randomDigits(4)}`;
    if (!existingCodes.has(code)) return code;
  }
  // Fallback with extra digits to avoid collision
  return `AG-${randomDigits(6)}`;
}

/**
 * Generate a unique MG-XXXX team code.
 * In demo mode, checks against existing codes in the provided set.
 */
export function generateTeamCode(existingCodes: Set<string> = new Set()): string {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = `MG-${randomDigits(4)}`;
    if (!existingCodes.has(code)) return code;
  }
  return `MG-${randomDigits(6)}`;
}

/** Check if a string looks like an institution code */
export function isInstitutionCode(code: string): boolean {
  return /^AG-\d{4,}$/.test(code.trim());
}

/** Check if a string looks like a team code */
export function isTeamCode(code: string): boolean {
  return /^MG-\d{4,}$/.test(code.trim());
}
