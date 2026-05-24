import LibraryGrid from "@/components/LibraryGrid";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* Bokeh background (uses CSS vars, responds to dark mode) */}
      <div className="bokeh-bg" />

      <main className="pt-16 pb-32 px-6 sm:px-8 max-w-6xl mx-auto font-['DM_Sans']">
        <LibraryGrid />
      </main>
    </div>
  );
}
