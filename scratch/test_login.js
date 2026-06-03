const { createClient } = require('@supabase/supabase-js');
const { scryptSync, timingSafeEqual } = require('crypto');
require('dotenv').config({ path: '.env.local' });

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return { ok: false, reason: 'invalid format' };
  const hashBuffer = Buffer.from(hash, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (hashBuffer.length !== candidate.length) return { ok: false, reason: 'length mismatch' };
  return { ok: timingSafeEqual(hashBuffer, candidate) };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

(async () => {
  const email = 'embroyitricky@gmail.com';
  const password = 'admin@123';

  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  console.log('lookup error:', error?.message || 'none');
  console.log('user found:', !!user);
  if (user) {
    console.log('password field sample:', user.password?.slice(0, 20) + '...');
    console.log('verify admin@123:', verifyPassword(password, user.password));
  }

  // Test with service key same as app
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonClient = createClient(url, anonKey);
  const { data: anonUser, error: anonErr } = await anonClient.from('users').select('email').eq('email', email).maybeSingle();
  console.log('anon lookup (should fail RLS):', anonErr?.message || (anonUser ? 'unexpected success' : 'no row'));
})();
