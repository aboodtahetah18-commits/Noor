import { redirect } from 'next/navigation';

export default function LegacyOnboardingCatchAll() {
  redirect('/conversations');
}
