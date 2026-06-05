import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { resolveRole } from "@/lib/adminConfig";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = 'force-dynamic';

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
  const role = session?.user?.role;

  if (!session?.user?.email || resolveRole(session.user.email, role) !== 'admin') {
    redirect('/login?callbackUrl=/admin');
  }

  return <>{children}</>;
}
