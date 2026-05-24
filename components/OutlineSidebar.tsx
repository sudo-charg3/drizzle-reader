"use client";

import { useEffect, useRef } from "react";
import { BookOpen, X } from "lucide-react";

export default function OutlineSidebar({
  isOpen,
  setIsOpen,
  outline,
  scrollToPage,
}: {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  outline: any[] | null;
  scrollToPage: (p: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isOpen, setIsOpen]);

  if (!outline || outline.length === 0) return null;

  return (
    <div ref={panelRef} className="fixed top-24 left-6 z-[1000]" style={{ fontFamily: "var(--font-family, 'DM Sans', sans-serif)" }}>

      {/* Slide-in Panel */}
      <div
        className="absolute top-[62px] left-0 w-[280px] max-h-[72vh] overflow-y-auto rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col transition-all duration-250 custom-scrollbar"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          color: "var(--text-color)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.2s ease, transform 0.2s ease",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--card-border)" }}>
          <span className="text-[0.75rem] font-semibold uppercase tracking-widest opacity-50">Contents</span>
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-full opacity-40 hover:opacity-80 transition-opacity"
          >
            <X size={13} />
          </button>
        </div>

        {/* Entries */}
        <div className="py-2">
          {outline.map((item, idx) => {
            const destPage = item.pageIndex || 1;
            const depth: number = item.depth ?? 0;
            const isSubSection = depth > 0;
            const isDeep = depth > 1;

            return (
              <button
                key={idx}
                onClick={() => {
                  scrollToPage(destPage);
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-baseline justify-between gap-2 px-4 py-[5px] hover:bg-black/5 transition-colors group"
                style={{
                  paddingLeft: `${16 + depth * 14}px`,
                  color: "var(--text-color)",
                }}
              >
                <span
                  className="flex-1 leading-snug truncate"
                  style={{
                    fontSize: isDeep ? "0.74rem" : isSubSection ? "0.80rem" : "0.84rem",
                    fontWeight: isSubSection ? 400 : 500,
                    opacity: isDeep ? 0.55 : isSubSection ? 0.72 : 0.92,
                  }}
                >
                  {item.title}
                </span>
                <span
                  className="shrink-0 text-[0.68rem] rounded-md px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "var(--text-color)",
                    color: "var(--bg-color)",
                    opacity: isOpen ? undefined : 0,
                  }}
                >
                  {destPage}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Table of Contents"
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: isOpen ? "var(--text-color)" : "var(--card-bg)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          color: isOpen ? "var(--bg-color)" : "var(--text-color)",
          backdropFilter: "blur(18px)",
        }}
      >
        <BookOpen size={20} />
      </button>
    </div>
  );
}
