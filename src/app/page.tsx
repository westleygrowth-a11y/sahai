import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { workspace } from "@/lib/workspace";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  return <Workspace initial={JSON.parse(JSON.stringify(await workspace(actor)))}/>;
}
