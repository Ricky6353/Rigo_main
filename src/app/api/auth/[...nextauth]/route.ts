import NextAuth, { NextAuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { getMongoClient } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/auth";

const ADMIN_EMAIL = 'jayembroyit@gmail.com';

export const authOptions: NextAuthOptions = {
  providers: [
/*
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "",
      clientSecret: process.env.APPLE_TEAM_ID || "",
    }),
    */
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          const client = await getMongoClient();
          const dbName = process.env.MONGODB_DB;
          if (!client || !dbName) return null;

          const users = client.db(dbName).collection('users');
          const email = credentials.email.toLowerCase();
          
          const user = await users.findOne<{ _id: any; name: string; email: string; password?: string; role?: string }>({ email });
          
          if (!user || !user.password || !verifyPassword(credentials.password, user.password)) {
            return null;
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
          };
        } catch (error) {
          console.error("Credentials Auth Error:", error);
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        const client = await getMongoClient();
        const dbName = process.env.MONGODB_DB;
        if (!client || !dbName) return true;

        const users = client.db(dbName).collection('users');
        const email = user.email.toLowerCase();
        
        const existingUser = await users.findOne({ email });

        if (!existingUser) {
          // Sync with the same schema as manual signup
          await users.insertOne({
            name: user.name || email.split('@')[0],
            email: email,
            role: email === ADMIN_EMAIL ? 'admin' : 'user',
            image: user.image,
            authType: account?.provider,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        return true;
      } catch (error) {
        console.error("Error in NextAuth signIn callback:", error);
        return true; // Allow login even if DB sync fails
      }
    },
    async session({ session }) {
      if (session.user) {
        // @ts-ignore
        session.user.role = session.user.email === ADMIN_EMAIL ? 'admin' : 'user';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
