import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { supabaseNotConfiguredResponse } from '@/lib/supabaseErrors';
import { hashPassword } from '@/lib/auth';
import { persistAndSyncUser } from '@/lib/userPipeline';

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
};

import { normalizeEmail, resolveRole } from '@/lib/adminConfig';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const name = (body.name || '').trim();
    const email = normalizeEmail(body.email || '');
    const password = body.password || '';

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return supabaseNotConfiguredResponse();
    }

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const role = resolveRole(email);
    const hashed = hashPassword(password);
    const createdAt = new Date().toISOString();

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashed,
          role,
          auth_type: 'credentials',
          created_at: createdAt,
          updated_at: createdAt,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const syncResult = await persistAndSyncUser({
      id: newUser.id,
      name,
      email,
      password: hashed,
      role,
      auth_type: 'credentials',
      created_at: createdAt,
      updated_at: createdAt,
    });

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, name, email, role },
      persistedToBucket: syncResult.bucketResult.ok,
      syncedToSheets: syncResult.sheetResult.syncedToSheets,
    });
  } catch (error: unknown) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create user' },
      { status: 500 }
    );
  }
}
