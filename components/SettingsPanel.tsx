"use client";

import { useEffect, useRef } from "react";
import { minimalThemes, natureThemes } from "@/utils/themes";

export default function SettingsPanel({
  isOpen, setIsOpen,
  themeId, setThemeId,
  fontSize, setFontSize,
  fontFamily, setFontFamily,
  lineSpacing, setLineSpacing,
  clearHighlights,
}: any) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  const fontMap: Record<string, string> = {
    lora: "'Lora', serif",
    "dm-sans": "'DM Sans', sans-serif",
    inter: "'Inter', sans-serif",
    merriweather: "'Merriweather', serif",
    playfair: "'Playfair Display', serif",
  };

  return (
    <div
      id="customization-panel"
      ref={panelRef}
      className="fixed bottom-8 right-8 z-[1000]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Panel Content */}
      <div
        className="absolute bottom-[70px] right-0 w-[320px] max-h-[70vh] overflow-y-auto rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col gap-6"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          color: "var(--text-color)",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          transformOrigin: "bottom right",
        }}
      >
        {/* Typography */}
        <div className="flex flex-col gap-3">
          <div className="text-[0.75rem] uppercase tracking-[0.05em] font-medium" style={{ color: "var(--muted-color)" }}>Typography</div>
          <div className="flex gap-2">
            {[
              { key: "lora", label: "Lora" },
              { key: "dm-sans", label: "DM Sans" },
              { key: "literata", label: "Literata" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFontFamily(key)}
                className="flex-1 px-3 py-2 rounded-lg text-[0.85rem] cursor-pointer transition-all duration-200 border"
                style={{
                  background: fontFamily === key ? "var(--text-color)" : "transparent",
                  color: fontFamily === key ? "var(--bg-color)" : "var(--text-color)",
                  borderColor: "var(--muted-color)",
                  fontFamily: fontMap[key],
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Size */}
        <div className="flex flex-col gap-3">
          <div className="text-[0.75rem] uppercase tracking-[0.05em] font-medium" style={{ color: "var(--muted-color)" }}>Text Size</div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "14px", color: "var(--text-color)" }}>A</span>
            <input
              type="range"
              min={14}
              max={36}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="flex-1"
              style={{
                WebkitAppearance: "none",
                height: "4px",
                background: "var(--muted-color)",
                borderRadius: "2px",
                outline: "none",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "36px", color: "var(--text-color)", lineHeight: 1 }}>A</span>
          </div>
        </div>

        {/* Line Spacing */}
        <div className="flex flex-col gap-3">
          <div className="text-[0.75rem] uppercase tracking-[0.05em] font-medium" style={{ color: "var(--muted-color)" }}>Line Spacing</div>
          <div className="flex gap-2">
            {[
              { val: "1.5", label: "Compact" },
              { val: "1.85", label: "Comfort" },
              { val: "2.2", label: "Relaxed" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setLineSpacing(val)}
                className="flex-1 px-3 py-2 rounded-lg text-[0.85rem] cursor-pointer transition-all duration-200 border"
                style={{
                  background: lineSpacing === val ? "var(--text-color)" : "transparent",
                  color: lineSpacing === val ? "var(--bg-color)" : "var(--text-color)",
                  borderColor: "var(--muted-color)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nature Themes */}
        <div className="flex flex-col gap-3">
          <div className="text-[0.75rem] uppercase tracking-[0.05em] font-medium" style={{ color: "var(--muted-color)" }}>Nature Themes</div>
          <div className="grid grid-cols-2 gap-1">
            {natureThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className="flex items-center gap-2 px-1 py-1 rounded-lg text-left transition-all duration-200 text-[0.8rem]"
                style={{
                  background: themeId === t.id ? "rgba(128,128,128,0.2)" : "transparent",
                  color: "var(--text-color)",
                  fontWeight: themeId === t.id ? 500 : 400,
                }}
                onMouseEnter={(e) => { if (themeId !== t.id) (e.currentTarget as HTMLElement).style.background = "rgba(128,128,128,0.1)"; }}
                onMouseLeave={(e) => { if (themeId !== t.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div
                  className="w-8 h-8 rounded-md flex-shrink-0"
                  style={{
                    backgroundColor: t.bgColor,
                    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(t.pattern)}")`,
                    backgroundSize: "280%",
                    backgroundPosition: "center",
                    border: "1px solid rgba(128,128,128,0.2)",
                  }}
                />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Minimal Themes */}
        <div className="flex flex-col gap-3">
          <div className="text-[0.75rem] uppercase tracking-[0.05em] font-medium" style={{ color: "var(--muted-color)" }}>Minimal Themes</div>
          <div className="grid grid-cols-2 gap-1">
            {minimalThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className="flex items-center gap-2 px-1 py-1 rounded-lg text-left transition-all duration-200 text-[0.8rem]"
                style={{
                  background: themeId === t.id ? "rgba(128,128,128,0.2)" : "transparent",
                  color: "var(--text-color)",
                  fontWeight: themeId === t.id ? 500 : 400,
                }}
                onMouseEnter={(e) => { if (themeId !== t.id) (e.currentTarget as HTMLElement).style.background = "rgba(128,128,128,0.1)"; }}
                onMouseLeave={(e) => { if (themeId !== t.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div
                  className="w-8 h-8 rounded-md flex-shrink-0"
                  style={{
                    backgroundColor: t.bgColor,
                    border: "1px solid rgba(128,128,128,0.2)",
                  }}
                />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Clear Highlights */}
        <div>
          <button
            onClick={() => { clearHighlights(); setIsOpen(false); }}
            className="text-[0.8rem] underline block w-full text-right"
            style={{ color: "var(--muted-color)", background: "none", border: "none", cursor: "pointer" }}
          >
            Clear all highlights
          </button>
        </div>
      </div>

      {/* FAB Button */}
      <button
        id="fab-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          color: "var(--text-color)",
          backdropFilter: "blur(18px)",
        }}
      >
        <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor">
          <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
        </svg>
      </button>
    </div>
  );
}
