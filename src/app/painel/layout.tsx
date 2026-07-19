import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/politix/rpc";
import Sidebar from "@/components/painel/Sidebar";
import PainelHeader from "@/components/painel/PainelHeader";
import PolitixIA from "@/components/painel/PolitixIA";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me || !me.tenant_id) redirect("/onboarding");
  if (me.role !== "assessor") redirect("/app");

  const tenantName = me.tenant_name ?? "Campanha";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-background-100)" }}>
      <Sidebar tenantName={tenantName} electionDate={me.election_date} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <PainelHeader />
        <div style={{ flex: 1, minWidth: 0, padding: "16px 28px 44px" }}>{children}</div>
      </div>
      <PolitixIA />
    </div>
  );
}
