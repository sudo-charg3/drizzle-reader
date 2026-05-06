"use client";

import { useEffect, useState } from "react";
import { Trash2, MessageSquare, X, Edit3 } from "lucide-react";

const COLORS = [
  { id: 'yellow', hex: '#fff3a3' },
  { id: 'rose', hex: '#ffc8d4' },
  { id: 'mint', hex: '#b8f0d0' },
  { id: 'sky', hex: '#c9d9ff' },
  { id: 'peach', hex: '#ffd9b3' }
];

export default function HighlightPopover({ containerRef, saveSettings, highlights, setHighlights }: any) {
  const [position, setPosition] = useState<{ top: number, left: number, transform?: string, isNoteView?: boolean } | null>(null);
  const [activeMarkId, setActiveMarkId] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pendingRange, setPendingRange] = useState<Range | null>(null);

  const getNotePosition = (rect: DOMRect) => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      return { top: rect.bottom + 10, left: window.innerWidth / 2, transform: 'translateX(-50%)', isNoteView: true };
    }
    const leftPos = Math.min(window.innerWidth / 2 + 420, window.innerWidth - 300);
    return { top: Math.max(20, rect.top - 20), left: leftPos, transform: 'none', isNoteView: true };
  };

  // Close everything when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#hl-popover') && target.tagName !== 'MARK') {
        setPosition(null);
        setActiveMarkId(null);
        setIsAddingNote(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Handle Mark Clicks
  useEffect(() => {
    const handleMarkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'MARK') {
        e.preventDefault();
        e.stopPropagation();
        const id = target.dataset.hlId;
        if (id) {
          const rect = target.getBoundingClientRect();
          const hl = highlights.find((h: any) => h.id === id);
          if (hl) {
            setTimeout(() => {
              setActiveMarkId(id);
              setIsAddingNote(false);
              setNoteText(hl.textNote || hl.note || "");
              if (hl.isNote || hl.note) {
                setPosition(getNotePosition(rect));
              } else {
                setPosition({ top: rect.top - 54, left: rect.left + rect.width / 2, isNoteView: false });
              }
            }, 100);
          }
        }
      }
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleMarkClick);
      return () => container.removeEventListener('click', handleMarkClick);
    }
  }, [highlights, containerRef]);

  // Dynamic Highlighting of Active Note
  useEffect(() => {
    const pdfContainer = containerRef.current;
    if (!pdfContainer) return;

    pdfContainer.querySelectorAll('mark').forEach((mark: HTMLElement) => {
      const hl = highlights.find((h: any) => h.id === mark.dataset.hlId);
      if (!hl) return;
      if (hl.isNote || hl.note) {
        if (mark.dataset.hlId === activeMarkId) {
          mark.style.backgroundColor = 'rgba(251, 191, 36, 0.25)'; 
          mark.style.borderBottom = '2px solid #fbbf24';
          mark.style.setProperty('color', 'inherit', 'important');
        } else {
          mark.style.backgroundColor = 'transparent';
          mark.style.borderBottom = '2px dashed #8b95a8';
          mark.style.setProperty('color', 'inherit', 'important');
        }
      }
    });
  }, [activeMarkId, highlights, containerRef]);

  // Text Selection
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleSelection = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (activeMarkId || isAddingNote) return;
        
        const sel = window.getSelection();
        
        if (sel?.anchorNode?.parentElement?.closest('mark')) return;

        if (!sel || sel.rangeCount === 0 || sel.isCollapsed || sel.toString().trim() === '') {
          setPosition(null);
          setPendingRange(null);
          return;
        }

        const range = sel.getRangeAt(0);
        if (!containerRef.current?.contains(range.commonAncestorContainer)) {
          setPosition(null);
          setPendingRange(null);
          return;
        }
        
        const nodes = getTextNodesInRange(range);
        const isOverlapping = nodes.some(({node}) => node.parentElement?.closest('mark'));
        if (isOverlapping) {
          sel.removeAllRanges();
          setPosition(null);
          setPendingRange(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        if (window.innerWidth <= 768) {
          setPosition({ top: window.innerHeight - 80, left: window.innerWidth / 2 });
        } else {
          setPosition({ top: rect.top - 54, left: rect.left + rect.width / 2 });
        }
        setPendingRange(range.cloneRange());
        setActiveMarkId(null);
      }, 50);
    };

    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, [containerRef, activeMarkId, isAddingNote]);

  // Restore highlights when DOM updates
  useEffect(() => {
    const pdfContainer = containerRef.current;
    if (!pdfContainer) return;

    pdfContainer.querySelectorAll('mark').forEach((mark: HTMLElement) => {
      const parent = mark.parentNode;
      if (parent) {
        while(mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
    });
    pdfContainer.normalize();

    const textHighlights = highlights.filter((h: any) => !h.isBookmark);

    [...textHighlights].sort((a, b) => b.startOffset - a.startOffset).forEach(hl => {
      const card = pdfContainer.querySelector(`.page-card[data-page-index="${hl.pageIndex}"]`);
      if (!card) return;

      const content = card.querySelector('.page-content');
      if (!content) return;

      let currentOffset = 0;
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null);
      let startNode = null, startNodeOffset = 0, endNode = null, endNodeOffset = 0;

      while(walker.nextNode()) {
        const node = walker.currentNode;
        const len = node.nodeValue?.length || 0;
        
        if (!startNode && currentOffset + len > hl.startOffset) { 
          startNode = node; 
          startNodeOffset = hl.startOffset - currentOffset; 
        }
        if (startNode && currentOffset + len >= hl.endOffset) { 
          endNode = node; 
          endNodeOffset = hl.endOffset - currentOffset; 
          break; 
        }
        currentOffset += len;
      }

      if (startNode && endNode) {
        const range = document.createRange(); 
        try {
          range.setStart(startNode, startNodeOffset); 
          range.setEnd(endNode, endNodeOffset);
        } catch(e) { return; } 
        
        const nodes = getTextNodesInRange(range);
        nodes.forEach(({node, startOffset, endOffset}) => {
          const mark = document.createElement('mark'); 
          mark.dataset.hlId = hl.id; 
          mark.style.cursor = 'pointer';
          
          if (hl.isNote || hl.note) {
            mark.style.backgroundColor = hl.id === activeMarkId ? 'rgba(251, 191, 36, 0.25)' : 'transparent';
            mark.style.borderBottom = hl.id === activeMarkId ? '2px solid #fbbf24' : '2px dashed #8b95a8';
            mark.style.color = 'inherit';
            mark.style.setProperty('color', 'inherit', 'important');
            mark.title = hl.textNote || hl.note || "Note";
          } else {
            mark.style.backgroundColor = hl.color;
            mark.style.borderRadius = '3px'; 
            mark.style.padding = '0 2px'; 
            mark.style.color = '#1a1a1a';
            mark.style.setProperty('color', '#1a1a1a', 'important');
          }
          
          const text = node.nodeValue || '';
          mark.appendChild(document.createTextNode(text.substring(startOffset, endOffset)));
          
          const parent = node.parentNode; 
          if(parent) {
            parent.insertBefore(document.createTextNode(text.substring(0, startOffset)), node);
            parent.insertBefore(mark, node); 
            parent.insertBefore(document.createTextNode(text.substring(endOffset)), node); 
            parent.removeChild(node);
          }
        });
      }
    });
  }, [highlights, containerRef, activeMarkId]);

  function getTextNodesInRange(range: Range) {
    let nodes = [], node = range.startContainer, endNode = range.endContainer;
    if (node === endNode) {
      if (node.nodeType === Node.TEXT_NODE) nodes.push({node, startOffset: range.startOffset, endOffset: range.endOffset});
      return nodes;
    }
    let treeWalker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, null), started = false;
    while (treeWalker.nextNode()) {
      let current = treeWalker.currentNode;
      if (current === node) { started = true; nodes.push({node: current, startOffset: range.startOffset, endOffset: current.nodeValue?.length || 0}); }
      else if (current === endNode) { nodes.push({node: current, startOffset: 0, endOffset: range.endOffset}); break; }
      else if (started) nodes.push({node: current, startOffset: 0, endOffset: current.nodeValue?.length || 0});
    }
    return nodes;
  }

  const applyHighlight = (colorHex: string) => {
    if (!pendingRange) return;

    const nodes = getTextNodesInRange(pendingRange);
    if(nodes.length === 0) return;

    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    let newHighlights = [...highlights];

    nodes.forEach(({node, startOffset, endOffset}) => {
      const card = node.parentElement?.closest('.page-card') as HTMLElement;
      if (!card) return;
      
      const pageIndex = parseInt(card.dataset.pageIndex || '1');
      const content = card.querySelector('.page-content');
      if (!content) return;

      const preRange = document.createRange(); 
      preRange.setStart(content, 0); 
      preRange.setEnd(node, startOffset);
      const absStartOffset = preRange.toString().length;
      
      const textChunk = node.nodeValue?.substring(startOffset, endOffset) || '';

      newHighlights.push({
        id: newId,
        pageIndex,
        text: textChunk,
        isNote: false,
        color: colorHex,
        startOffset: absStartOffset,
        endOffset: absStartOffset + textChunk.length,
      });
    });

    setHighlights(newHighlights);
    saveSettings({ highlights: newHighlights });
    
    window.getSelection()?.removeAllRanges();
    setPendingRange(null);
    setPosition(null);
  };

  const saveNote = (text: string) => {
    if (activeMarkId) {
      const newHighlights = highlights.map((hl: any) => 
        hl.id === activeMarkId ? { ...hl, textNote: text } : hl
      );
      setHighlights(newHighlights);
      saveSettings({ highlights: newHighlights });
    } else if (pendingRange) {
      const nodes = getTextNodesInRange(pendingRange);
      if(nodes.length !== 0) {
        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        let newHighlights = [...highlights];

        nodes.forEach(({node, startOffset, endOffset}) => {
          const card = node.parentElement?.closest('.page-card') as HTMLElement;
          if (!card) return;
          const pageIndex = parseInt(card.dataset.pageIndex || '1');
          const content = card.querySelector('.page-content');
          if (!content) return;

          const preRange = document.createRange(); 
          preRange.setStart(content, 0); 
          preRange.setEnd(node, startOffset);
          const absStartOffset = preRange.toString().length;
          const textChunk = node.nodeValue?.substring(startOffset, endOffset) || '';

          newHighlights.push({
            id: newId,
            pageIndex,
            text: textChunk,
            isNote: true,
            textNote: text,
            startOffset: absStartOffset,
            endOffset: absStartOffset + textChunk.length,
          });
        });
        setHighlights(newHighlights);
        saveSettings({ highlights: newHighlights });
        window.getSelection()?.removeAllRanges();
      }
    }
    
    setIsAddingNote(false);
    setPosition(null);
    setActiveMarkId(null);
    setPendingRange(null);
  };

  const removeActiveMark = () => {
    if (!activeMarkId) return;
    const newHighlights = highlights.filter((hl: any) => hl.id !== activeMarkId);
    setHighlights(newHighlights);
    saveSettings({ highlights: newHighlights });
    setActiveMarkId(null);
    setPosition(null);
    setIsAddingNote(false);
  };

  if (!position) return null;

  if (position.isNoteView) {
    return (
       <div 
         id="hl-popover"
         className="fixed z-[2000] w-[280px] bg-[#fffdf8] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-yellow-200/50 rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-right-4 fade-in"
         style={{
           top: `${position.top}px`,
           left: `${position.left}px`,
           transform: position.transform || 'none',
         }}
         onMouseDown={(e) => e.stopPropagation()}
         onTouchStart={(e) => e.stopPropagation()}
       >
          <div className="flex justify-between items-start mb-1">
             <div className="flex items-center gap-1.5 text-yellow-600 text-xs font-semibold uppercase tracking-wider">
               <MessageSquare size={12} /> Note
             </div>
             <div className="flex items-center gap-1" onMouseDown={(e) => e.preventDefault()}>
               {activeMarkId && !isAddingNote && (
                 <button onClick={() => setIsAddingNote(true)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><Edit3 size={14}/></button>
               )}
               {activeMarkId && (
                 <button onClick={removeActiveMark} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
               )}
               <button onClick={() => { setIsAddingNote(false); setActiveMarkId(null); setPosition(null); }} className="p-1 text-gray-400 hover:text-gray-700 transition-colors"><X size={14}/></button>
             </div>
          </div>
          {isAddingNote ? (
            <div className="flex flex-col gap-2 w-full">
              <textarea 
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your note..."
                className="w-full text-sm p-3 rounded-xl bg-black/5 border-none focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none h-24 text-gray-800 font-serif leading-relaxed"
              />
              <div className="flex justify-end mt-1" onMouseDown={(e) => e.preventDefault()}>
                <button onClick={() => saveNote(noteText)} className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg text-xs font-medium transition-colors">Save</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 font-serif leading-relaxed min-h-[60px]">
              {noteText}
            </div>
          )}
       </div>
    );
  }

  return (
    <div
      id="hl-popover"
      className="fixed z-[2000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-gray-200 flex flex-col gap-2"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: position.transform || 'translateX(-50%)',
        animation: 'hl-pop 0.12s ease-out',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {activeMarkId ? (
        <div className="flex items-center gap-2" onMouseDown={(e) => e.preventDefault()}>
           <button 
             onClick={(e) => { e.preventDefault(); removeActiveMark(); }}
             className="px-2 py-1 flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50 rounded-md font-medium"
           >
             <Trash2 size={14} /> Remove Highlight
           </button>
        </div>
      ) : (
        <div className="flex items-center gap-2" onMouseDown={(e) => e.preventDefault()}>
          {COLORS.map(c => (
            <button
              key={c.id}
              onClick={(e) => { e.preventDefault(); applyHighlight(c.hex); }}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button
            onClick={(e) => { 
              e.preventDefault(); 
              setIsAddingNote(true); 
              setNoteText(""); 
              if (pendingRange) {
                setPosition(getNotePosition(pendingRange.getBoundingClientRect()));
              }
            }}
            className="px-2 py-1 flex items-center gap-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md font-medium"
          >
            <MessageSquare size={14} /> Add Note
          </button>
        </div>
      )}
    </div>
  );
}
