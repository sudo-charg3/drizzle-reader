"use client";

import { useState, useEffect } from "react";
import BookCard from "./BookCard";
import UploadModal from "./UploadModal";
import { Plus, Sun, Moon, Bookmark, X, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAllLocalPdfs, getAllPdfSettingsLocal, deleteLocalPdf, updateLocalPdfName } from "@/utils/localStore";

const LIGHT = {
  bg: "#f7f4ef",
  cardBg: "#ffffff",
  text: "#2c2c2c",
  muted: "#888888",
  border: "transparent",
  bokeh1: "rgba(220, 200, 255, 0.35)",
  bokeh2: "rgba(190, 220, 255, 0.30)",
  bokeh3: "rgba(255, 220, 190, 0.28)",
};

const DARK = {
  bg: "#0d1117",
  cardBg: "#161b27",
  text: "#e6e1d6",
  muted: "#8b95a8",
  border: "rgba(255,255,255,0.06)",
  bokeh1: "rgba(99, 102, 241, 0.18)",
  bokeh2: "rgba(139, 92, 246, 0.14)",
  bokeh3: "rgba(59, 130, 246, 0.12)",
};

function applyLibraryTheme(dark: boolean) {
  const t = dark ? DARK : LIGHT;
  const root = document.documentElement;
  root.style.setProperty("--bg-color", t.bg);
  root.style.setProperty("--card-bg", t.cardBg);
  root.style.setProperty("--text-color", t.text);
  root.style.setProperty("--muted-color", t.muted);
  root.style.setProperty("--card-border", t.border);
  root.style.setProperty("--bokeh-1", t.bokeh1);
  root.style.setProperty("--bokeh-2", t.bokeh2);
  root.style.setProperty("--bokeh-3", t.bokeh3);
  root.style.setProperty("--font-family", "'DM Sans', sans-serif");
  root.style.setProperty("--font-size", "1rem");
  root.style.setProperty("--line-height", "1.6");
  document.body.style.backgroundColor = t.bg;
  document.body.style.backgroundImage = "none";
  if (dark) document.body.classList.add("dark-theme");
  else document.body.classList.remove("dark-theme");
  document.body.classList.remove("glass-theme");
}

