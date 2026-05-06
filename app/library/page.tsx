import LibraryGrid from "@/components/LibraryGrid";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
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
        <LibraryGrid />
      </main>
    </div>
  );
}
