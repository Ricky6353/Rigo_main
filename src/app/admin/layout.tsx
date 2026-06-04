import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { resolveRole } from "@/lib/adminConfig";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: 'Admin',
  description: 'Embroyit admin portal',
  path: '/admin',
  noIndex: true,
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  // @ts-expect-error role from NextAuth JWT
  const role = session?.user?.role as string | undefined;

  if (!session?.user?.email || resolveRole(session.user.email, role) !== 'admin') {
    redirect('/login?callbackUrl=/admin');
  }

  return <>{children}</>;
}
