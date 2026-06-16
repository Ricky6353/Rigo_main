import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/lib/auth';
import { normalizeEmail, resolveRole } from '@/lib/adminConfig';
import { ensureNextAuthEnv, resolveAuthSecret } from '@/lib/authEnv';

ensureNextAuthEnv();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const supabaseAdmin = getSupabaseAdmin();
          if (!supabaseAdmin) {
            console.error('Supabase admin client not configured — check SUPABASE_SERVICE_ROLE_KEY');
            return null;
          }

          const email = normalizeEmail(credentials.email);

          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

          if (error) {
            console.error('Supabase user lookup error:', error.message);
            throw new Error('AUTH_DB_ERROR');
          }

          if (!user?.password || !verifyPassword(credentials.password, user.password)) {
            return null;
          }

          const role = resolveRole(email, user.role);

          if (role === 'admin' && user.role !== 'admin') {
            await supabaseAdmin
              .from('users')
              .update({ role: 'admin', updated_at: new Date().toISOString() })
              .eq('id', user.id);
          }

          return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role,
          };
        } catch (error) {
          console.error('Credentials Auth Error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || 'user';
        if (user.email) token.email = normalizeEmail(user.email);
      }
      if (token.email) {
        token.email = normalizeEmail(token.email as string);
        token.role = resolveRole(token.email, token.role as string | undefined);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const email = normalizeEmail(
          (session.user.email || (token.email as string) || '') as string
        );
        session.user.email = email || session.user.email;
        session.user.role = resolveRole(email, token.role as string);
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: resolveAuthSecret(),
  debug: process.env.NODE_ENV === 'development',
};
