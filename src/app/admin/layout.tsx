import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  const ADMIN_EMAILS = ['embroyitltdjay@gmail.com', 'embroyitricky@gmail.com'];

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    notFound();
  }

  return <>{children}</>;
}
