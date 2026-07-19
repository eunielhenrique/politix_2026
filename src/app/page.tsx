import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/politix/rpc";

// Roteador raiz: decide para onde mandar o usuário conforme o papel.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const me = await getMe(supabase);

  // Ainda sem campanha/membro → primeiro acesso.
  if (!me || !me.tenant_id) redirect("/onboarding");

  if (me.role === "assessor") redirect("/painel");
  redirect("/app");
}
