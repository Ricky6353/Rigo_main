import { redirect } from 'next/navigation';

/** Alias for Command Center → /admin */
export default function CommandCenterPage() {
  redirect('/admin');
}
