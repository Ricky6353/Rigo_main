import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { supabaseNotConfiguredResponse } from '@/lib/supabaseErrors';
import { verifyPassword } from '@/lib/auth';

type LoginBody = {
  email?: string;
  password?: string;
};
import { normalizeEmail, resolveRole } from '@/lib/adminConfig';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = normalizeEmail(body.email || '');
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return supabaseNotConfiguredResponse();
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: resolveRole(email, user.role),
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to login' },
      { status: 500 }
    );
  }
}
