import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>تعذر إكمال تسجيل الدخول</h1>
        <p>لم يتم إنشاء جلسة دخول. أعد المحاولة من صفحة تسجيل الدخول.</p>
        <Link className="button-link" href="/login">العودة لتسجيل الدخول</Link>
      </section>
    </main>
  );
}
