/** Admin portal accounts — must exist in Supabase `users` with role `admin`. */
export const ADMIN_EMAILS = [
  'embroyitltdjay@gmail.com',
  'embroyitricky@gmail.com',
] as const;

export type AdminEmail = (typeof ADMIN_EMAILS)[number];

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(normalizeEmail(email) as AdminEmail);
}

export function resolveRole(
  email: string | null | undefined,
  dbRole?: string | null
): 'admin' | 'user' {
  if (dbRole === 'admin' || isAdminEmail(email)) return 'admin';
  return 'user';
}
