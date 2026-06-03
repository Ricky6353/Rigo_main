import type { NextConfig } from "next";

function cleanEnv(value: string | undefined) {
  if (!value) return "";
  return value.replace(/^["']|["']$/g, "").trim();
}

function resolveSupabaseUrl() {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanEnv(process.env.SUPABASE_URL) ||
    ""
  );
}

function resolveServiceRoleKey() {
  return (
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanEnv(process.env.SUPABASE_SERVICE_KEY) ||
    cleanEnv(process.env.SUPABASE_SECRET_KEY) ||
    ""
  );
}

function resolveAnonKey() {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.SUPABASE_ANON_KEY) ||
    ""
  );
}

// Fail Vercel builds early with a clear message if Supabase env is missing
if (process.env.VERCEL === "1") {
  const missing: string[] = [];
  if (!resolveSupabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!resolveAnonKey()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!resolveServiceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `[Supabase] Missing on Vercel: ${missing.join(", ")}. ` +
        "Add them under Project → Settings → Environment Variables (Production + Preview), then redeploy. " +
        "See .env.example in the repo."
    );
  }
}

const supabaseUrl = resolveSupabaseUrl();
let supabaseHost = "localhost";
try {
  if (supabaseUrl) supabaseHost = new URL(supabaseUrl).hostname;
} catch {
  console.warn("[Supabase] Invalid NEXT_PUBLIC_SUPABASE_URL for image config");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
