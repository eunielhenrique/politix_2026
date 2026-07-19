import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leaderTarget } from "@/lib/politix/rpc";
import LeaderShell from "@/components/app/LeaderShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const t = await leaderTarget(supabase);
  if (!t.me) redirect("/login");
  if (!t.me.tenant_id) redirect("/onboarding");
  // assessor sem nenhum líder ainda → não há o que pré-visualizar
  if (t.me.role === "assessor" && !t.leaderId) redirect("/painel");

  return (
    <LeaderShell leaderName={t.name} isPreview={t.isPreview}>
      {children}
    </LeaderShell>
  );
}
