import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@/lib/auth';
import { persistAndSyncUser } from '@/lib/userPipeline';
import { normalizeEmail, resolveRole, isAdminEmail } from '@/lib/adminConfig';

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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const email = normalizeEmail(
          (session.user.email || (token.email as string) || '') as string
        );
        session.user.email = email || session.user.email;
        // @ts-expect-error extended session user
        session.user.role = resolveRole(email, token.role as string);
        // @ts-expect-error extended session user
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const supabaseAdmin = getSupabaseAdmin();
        if (!supabaseAdmin) return true;

        const email = normalizeEmail(user.email);

        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id, role')
          .eq('email', email)
          .maybeSingle();

        if (!existingUser) {
          const role = resolveRole(email);
          const createdAt = new Date().toISOString();
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert([
              {
                name: user.name || email.split('@')[0],
                email,
                role,
                image: user.image,
                created_at: createdAt,
                updated_at: createdAt,
              },
            ])
            .select()
            .single();

          if (newUser) {
            await persistAndSyncUser({
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              created_at: createdAt,
              updated_at: createdAt,
              image: user.image,
            });
          }
        } else if (isAdminEmail(email) && existingUser.role !== 'admin') {
          await supabaseAdmin
            .from('users')
            .update({ role: 'admin', updated_at: new Date().toISOString() })
            .eq('id', existingUser.id);
        }

        return true;
      } catch (error) {
        console.error('Error in NextAuth signIn callback:', error);
        return true;
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
