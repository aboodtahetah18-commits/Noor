import { redirect } from 'next/navigation';

/** The Rakaez finance interface is the sole public landing experience. */
export default function HomePage() {
  redirect('/rakaez');
}
