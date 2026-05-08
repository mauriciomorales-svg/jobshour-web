/**
 * El correo es único en JobsHour; el nombre puede repetirse.
 * Usamos el email como etiqueta secundaria para desambiguar en UI.
 */
export function chatEmailBadge(email: string | null | undefined): string {
  const e = typeof email === 'string' ? email.trim() : ''
  return e.length > 0 ? e : ''
}