export default function LibraryGrid() {
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const router = useRouter();

  const loadLocalData = async () => {
    const localPdfs = await getAllLocalPdfs();
    const localSettings = await getAllPdfSettingsLocal();
    
    const settingsMap = localSettings.reduce((acc: any, s: any) => {
      acc[s.pdfId] = s;
      return acc;
    }, {});

    setPdfs(localPdfs.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()));
    setSettings(settingsMap);
  };

  useEffect(() => {
    const stored = localStorage.getItem("library-dark-mode") === "true";
    setIsDark(stored);
    setMounted(true);
    applyLibraryTheme(stored);
    loadLocalData();
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("library-dark-mode", String(next));
    applyLibraryTheme(next);
  };

  const totalBytes = pdfs.reduce((acc, pdf) => acc + (pdf.fileSize || 0), 0);
  const mbSize = (totalBytes / (1024 * 1024)).toFixed(1);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from your library? Your highlights and settings will be lost.`)) return;
    await deleteLocalPdf(id);
    await loadLocalData();
  };

  const handleRename = async (id: string, newName: string) => {
    await updateLocalPdfName(id, newName);
    await loadLocalData();
  };

  const mutedColor = isDark ? "#a0a5b5" : "#888888";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const hoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <>
      <div className="fixed top-0 right-8 h-20 flex items-center gap-3 z-[60]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <button
          onClick={toggleDark}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{ color: "var(--text-color)", border: `1px solid ${borderColor}` }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = hoverBg)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Sun size={16} className={`absolute transition-all duration-300 ${isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 rotate-90'}`} />
            <Moon size={16} className={`absolute transition-all duration-300 ${!isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'}`} />
          </div>
        </button>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-1.5 rounded-full text-sm flex items-center gap-1.5 transition-all duration-200"
          style={{ color: "var(--text-color)", border: `1px solid ${borderColor}` }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = hoverBg)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Plus size={15} /> Add Book
        </button>

        <button
          onClick={() => setIsBookmarksOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{ color: "var(--text-color)", border: `1px solid ${borderColor}` }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = hoverBg)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          title="Bookmarks"
        >
          {mounted && <Bookmark size={16} />}
        </button>
      </div>

      <header className="mb-12">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: mutedColor }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 className="text-4xl font-['Lora'] mb-2" style={{ color: "var(--text-color)" }}>
          My Library
        </h1>
        <p className="text-lg font-light opacity-70" style={{ color: mutedColor }}>
          What would you like to read today?
        </p>
      </header>

      {pdfs.length === 0 ? (
        <div className="text-center mt-20">
          <p className="italic mb-8" style={{ color: mutedColor }}>
            Your library is empty. Add your first book to begin.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full max-w-[280px] h-[373px] mx-auto border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor, color: mutedColor }}
          >
            <Plus size={40} className="mb-4" />
            <span className="font-medium">Add Book</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
          {pdfs.map((pdf, index) => (
            <BookCard
              key={pdf.id}
              pdf={pdf}
              settings={settings[pdf.id]}
              index={index}
              isDark={isDark}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}

          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-[280px] h-[373px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor, color: mutedColor }}
          >
            <Plus size={40} className="mb-4" />
            <span className="font-medium">Add Book</span>
          </button>
        </div>
      )}

      {pdfs.length > 0 && (
        <div className="text-center text-sm mt-20 pb-8" style={{ color: mutedColor }}>
          {pdfs.length} {pdfs.length === 1 ? "book" : "books"} &middot; ~{mbSize} MB stored locally
        </div>
      )}

      {isUploadOpen && (
        <UploadModal
          onClose={() => { setIsUploadOpen(false); loadLocalData(); }}
        />
      )}

      {isBookmarksOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsBookmarksOpen(false)}>
           <div className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ background: "var(--card-bg)", maxHeight: "80vh", border: `1px solid ${borderColor}` }} onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b flex justify-between items-center" style={{ borderColor }}>
               <h2 className="text-base font-semibold" style={{ color: "var(--text-color)" }}>Bookmarks & Notes</h2>
               <button onClick={() => setIsBookmarksOpen(false)} className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-color)" }}><X size={18}/></button>
             </div>
             <div className="p-4 border-b" style={{ borderColor }}>
               <input 
                 type="text" 
                 placeholder="Search books, notes or pages..." 
                 value={bookmarkSearch}
                 onChange={(e) => setBookmarkSearch(e.target.value)}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-transparent transition-colors focus:bg-black/5 dark:focus:bg-white/5"
                 style={{ border: `1px solid ${borderColor}`, color: "var(--text-color)" }}
               />
             </div>
             <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
               {(() => {
                  const allMarks = Object.entries(settings).flatMap(([pdfId, pdfSettings]: any) => {
                    const hls = pdfSettings?.highlights || [];
                    return hls.filter((h:any) => h.isBookmark || h.note || h.textNote).map((h: any) => ({
                       ...h,
                       pdfId,
                       pdfName: pdfs.find(p => p.id === pdfId)?.name || 'Unknown Book'
                    }));
                  });
                  const filtered = allMarks.filter(m => 
                    m.pdfName.toLowerCase().includes(bookmarkSearch.toLowerCase()) || 
                    (m.note && m.note.toLowerCase().includes(bookmarkSearch.toLowerCase())) ||
                    (m.textNote && m.textNote.toLowerCase().includes(bookmarkSearch.toLowerCase())) ||
                    m.pageIndex.toString() === bookmarkSearch
                  ).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

                  if (filtered.length === 0) return <p className="text-center p-8 text-sm opacity-60" style={{ color: "var(--text-color)" }}>No bookmarks or notes found.</p>;

                  return filtered.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => router.push(`/reader/${m.pdfId}?page=${m.pageIndex}`)}
                      className="p-3 mx-2 my-1 rounded-xl cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex flex-col gap-1 border border-transparent hover:border-black/5 dark:hover:border-white/10"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold truncate max-w-[80%]" style={{ color: "var(--text-color)" }}>{m.pdfName}</span>
                        <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-medium" style={{ color: "var(--text-color)" }}>Page {m.pageIndex}</span>
                      </div>
                      {m.isBookmark && (
                        <div className="text-xs opacity-70 flex items-center gap-1.5 font-medium mb-1" style={{ color: "var(--text-color)" }}>
                          <Bookmark key="bookmark-icon" size={12} className="text-rose-500" fill="currentColor"/> Bookmark
                        </div>
                      )}
                      {(m.note || m.textNote) && (
                        <div className="text-xs opacity-90 italic flex flex-col gap-1" style={{ color: "var(--text-color)" }}>
                          <div className="flex items-center gap-1.5 opacity-60 not-italic font-medium">
                            <MessageSquare size={12} /> Note
                          </div>
                          "{m.note || m.textNote}"
                        </div>
                      )}
                    </div>
                  ));
               })()}
             </div>
           </div>
        </div>
      )}
    </>
  );
}
