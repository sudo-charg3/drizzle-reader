"use client";

import { useState } from "react";
import { Trash2, Edit2, Bookmark, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

const COVER_COLORS = [
  "#C48A8A", "#9EACA0", "#8B9DB4", "#CBA471",
  "#C47A60", "#A293A6", "#668364", "#A6A49F",
];

interface BookCardProps {
  pdf: any;
  settings: any;
  index: number;
  isDark: boolean;
  onDelete: (id: string, name: string) => void;
  onRename: (id: string, newName: string) => void;
}

export default function BookCard({
  pdf,
  settings,
  index,
  isDark,
  onDelete,
  onRename,
}: BookCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(pdf.name);

  const coverColor = COVER_COLORS[index % COVER_COLORS.length];
  const dateStr = new Date(
    pdf.lastOpenedAt || pdf.createdAt
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const total = settings?.totalPages || pdf.pageCount || 0;
  const read = settings?.currentPage || 1;
  const pct = total > 0 ? Math.min(100, Math.round((read / total) * 100)) : 0;
  
  const bookmarks = (settings?.highlights || [])
    .filter((h:any) => h.isBookmark || h.isNote || h.textNote || h.note)
    .sort((a:any, b:any) => a.pageIndex - b.pageIndex);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;
    router.push(`/reader/${pdf.id}`);
  };

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== pdf.name) {
      onRename(pdf.id, editName.trim());
    } else {
      setEditName(pdf.name);
    }
    setIsEditing(false);
  };

  // Theme-aware colors
  const cardBg = isDark ? "#161b27" : "#ffffff";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent";
  const titleColor = isDark ? "#e6e1d6" : "#2c2c2c";
  const metaColor = isDark ? "#8b95a8" : "#888888";
  const inputBorderColor = isDark ? "rgba(255,255,255,0.15)" : "#d1d5db";
  const progressBgColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const editBtnHover = isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6";
  const deleteBtnHover = isDark ? "rgba(239,68,68,0.1)" : "#fef2f2";

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-[280px] h-[373px] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-1.5"
      style={{
        background: cardBg,
        border: cardBorder,
        boxShadow: isDark
          ? "0 8px 24px rgba(0,0,0,0.3)"
          : "0 8px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="h-[60%] relative flex items-center justify-center p-8 text-center"
        style={{ backgroundColor: coverColor }}
      >
        <h3 className="text-white font-['Lora'] text-xl z-10 line-clamp-4 drop-shadow-sm">
          {pdf.name}
        </h3>
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
        
        {bookmarks.length > 0 && isHovered && (
          <div className="absolute inset-0 bg-black/80 z-20 flex flex-col p-4 animate-in fade-in duration-200 text-left">
             <div className="flex items-center gap-1.5 text-white/90 text-[0.65rem] font-semibold uppercase tracking-wider mb-3">
                <Bookmark size={10} fill="currentColor" /> Bookmarks & Notes ({bookmarks.length})
             </div>
             <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
               {bookmarks.map((bm:any) => (
                 <button 
                   key={bm.id} 
                   onClick={(e) => { e.stopPropagation(); router.push(`/reader/${pdf.id}?page=${bm.pageIndex}`); }}
                   className="text-left text-xs text-white/80 hover:text-white hover:bg-white/10 px-2 py-2 rounded transition-colors border border-white/5 font-sans"
                 >
                   <div className="flex items-center gap-1.5 mb-1">
                     <span className="font-semibold">Page {bm.pageIndex}</span>
                     {bm.isBookmark && <Bookmark size={10} className="text-rose-400" fill="currentColor"/>}
                     {(bm.isNote || bm.note || bm.textNote) && <MessageSquare size={10} className="opacity-60"/>}
                   </div>
                   {(bm.textNote || bm.note) && (
                     <div className="text-[0.65rem] opacity-75 italic line-clamp-2">
                       "{bm.textNote || bm.note}"
                     </div>
                   )}
                 </button>
               ))}
             </div>
          </div>
        )}
      </div>

      <div
        className="h-[40%] p-4 flex flex-col justify-between"
        style={{ background: cardBg }}
      >
        <div>
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              className="w-full text-sm font-semibold border-b focus:outline-none bg-transparent"
              style={{ borderColor: inputBorderColor, color: titleColor }}
            />
          ) : (
            <h4
              className="text-[0.85rem] font-semibold truncate"
              style={{ color: titleColor }}
            >
              {pdf.name}
            </h4>
          )}
          <p className="text-[0.75rem] mt-1" style={{ color: metaColor }}>
            Opened {dateStr}
          </p>
        </div>

        <div className="mt-2">
          {total === 0 ? (
            <div className="text-[0.72rem] italic" style={{ color: metaColor }}>
              Not started
            </div>
          ) : read >= total ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[0.72rem]" style={{ color: metaColor }}>
                Finished
              </span>
            </div>
          ) : (
            <div>
              <div
                className="w-full h-1 rounded-full overflow-hidden mb-1"
                style={{ background: progressBgColor }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: coverColor }}
                />
              </div>
              <div className="text-[0.72rem]" style={{ color: metaColor, opacity: 0.8 }}>
                {read} of {total} pages &middot; {pct}%
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`absolute bottom-3 right-3 flex gap-1 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: metaColor }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = editBtnHover)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(pdf.id, pdf.name);
          }}
          className="p-1.5 rounded-md transition-colors text-red-400"
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = deleteBtnHover)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
