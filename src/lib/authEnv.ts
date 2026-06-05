/** Auto-configure NextAuth so NEXTAUTH_URL / NEXTAUTH_SECRET are not required in .env. */

function clean(value: string | undefined) {
  if (!value) return '';
  return value.replace(/^["']|["']$/g, '').replace(/\s+/g, '').trim();
}

export function resolveSiteUrl() {
  const fromPublic = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromPublic) return fromPublic.replace(/\/$/, '');

  const vercelHost = clean(process.env.VERCEL_URL);
  if (vercelHost) return `https://${vercelHost}`;

  return 'http://localhost:3000';
}

/** JWT signing secret — reuses the Supabase service key already on the server. */
export function resolveAuthSecret() {
  return (
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    clean(process.env.SUPABASE_SERVICE_KEY) ||
    clean(process.env.SUPABASE_SECRET_KEY) ||
    'embroyit-local-dev-only'
  );
}

/** Call once before NextAuth / getServerSession (sets process.env for NextAuth internals). */
export function ensureNextAuthEnv() {
  if (!clean(process.env.NEXTAUTH_URL)) {
    process.env.NEXTAUTH_URL = resolveSiteUrl();
  }
  if (!clean(process.env.NEXTAUTH_SECRET)) {
    process.env.NEXTAUTH_SECRET = resolveAuthSecret();
  }
}
