import { redirect } from 'next/navigation';

// Alerts are an in-context notification drawer, not a standalone page.
// Preserve historic links from lifecycle actions by opening the drawer on the dashboard.
export default function AlertsPage() {
  redirect('/dashboard?notifications=1');
}
