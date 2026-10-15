import Link from "next/link";
import { db } from "@/lib/db";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
export const dynamic = "force-dynamic";
export default async function SetupPage() {
  if (await db.bootstrap.findUnique({ where: { id: "initial-ceo" } })) return <main className="auth"><div className="auth-box"><Brand/><section className="panel auth-card stack"><h1>Workspace initialized</h1><p className="muted">The initial CEO account has already been created. Contact your CEO for an employee account.</p><Link href="/login">Continue to sign in →</Link></section></div></main>;
  return <AuthForm setup/>;
}
