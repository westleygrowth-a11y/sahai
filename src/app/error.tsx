"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="auth"><div className="auth-box panel auth-card stack"><h1>Workspace unavailable</h1><p>Check that PostgreSQL is running and migrations have been applied, then try again.</p><button onClick={reset}>Try again</button></div></main>;
}
