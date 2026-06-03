import { NextResponse } from 'next/server';
import { getSupabaseSetupHint } from './supabase';

export function supabaseNotConfiguredResponse() {
  const hint = getSupabaseSetupHint();
  return NextResponse.json(
    {
      error: 'Supabase is not configured',
      ...(hint ? { hint } : {}),
    },
    { status: 503 }
  );
}
