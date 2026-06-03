import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { resolveRole } from '@/lib/adminConfig';

/**
 * Admin-only: applies catalog_migration.sql when SUPABASE_DB_PASSWORD is set.
 * POST /api/setup/apply-catalog-schema
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error role from session
    if (!session?.user?.email || resolveRole(session.user.email, session.user.role) !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const password = process.env.SUPABASE_DB_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!password || !supabaseUrl) {
      return NextResponse.json(
        {
          error: 'Add SUPABASE_DB_PASSWORD to .env.local (Supabase → Project Settings → Database), then retry.',
        },
        { status: 400 }
      );
    }

    const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) {
      return NextResponse.json({ error: 'Invalid NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
    }

    const { Client } = await import('pg');
    const sqlPath = path.join(process.cwd(), 'supabase', 'catalog_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const connectionStrings = [
      `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
      `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    ];

    let lastError: Error | null = null;
    for (const connectionString of connectionStrings) {
      const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 12000,
      });
      try {
        await client.connect();
        await client.query(sql);
        await client.end();
        return NextResponse.json({ success: true, message: 'Catalog schema applied.' });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        try {
          await client.end();
        } catch {
          /* ignore */
        }
      }
    }

    return NextResponse.json(
      { error: lastError?.message || 'Could not connect to Supabase Postgres' },
      { status: 500 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Setup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
