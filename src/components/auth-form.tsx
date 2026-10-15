"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brand } from "./brand";
export function AuthForm({ setup = false }: { setup?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(setup ? "/api/setup" : "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign("/");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <main className="auth"><div className="auth-box"><Brand /><section className="panel auth-card stack">
    <div className="stack" style={{ gap: 8 }}><h1>{setup ? "Set up your organization" : "Welcome back"}</h1><p className="muted">{setup ? "Create the initial CEO account for SAH AI." : "Sign in to your SAH operations workspace."}</p></div>
    {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
    <form onSubmit={submit} className="stack">
      {setup && <><div className="field"><Label htmlFor="name">CEO name</Label><Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={100}/></div>
        <div className="field"><Label htmlFor="institution">Institution name</Label><Input id="institution" name="institution" required minLength={2} maxLength={150}/></div></>}
      <div className="field"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="username" required placeholder="you@sah.edu.pk" maxLength={254}/></div>
      <div className="field"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={setup ? "new-password" : "current-password"} required minLength={setup ? 12 : 1} maxLength={128}/>{setup && <p className="muted small">Use at least 12 characters.</p>}</div>
      {setup && <div className="field"><Label htmlFor="token">Private setup token</Label><Input id="token" name="token" type="password" autoComplete="off" required/><p className="muted small">Use SETUP_TOKEN from your private local configuration. Setup closes after the first CEO account is created.</p></div>}
      <Button type="submit" disabled={busy}>{busy ? "Please wait…" : setup ? "Create CEO account" : "Sign in"}</Button>
    </form>
    <p className="small muted">{setup ? <Link href="/login">Return to sign in</Link> : <Link href="/setup">Initial CEO setup</Link>}</p>
  </section><p className="small muted">Private institutional workspace · Asia/Karachi</p></div></main>;
}
