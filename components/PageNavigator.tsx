"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, MessageSquare } from "lucide-react";

export default function PageNavigator({
  currentPage,
  totalPages,
  isBookmarked,
  toggleBookmark,
  bookmarks = []
}: {
  currentPage: number;
  totalPages: number;
  isBookmarked?: boolean;
  toggleBookmark?: () => void;
  bookmarks?: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [sliderVal, setSliderVal] = useState(currentPage);
  const [inputVal, setInputVal] = useState(currentPage);
  const isDragging = useRef(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Sync with scroll-tracked currentPage (only when not dragging slider)
  useEffect(() => {
    if (!isDragging.current) {
      setSliderVal(currentPage);
      setInputVal(currentPage);
    }
  }, [currentPage]);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [expanded]);

  const scrollToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const card = document.getElementById(`page-${page}`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDragging.current = true;
    const v = parseInt(e.target.value);
    setSliderVal(v);
    setInputVal(v);
  };

  const handleSliderCommit = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDragging.current = false;
    scrollToPage(parseInt(e.target.value));
  };

  return (
    <div
      ref={navRef}
      id="page-navigator"
      className="fixed bottom-8 left-8 z-[1000] rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300"
      style={{
        background: "var(--card-bg)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border: "1px solid var(--card-border)",
        color: "var(--text-color)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Collapsed pill */}
      {!expanded && (
        <div className="flex items-center">
          <div
            className="px-4 py-2 text-[0.85rem] font-medium cursor-pointer flex items-center justify-center transition-colors rounded-l-[20px]"
            onClick={() => setExpanded(true)}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(128,128,128,0.1)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            Page&nbsp;<span>{currentPage}</span>&nbsp;of&nbsp;<span>{totalPages || "?"}</span>
          </div>
          {toggleBookmark && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
              className={`pr-4 pl-1 transition-all ${isBookmarked ? 'text-rose-500 hover:text-rose-600 hover:scale-110' : 'opacity-60 hover:opacity-100 hover:scale-110'}`}
              style={{ color: isBookmarked ? undefined : "var(--text-color)" }}
            >
              <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="p-4 w-[260px] flex flex-col gap-3">
          <div className="text-[0.85rem] font-medium" style={{ color: "var(--text-color)" }}>
            Jump to page
          </div>

          <input
            type="range"
            min={1}
            max={totalPages || 1}
            value={sliderVal}
            onChange={handleSliderInput}
            onMouseUp={(e) => handleSliderCommit(e as any)}
            onTouchEnd={(e) => handleSliderCommit(e as any)}
            style={{
              width: "100%",
              WebkitAppearance: "none",
              height: "4px",
              background: "var(--muted-color)",
              borderRadius: "2px",
              outline: "none",
              cursor: "pointer",
            }}
          />

          <div className="flex gap-2 items-stretch">
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={inputVal}
              onChange={(e) => setInputVal(parseInt(e.target.value) || 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  scrollToPage(inputVal);
                  setExpanded(false);
                }
              }}
              className="w-[60px] text-center outline-none"
              style={{
                padding: "4px",
                border: "1px solid var(--muted-color)",
                borderRadius: "4px",
                fontFamily: "'DM Sans', sans-serif",
                background: "transparent",
                color: "var(--text-color)",
              }}
            />
            <button
              onClick={() => { scrollToPage(inputVal); setExpanded(false); }}
              style={{
                padding: "2px 10px",
                fontSize: "0.8rem",
                background: "var(--text-color)",
                color: "var(--bg-color)",
                border: "1px solid var(--muted-color)",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Go
            </button>
          </div>

          {bookmarks && bookmarks.length > 0 && (
            <div className="mt-2 pt-3 border-t border-black/5 dark:border-white/10">
              <div className="text-[0.8rem] font-medium mb-2" style={{ color: "var(--text-color)" }}>
                Bookmarks & Notes
              </div>
              <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                {bookmarks.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); scrollToPage(m.pageIndex); setExpanded(false); }}
                    className="text-left p-2 rounded-lg text-[0.75rem] transition-all border border-transparent"
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(128,128,128,0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold" style={{ color: "var(--text-color)" }}>Page {m.pageIndex}</span>
                      {m.isBookmark && <Bookmark size={10} className="text-rose-500" fill="currentColor"/>}
                      {(m.isNote || m.note) && <MessageSquare size={10} className="opacity-60" style={{ color: "var(--text-color)" }}/>}
                    </div>
                    {(m.textNote || m.note) && <div className="text-[0.7rem] opacity-80 italic line-clamp-2" style={{ color: "var(--text-color)" }}>"{m.textNote || m.note}"</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
