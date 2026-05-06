import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LibraryGrid from "@/components/LibraryGrid";

// Always fetch fresh data — never serve cached page counts or progress
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: pdfs } = await supabase
    .from("pdfs")
    .select("*")
    .order("last_opened_at", { ascending: false });

  const { data: settings } = await supabase.from("pdf_settings").select("*");

  const settingsMap = (settings || []).reduce((acc: any, s: any) => {
    acc[s.pdf_id] = s;
    return acc;
  }, {});

  const firstName = user.email ? user.email.split("@")[0] : "Reader";

  return (
    <div className="min-h-screen">
      {/* Bokeh background (uses CSS vars, responds to dark mode) */}
      <div className="bokeh-bg" />

      {/* Top Nav */}
      <nav
        className="fixed top-0 left-0 right-0 h-20 z-50 flex items-center px-8"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(128,128,128,0.08)",
        }}
      >
        <div
          className="font-['Lora'] text-lg tracking-widest"
          style={{ color: "var(--text-color)" }}
        >
          Drizzle Reader
        </div>
      </nav>

      <main className="pt-28 pb-24 px-8 max-w-6xl mx-auto font-['DM_Sans']">
        <LibraryGrid
          initialPdfs={pdfs || []}
          initialSettings={settingsMap}
          userId={user.id}
          firstName={firstName}
        />
      </main>
    </div>
  );
}
