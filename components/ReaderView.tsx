"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageNavigator from "./PageNavigator";
import SettingsPanel from "./SettingsPanel";
import HighlightPopover from "./HighlightPopover";
import dynamic from "next/dynamic";
const RichTextRenderer = dynamic(() => import("./RichTextRenderer"), { ssr: false });
import { minimalThemes, natureThemes } from "@/utils/themes";
import * as pdfjsLib from "pdfjs-dist";
import { Bookmark, X, MessageSquare } from "lucide-react";

export default function ReaderView({
  pdf,
  initialSettings,
  fileUrl,
}: {
  pdf: any;
  initialSettings: any;
  fileUrl: string;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const [totalPages, setTotalPages] = useState(pdf.page_count || 1);
  const [currentVisiblePage, setCurrentVisiblePage] = useState(() => {
    if (typeof window !== 'undefined') {
       const urlPage = new URLSearchParams(window.location.search).get('page');
       if (urlPage) return parseInt(urlPage);
    }
    return initialSettings?.lastPage || initialSettings?.last_page || 1;
  });

  // Settings State
  const [themeId, setThemeId] = useState(initialSettings?.theme || "paper");
  const [fontSize, setFontSize] = useState(initialSettings?.fontSize || initialSettings?.font_size || 18);
  const [fontFamily, setFontFamily] = useState(() => {
    // Normalize: handle both old CSS strings and new short keys
    const raw = initialSettings?.font || "lora";
    if (raw.includes("Lora")) return "lora";
    if (raw.includes("DM Sans") || raw.includes("dm-sans")) return "dm-sans";
    if (raw.includes("Courier")) return "lora";
    return raw; 
  });
  const [lineSpacing, setLineSpacing] = useState(
    initialSettings?.lineSpacing || initialSettings?.line_spacing || "1.85"
  );
  const [highlights, setHighlights] = useState<any[]>(
    initialSettings?.highlights || []
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const highestPageReadRef = useRef(initialSettings?.pages_read || 1);
  const lastSavedSettingsRef = useRef(initialSettings);
  const pdfDocRef = useRef<any>(null);

  const triggerLazyLoad = useCallback(async (pageId: number) => {
    setPages(prevPages => {
      const pageIdx = prevPages.findIndex(p => p.id === pageId);
      if (pageIdx === -1) return prevPages;
      const pageData = prevPages[pageIdx];
      if (pageData.isLoaded || pageData.isLoading) return prevPages;

      const newPages = [...prevPages];
      newPages[pageIdx] = { ...pageData, isLoading: true };
      
      (async () => {
        try {
          const pdfDoc = pdfDocRef.current;
          if (!pdfDoc) return;
          const page = await pdfDoc.getPage(pageId);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = viewport.width;
          fullCanvas.height = viewport.height;
          const ctx = fullCanvas.getContext('2d');
          if (!ctx) return;
          
          await page.render({ canvasContext: ctx, viewport }).promise;

          if (pageData.isScanned) {
            const dataUrl = fullCanvas.toDataURL('image/webp', 0.85);
            setPages(current => {
              const idx = current.findIndex(p => p.id === pageId);
              if (idx === -1) return current;
              const updated = [...current];
              updated[idx] = { ...updated[idx], dataUrl, isLoaded: true, isLoading: false };
              return updated;
            });
            return;
          }

          const newBlocks = pageData.blocks.map((b: any) => {
            if (b.type === 'image' && !b.dataUrl) {
              const cropCanvas = document.createElement('canvas');
              cropCanvas.width = Math.round(b.canvasW);
              cropCanvas.height = Math.round(b.canvasH);
              const cropCtx = cropCanvas.getContext('2d');
              if (cropCtx) {
                cropCtx.drawImage(
                  fullCanvas,
                  Math.round(b.canvasX), Math.round(b.canvasY),
                  Math.round(b.canvasW), Math.round(b.canvasH),
                  0, 0,
                  Math.round(b.canvasW), Math.round(b.canvasH)
                );
                return { ...b, dataUrl: cropCanvas.toDataURL('image/webp', 0.85) };
              }
            }
            return b;
          });

          setPages(current => {
            const idx = current.findIndex(p => p.id === pageId);
            if (idx === -1) return current;
            const updated = [...current];
            updated[idx] = { ...updated[idx], blocks: newBlocks, isLoaded: true, isLoading: false };
            return updated;
          });
        } catch(e) {
          console.error("Lazy load failed for page", pageId, e);
          setPages(current => {
            const idx = current.findIndex(p => p.id === pageId);
            if (idx === -1) return current;
            const updated = [...current];
            updated[idx] = { ...updated[idx], isLoading: false };
            return updated;
          });
        }
      })();
      
      return newPages;
    });
  }, []);

  // Apply Theme CSS dynamically
  useEffect(() => {
    const minimal = minimalThemes.find((t) => t.id === themeId);
    const root = document.documentElement;
    const bokeh = document.getElementById("bokeh-bg");

    if (minimal) {
      document.body.style.backgroundImage = "none";
      document.body.style.backgroundColor = minimal.bgColor;
      root.style.setProperty("--bg-color", minimal.bgColor);
      root.style.setProperty("--card-bg", minimal.cardBg);
      root.style.setProperty("--text-color", minimal.textColor);
      root.style.setProperty("--muted-color", minimal.mutedColor);
      root.style.setProperty("--card-border", "transparent");
      document.body.classList.remove("glass-theme");
      // Hide bokeh for dark minimal themes — flat dark bg looks cleaner without blobs
      if (bokeh) bokeh.style.display = ["dusk", "sage"].includes(themeId) ? "none" : "block";
      if (["dusk", "sage"].includes(themeId)) document.body.classList.add("dark-theme");
      else document.body.classList.remove("dark-theme");
    } else {
      const nature = natureThemes.find((t) => t.id === themeId);
      if (nature) {
        document.body.style.backgroundColor = nature.bgColor;
        document.body.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(nature.pattern)}")`;
        document.body.style.backgroundAttachment = "auto";
        document.body.style.backgroundSize = "auto";
        document.body.style.backgroundPosition = "0 0";
        document.body.style.backgroundRepeat = "repeat";
        
        root.style.setProperty("--bg-color", nature.bgColor);
        root.style.setProperty("--card-bg", nature.cardBg);
        root.style.setProperty("--text-color", nature.textColor);
        root.style.setProperty("--muted-color", nature.mutedColor);
        root.style.setProperty(
          "--card-border",
          nature.dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)"
        );
        document.body.classList.add("glass-theme");
        if (bokeh) bokeh.style.display = "none";
        if (nature.dark) document.body.classList.add("dark-theme");
        else document.body.classList.remove("dark-theme");
      }
    }

    const fontMap: Record<string, string> = {
      lora: "'Lora', serif",
      "dm-sans": "'DM Sans', sans-serif",
      literata: "'Literata', serif",
    };
    const resolvedFont = fontMap[fontFamily] ?? fontMap["lora"];
    root.style.setProperty("--font-family", resolvedFont);
    root.style.setProperty("--font-size", `${fontSize / 16}rem`);
    root.style.setProperty("--line-height", lineSpacing);
  }, [themeId, fontFamily, fontSize, lineSpacing]);

  // Save Settings — exclusively local via IndexedDB
  const saveSettings = useCallback(
    (updates: any) => {
      import('@/utils/localStore').then(async ({ getPdfSettingsLocal, savePdfSettingsLocal }) => {
        const existing = await getPdfSettingsLocal(pdf.id) || { pdfId: pdf.id };
        await savePdfSettingsLocal({ ...existing, ...updates });
      });
    },
    [pdf.id]
  );

  // Load PDF
  useEffect(() => {
    let isMounted = true;
    const loadPDF = async () => {
      try {
        setLoading(true);
        setLoadingText("Downloading secure document...");

        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url
        ).toString();

        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdfDoc = await loadingTask.promise;
        pdfDocRef.current = pdfDoc;
        const total = pdfDoc.numPages;

        if (isMounted) setTotalPages(total);
        if (pdf.page_count !== total) saveSettings({ totalPages: total });

        const htmlPages: any[] = [];
        for (let i = 1; i <= total; i++) {
          if (!isMounted) break;
          setLoadingText(`Parsing page ${i} of ${total}...`);
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          
          const viewport = page.getViewport({ scale: 2.0 });
          const OPS = pdfjsLib.OPS;

          const operatorList = await page.getOperatorList();
          const imageRegions: any[] = [];
          let currentTransform = [1, 0, 0, 1, 0, 0];
          const transformStack: number[][] = [];

          for (let j = 0; j < operatorList.fnArray.length; j++) {
            const fn = operatorList.fnArray[j];
            const args = operatorList.argsArray[j];

            if (fn === OPS.save) {
              transformStack.push([...currentTransform]);
            } else if (fn === OPS.restore) {
              if (transformStack.length > 0) currentTransform = transformStack.pop()!;
            } else if (fn === OPS.transform) {
              const [a, b, c, d, e, f] = args;
              const [ca, cb, cc, cd, ce, cf] = currentTransform;
              currentTransform = [
                ca * a + cc * b,
                cb * a + cd * b,
                ca * c + cc * d,
                cb * c + cd * d,
                ca * e + cc * f + ce,
                cb * e + cd * f + cf,
              ];
            } else if (
              fn === OPS.paintImageXObject ||
              fn === OPS.paintInlineImageXObject ||
              fn === OPS.paintImageXObjectRepeat
            ) {
              const [a, b, c, d, e, f] = currentTransform;
              const p0x = e, p0y = f;
              const p1x = a + e, p1y = b + f;
              const p2x = c + e, p2y = d + f;
              const p3x = a + c + e, p3y = b + d + f;

              const pdfX = Math.min(p0x, p1x, p2x, p3x);
              const maxPdfX = Math.max(p0x, p1x, p2x, p3x);
              const pdfY = Math.min(p0y, p1y, p2y, p3y);
              const maxPdfY = Math.max(p0y, p1y, p2y, p3y);

              const pdfW = maxPdfX - pdfX;
              const pdfH = maxPdfY - pdfY;

              const canvasX = pdfX * viewport.scale;
              const canvasY = (viewport.viewBox[3] - maxPdfY) * viewport.scale;
              const canvasW = pdfW * viewport.scale;
              const canvasH = pdfH * viewport.scale;

              if (canvasW < 2 || canvasH < 2) continue; // skip tiny noise

              imageRegions.push({ canvasX, canvasY, canvasW, canvasH });
            }
          }

          const mergedRegions: any[] = [];
          const MERGE_THRESHOLD = 15; // px
          const regionsToMerge = [...imageRegions];

          while (regionsToMerge.length > 0) {
             const current = regionsToMerge.shift()!;
             let merged = true;
             while (merged) {
               merged = false;
               for (let j = 0; j < regionsToMerge.length; j++) {
                 const other = regionsToMerge[j];
                 const overlapX = current.canvasX <= other.canvasX + other.canvasW + MERGE_THRESHOLD &&
                                  current.canvasX + current.canvasW + MERGE_THRESHOLD >= other.canvasX;
                 const overlapY = current.canvasY <= other.canvasY + other.canvasH + MERGE_THRESHOLD &&
                                  current.canvasY + current.canvasH + MERGE_THRESHOLD >= other.canvasY;
                 
                 if (overlapX && overlapY) {
                    const newX = Math.min(current.canvasX, other.canvasX);
                    const newY = Math.min(current.canvasY, other.canvasY);
                    const newMaxX = Math.max(current.canvasX + current.canvasW, other.canvasX + other.canvasW);
                    const newMaxY = Math.max(current.canvasY + current.canvasH, other.canvasY + other.canvasH);
                    
                    current.canvasX = newX;
                    current.canvasY = newY;
                    current.canvasW = newMaxX - newX;
                    current.canvasH = newMaxY - newY;
                    
                    regionsToMerge.splice(j, 1);
                    merged = true;
                    break;
                 }
               }
             }
             if (current.canvasW >= 100 && current.canvasH >= 60) {
               current.sortY = current.canvasY / viewport.scale;
               mergedRegions.push(current);
             }
          }

          const totalChars = textContent.items.reduce((sum: number, item: any) => sum + (item.str?.length || 0), 0);
          const pageArea = viewport.viewBox[2] * viewport.viewBox[3];
          const largeImageExists = mergedRegions.some(r =>
            (r.canvasW / viewport.scale) * (r.canvasH / viewport.scale) > pageArea * 0.6
          );

          // Scanned page (nearly no text, large image cover)
          if (totalChars < 20 && largeImageExists) {
            htmlPages.push({ id: i, isScanned: true, isLoaded: false, dataUrl: '' });
            continue;
          }

          // Math-heavy page: many center-dots, ellipsis, times-signs etc.
          // These pages render as hi-DPI canvas images so matrices look right.
          const allRawText = textContent.items.map((it: any) => it.str || '').join('');
          const mathSymCount = (allRawText.match(/[··⋅×÷∑∫√∂→←↔≈≠≤≥±∞∈∉⊂⊃∪∩∧∨¬∀∃]/g) || []).length;
          const ellipsisCount = (allRawText.match(/[…⋯⋮⋱]|\.{3}/g) || []).length;
          const pageMathScore = mathSymCount * 3 + ellipsisCount * 4;
          const pageMathRatio = totalChars > 0 ? pageMathScore / totalChars : 0;
          if (pageMathRatio > 0.12 && pageMathScore > 8) {
            htmlPages.push({ id: i, isScanned: true, isMathPage: true, isLoaded: false, dataUrl: '' });
            continue;
          }

          const items = textContent.items;
          items.sort((a: any, b: any) => {
            const yA = a.transform[5],
              yB = b.transform[5];
            if (Math.abs(yA - yB) <= 5) return a.transform[4] - b.transform[4];
            return yB - yA;
          });

          let textBlocks: any[] = [];
          let currentParagraph = "",
            lastY: number | null = null,
            lastX: number | null = null,
            lastWidth: number | null = null,
            currentBlockY: number | null = null,
            blockMinY = 0,
            blockMaxY = 0;

          for (const rawItem of items) {
            const item = rawItem as any;
            const text = item.str,
              currentY = item.transform[5],
              currentX = item.transform[4],
              currentWidth = item.width,
              currentHeight = item.transform[3]; // Approx font height
            if (text === undefined) continue;

            if (currentBlockY === null) {
              currentBlockY = currentY;
              blockMinY = currentY;
              blockMaxY = currentY + currentHeight;
            }

            if (lastY !== null) {
              const yDiff = Math.abs(lastY - currentY);
              if (yDiff > 15) {
                if (currentParagraph.trim()) {
                  textBlocks.push({ 
                    type: 'text', 
                    y: viewport.viewBox[3] - currentBlockY!, 
                    height: Math.abs(blockMaxY - blockMinY),
                    paragraphs: [currentParagraph.trim()] 
                  });
                }
                currentParagraph = text;
                currentBlockY = currentY;
                blockMinY = currentY;
                blockMaxY = currentY + currentHeight;
              } else {
                blockMinY = Math.min(blockMinY, currentY);
                blockMaxY = Math.max(blockMaxY, currentY + currentHeight);
                if (yDiff <= 5 && lastX !== null && lastWidth !== null) {
                  const expectedNextX = lastX + lastWidth;
                  if (currentX - expectedNextX > 2)
                    currentParagraph += " " + text;
                  else currentParagraph += text;
                } else {
                  if (currentParagraph.trim() && !currentParagraph.endsWith("-"))
                    currentParagraph += " " + text;
                  else if (currentParagraph.endsWith("-"))
                    currentParagraph = currentParagraph.slice(0, -1) + text;
                  else currentParagraph += text;
                }
              }
            } else currentParagraph = text;
            lastY = currentY;
            lastX = currentX;
            lastWidth = currentWidth;
          }
          if (currentParagraph.trim() && currentBlockY !== null) {
            textBlocks.push({ 
              type: 'text', 
              y: viewport.viewBox[3] - currentBlockY, 
              height: Math.abs(blockMaxY - blockMinY),
              paragraphs: [currentParagraph.trim()] 
            });
          }

          // ── Whole-page Math Detection Heuristic ────────────────────────────
          // If ANY block on the page looks like a matrix or complex equation,
          // we render the ENTIRE page as a high-DPI canvas image. This is 
          // the only way to preserve 2D mathematical layouts perfectly.
          
          const isMathBlockHeuristic = (para: string): boolean => {
            // Check for math symbols, matrix brackets, dots, fractions, etc.
            const mathSymbols = (para.match(/[··⋅×÷∑∫√∂→←↔≈≠≤≥±∞∈∉⊂⊃∪∩∧∨¬∀∃=\[\]]/g) || []).length;
            const ellipsis = (para.match(/[…⋯⋮⋱]|\.{3}/g) || []).length;
            const fraction = (para.match(/[0-9]+\s*[\/]\s*[0-9]+/g) || []).length;
            // Isolated single letters/numbers with spaces (matrix columns)
            const isolated = (para.match(/(^|\s)([0-9]|[a-z])(\s|$)/gi) || []).length;
            // Characteristic matrix spacing (3+ spaces)
            const multiSpaces = (para.match(/\s{3,}/g) || []).length;

            const score = mathSymbols * 4 + ellipsis * 5 + fraction * 3 + isolated * 2 + multiSpaces * 5;
            // If the block is very mathy, return true
            return score > 6 && (para.length === 0 || score / para.length > 0.07);
          };

          const pageHasMath = textBlocks.some(tb => 
            tb.paragraphs.some((p: string) => isMathBlockHeuristic(p))
          );

          if (pageHasMath) {
            htmlPages.push({ 
              id: i, 
              isScanned: true, 
              isMathPage: true, 
              isLoaded: false, 
              dataUrl: '' 
            });
            continue;
          }

          const imageBlocks = mergedRegions.map(r => ({
            type: 'image',
            y: r.sortY,
            canvasX: r.canvasX,
            canvasY: r.canvasY,
            canvasW: r.canvasW,
            canvasH: r.canvasH,
            dataUrl: '',
          }));

          const allBlocks = [...textBlocks, ...imageBlocks].sort((a: any, b: any) => a.y - b.y);

          const finalBlocks: any[] = [];
          for (const b of allBlocks) {
            if (b.type === 'text') {
              const last = finalBlocks[finalBlocks.length - 1];
              if (last && last.type === 'text') {
                last.paragraphs.push(...b.paragraphs);
              } else {
                finalBlocks.push({ type: 'text', y: b.y, paragraphs: [...b.paragraphs] });
              }
            } else {
              finalBlocks.push(b);
            }
          }

          const needsImageLoad = finalBlocks.some((b: any) => b.type === 'image');
          if (finalBlocks.length > 0 || imageBlocks.length > 0) {
            htmlPages.push({ id: i, blocks: finalBlocks, isLoaded: !needsImageLoad });
          }
        }

        if (isMounted) {
          setPages(htmlPages);
          setLoading(false);
          // Auto-scroll to last read page after render
          setTimeout(() => {
            const urlPage = new URLSearchParams(window.location.search).get('page');
            const targetPage = urlPage ? parseInt(urlPage) : (initialSettings?.last_page || 1);
            if (targetPage > 1) {
              const card = document.getElementById(`page-${targetPage}`);
              if (card) card.scrollIntoView({ behavior: "auto", block: "start" });
            }
          }, 200);
        }
      } catch (err: any) {
        console.error("PDF Load Error", err);
        if (isMounted)
          setLoadingText(
            "Failed to load PDF: " + (err.message || JSON.stringify(err))
          );
      }
    };
    loadPDF();
    return () => {
      isMounted = false;
    };
  }, [fileUrl, pdf.page_count, pdf.id, initialSettings?.last_page, saveSettings]);

  // IntersectionObserver: fade-in cards and trigger lazy load
  useEffect(() => {
    if (loading || pages.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("page-visible");
            const pageId = parseInt((entry.target as HTMLElement).dataset.pageIndex || "0");
            if (pageId > 0) {
              triggerLazyLoad(pageId);
            }
          }
        });
      },
      { threshold: 0.05, rootMargin: "400px 0px" }
    );
    const cards = document.querySelectorAll(".page-card");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [loading, pages, triggerLazyLoad]);

  // Scroll Tracking & Progress Bar
  useEffect(() => {
    if (loading) return;
    const handleScroll = () => {
      const winScroll =
        document.body.scrollTop || document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      if (height > 0) {
        const bar = document.getElementById("reading-progress-bar");
        if (bar) bar.style.width = `${(winScroll / height) * 100}%`;
      }

      const cards = document.querySelectorAll(".page-card");
      if (cards.length > 0) {
        const triggerLine = window.innerHeight * 0.4;
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].getBoundingClientRect().bottom > triggerLine) {
            const pageId = parseInt(
              (cards[i] as HTMLElement).dataset.pageIndex || "1"
            );
            if (pageId !== currentVisiblePage) {
              setCurrentVisiblePage(pageId);
              highestPageReadRef.current = Math.max(
                highestPageReadRef.current,
                pageId
              );
            }
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, currentVisiblePage]);

  // Auto-save on page change
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      saveSettings({
        lastPage: currentVisiblePage,
        pagesRead: currentVisiblePage,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentVisiblePage, loading, saveSettings]);

  // Arrow Key Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        const prev = Math.max(1, currentVisiblePage - 1);
        const card = document.getElementById(`page-${prev}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (e.key === "ArrowRight") {
        const next = Math.min(totalPages, currentVisiblePage + 1);
        const card = document.getElementById(`page-${next}`);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentVisiblePage, totalPages]);

  const handleBackToLibrary = () => {
    saveSettings({ lastPage: currentVisiblePage, pagesRead: currentVisiblePage });

    // Restore library theme CSS vars before navigating back
    const libDark = localStorage.getItem("library-dark-mode") === "true";
    const root = document.documentElement;
    if (libDark) {
      root.style.setProperty("--bg-color", "#0d1117");
      root.style.setProperty("--card-bg", "#161b27");
      root.style.setProperty("--text-color", "#e6e1d6");
      root.style.setProperty("--muted-color", "#8b95a8");
      document.body.classList.add("dark-theme");
    } else {
      root.style.setProperty("--bg-color", "#f7f4ef");
      root.style.setProperty("--card-bg", "#ffffff");
      root.style.setProperty("--text-color", "#2c2c2c");
      root.style.setProperty("--muted-color", "#888888");
      document.body.classList.remove("dark-theme");
    }
    document.body.style.backgroundImage = "none";
    document.body.style.backgroundColor = libDark ? "#0d1117" : "#f7f4ef";
    document.body.classList.remove("glass-theme");

    // router.refresh() clears the Next.js router cache so the reader page
    // always re-fetches fresh settings from the server on next visit
    router.refresh();
    router.push("/library");
  };

  const renderedPages = useMemo(() => {
    return pages.map((p) => {
      if (p.isScanned) {
        return (
          <div
            key={p.id}
            id={`page-${p.id}`}
            data-page={p.id}
            data-page-index={p.id}
            className="page-card w-full mb-12 rounded-2xl relative"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              padding: "0",
              boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
              opacity: 0,
              transform: "translateY(30px)",
              transition: "opacity 0.8s ease, transform 0.8s ease, background-color 0.3s ease, border-color 0.3s ease",
              overflow: "hidden"
            }}
          >
            <div className="absolute top-4 right-4 bg-black/60 text-white text-[0.65rem] px-[12px] py-[4px] rounded-[20px] backdrop-blur-lg z-10 font-sans tracking-widest uppercase border border-white/10 shadow-lg animate-in fade-in zoom-in duration-500">
              {p.isMathPage ? "Math Mode" : "Scanned"}
            </div>
            {!p.isLoaded && !p.dataUrl ? (
              <div className="w-full bg-gray-200/20 animate-pulse rounded-2xl" style={{ height: "600px" }} />
            ) : (
              <img src={p.dataUrl} alt={`Page ${p.id}`} className="w-full h-auto block" />
            )}
            <div
              className="text-center absolute bottom-4 left-0 right-0"
              style={{ fontSize: "0.85rem", color: "rgba(0,0,0,0.4)", fontFamily: "'DM Sans', sans-serif" }}
            >
              - {p.id} -
            </div>
          </div>
        );
      }

      return (
        <div key={p.id} id={`page-${p.id}`} className="page-group mb-12">
          {p.blocks?.filter((block: any) => {
            if (block.type === 'image') return true;
            const validParas = block.paragraphs?.filter((para: string) => para && para.trim().length > 0);
            return validParas && validParas.length > 0;
          }).map((block: any, bIdx: number) => {
            if (block.type === 'image') {
              // Math-crop blocks render inline (no card chrome) so equations
              // flow naturally with the surrounding prose text.
              if (block.isMathCrop) {
                return (
                  <div
                    key={`math-crop-${p.id}-${bIdx}`}
                    data-page-index={p.id}
                    className="page-card math-crop-block w-full mb-4 rounded-lg overflow-hidden"
                    style={{
                      opacity: 0,
                      transform: "translateY(30px)",
                      transition: "opacity 0.8s ease, transform 0.8s ease",
                      background: "transparent",
                      border: "none",
                      boxShadow: "none",
                      padding: "0.5rem 0",
                    }}
                  >
                    {!block.dataUrl ? (
                      <div className="w-full bg-gray-200/10 animate-pulse" style={{ height: "60px", borderRadius: "4px" }} />
                    ) : (
                      <div className="math-crop-container relative group">
                        <img
                          src={block.dataUrl}
                          className="max-w-full h-auto block mx-auto mix-blend-multiply dark:mix-blend-lighten contrast-[1.05]"
                          style={{ maxHeight: "400px", objectFit: "contain" }}
                          alt="Math expression"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/5 transition-colors pointer-events-none" />
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={`img-${p.id}-${bIdx}`}
                  data-page-index={p.id}
                  className="page-card image-card w-full mb-8 rounded-2xl flex flex-col items-center"
                  style={{
                    opacity: 0,
                    transform: "translateY(30px)",
                    transition: "opacity 0.8s ease, transform 0.8s ease",
                  }}
                >
                  <div className="w-full rounded-lg overflow-hidden flex justify-center">
                    {!block.dataUrl ? (
                      <div className="w-full bg-gray-200/20 animate-pulse" style={{ height: "200px", borderRadius: "8px" }} />
                    ) : (
                      <img src={block.dataUrl} className="w-full h-auto block" style={{ borderRadius: "8px" }} alt="Extracted" loading="lazy" />
                    )}
                  </div>
                </div>
              );
            }

            const cleanParagraphs = block.paragraphs
              .map((para: string) => para.replace(/\s+/g, ' ').trim())
              .filter((para: string) => para && para.length > 0);

            return (
              <div
                key={`txt-${p.id}-${bIdx}`}
                data-page-index={p.id}
                className="page-card w-full mb-8 rounded-2xl"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  padding: "3rem 5rem",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
                  opacity: 0,
                  transform: "translateY(30px)",
                  transition: "opacity 0.8s ease, transform 0.8s ease, background-color 0.3s ease, border-color 0.3s ease",
                }}
              >
                <div
                  className="page-content"
                  style={{
                    fontSize: "var(--font-size)",
                    lineHeight: "var(--line-height)",
                    color: "var(--text-color)",
                    fontFamily: "var(--font-family)",
                    textAlign: "left",
                  }}
                >
                  <RichTextRenderer
                    paragraphs={cleanParagraphs}
                    pageId={p.id}
                    blockIdx={bIdx}
                  />
                </div>
                {bIdx === p.blocks.length - 1 && (
                  <div
                    className="text-center mt-8 -mb-4"
                    style={{ fontSize: "0.85rem", color: "var(--muted-color)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    - {p.id} -
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    });
  }, [pages]);

  // Loading screen — light theme matching index.html
  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[5000] flex flex-col items-center justify-center"
        style={{
          background: "rgba(247, 244, 239, 0.95)",
          backdropFilter: "blur(4px)",
          fontFamily: "'DM Sans', sans-serif",
          color: "#333333",
        }}
      >
        <div
          className="w-10 h-10 rounded-full mb-4"
          style={{
            border: "3px solid #cccccc",
            borderTopColor: "#333333",
            animation: "spin 1s linear infinite",
          }}
        />
        <p className="text-base font-medium">{loadingText}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Bokeh Background */}
      <div
        id="bokeh-bg"
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      >
        <div
          className="absolute rounded-full"
          style={{
            top: "-10%", left: "-10%", width: "50vw", height: "50vw",
            background: "var(--bokeh-1, rgba(230,220,240,0.6))",
            filter: "blur(80px)", opacity: 0.8,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-10%", right: "-10%", width: "60vw", height: "60vw",
            background: "var(--bokeh-2, rgba(210,230,240,0.6))",
            filter: "blur(80px)", opacity: 0.8,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "40%", left: "30%", width: "40vw", height: "40vw",
            background: "var(--bokeh-3, rgba(240,230,210,0.6))",
            filter: "blur(80px)", opacity: 0.8,
          }}
        />
      </div>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: "rgba(0,0,0,0.05)" }}>
        <div
          id="reading-progress-bar"
          className="h-full transition-all duration-75"
          style={{ width: "0%", background: "var(--text-color)" }}
        />
      </div>

      {/* Back Button */}
      <button
        onClick={handleBackToLibrary}
        className="fixed top-6 left-6 z-40 text-sm px-2 py-2 transition-all duration-200"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--text-color)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          opacity: 0.4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
      >
        ← Library
      </button>
      {/* Pages */}
      <div
        ref={containerRef}
        className="max-w-[820px] mx-auto pt-16 pb-32 px-4 sm:px-0"
      >
        {renderedPages}
      </div>

      <PageNavigator 
        currentPage={currentVisiblePage} 
        totalPages={totalPages} 
        isBookmarked={highlights.some((h:any) => h.isBookmark && h.pageIndex === currentVisiblePage)}
        toggleBookmark={() => {
          const existing = highlights.find((h:any) => h.isBookmark && h.pageIndex === currentVisiblePage);
          let newHighlights;
          if (existing) {
             newHighlights = highlights.filter((h:any) => h.id !== existing.id);
          } else {
             newHighlights = [...highlights, {
               id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
               isBookmark: true,
               pageIndex: currentVisiblePage,
               addedAt: Date.now()
             }];
          }
          setHighlights(newHighlights);
          saveSettings({ highlights: newHighlights });
        }}
        bookmarks={highlights.filter((h: any) => h.isBookmark || h.isNote || h.note).sort((a: any, b: any) => a.pageIndex - b.pageIndex)}
      />

      <HighlightPopover
        containerRef={containerRef}
        saveSettings={saveSettings}
        highlights={highlights}
        setHighlights={setHighlights}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        setIsOpen={setIsSettingsOpen}
        themeId={themeId}
        setThemeId={(v: string) => {
          setThemeId(v);
          saveSettings({ theme: v });
        }}
        fontSize={fontSize}
        setFontSize={(v: number) => {
          setFontSize(v);
          saveSettings({ fontSize: v });
        }}
        fontFamily={fontFamily}
        setFontFamily={(v: string) => {
          setFontFamily(v);
          saveSettings({ font: v });
        }}
        lineSpacing={lineSpacing}
        setLineSpacing={(v: string) => {
          setLineSpacing(v);
          saveSettings({ lineSpacing: v });
        }}
        clearHighlights={() => {
          setHighlights([]);
          saveSettings({ highlights: [] });
        }}
      />

      {/* CSS for page-visible fade-in and page-content paragraphs */}
      <style>{`
        .page-card.page-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .glass-theme .page-card {
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          box-shadow: 0 10px 40px rgba(0,0,0,0.08);
        }
        .page-card.image-card {
           background: var(--card-bg);
           padding: 1.5rem;
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: 0.75rem;
           border: 1px solid var(--card-border);
           box-shadow: 0 10px 40px rgba(0,0,0,0.03);
        }
        body:not(.glass-theme) .page-card.image-card {
           background: #ffffff;
           box-shadow: 0 2px 12px rgba(0,0,0,0.08);
           border-color: transparent;
        }
        body:not(.glass-theme).dark-theme .page-card.image-card {
           background: var(--card-bg);
           box-shadow: 0 2px 12px rgba(0,0,0,0.3);
           border-color: transparent;
        }
        .page-content p {
          margin-bottom: 1.5em;
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
          -webkit-hyphens: auto;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--text-color);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        body.dark-theme mark {
          filter: brightness(0.88);
          color: #1a1a1a !important;
        }

        /* ── Rich Content: Markdown ── */
        .rich-markdown h1, .rich-markdown h2, .rich-markdown h3,
        .rich-markdown h4, .rich-markdown h5, .rich-markdown h6 {
          font-family: var(--font-family);
          color: var(--text-color);
          margin: 1.2em 0 0.5em;
          line-height: 1.3;
          font-weight: 700;
        }
        .rich-markdown h1 { font-size: 1.9em; border-bottom: 2px solid rgba(0,0,0,0.08); padding-bottom: 0.25em; }
        .rich-markdown h2 { font-size: 1.5em; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 0.2em; }
        .rich-markdown h3 { font-size: 1.25em; }
        .rich-markdown h4 { font-size: 1.1em; }
        .rich-markdown p  { margin-bottom: 1em; text-align: justify; color: var(--text-color); }
        .rich-markdown ul, .rich-markdown ol {
          padding-left: 1.8em;
          margin-bottom: 1.2em;
          color: var(--text-color);
        }
        .rich-markdown li { margin-bottom: 0.4em; line-height: 1.7; }
        .rich-markdown strong { font-weight: 700; color: var(--text-color); }
        .rich-markdown em { font-style: italic; color: var(--text-color); }
        .rich-markdown code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 0.88em;
          background: rgba(0,0,0,0.06);
          border-radius: 4px;
          padding: 0.15em 0.4em;
          color: var(--text-color);
        }
        body.dark-theme .rich-markdown code {
          background: rgba(255,255,255,0.1);
        }
        .rich-markdown pre {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
          padding: 1.2em 1.5em;
          overflow-x: auto;
          margin-bottom: 1.5em;
          border: 1px solid rgba(0,0,0,0.06);
        }
        body.dark-theme .rich-markdown pre {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.08);
        }
        .rich-markdown pre code {
          background: none;
          padding: 0;
          font-size: 0.875em;
          line-height: 1.6;
        }
        .rich-markdown blockquote {
          border-left: 4px solid rgba(0,0,0,0.15);
          margin: 0 0 1.2em;
          padding: 0.5em 1.2em;
          color: var(--muted-color);
          font-style: italic;
          background: rgba(0,0,0,0.03);
          border-radius: 0 8px 8px 0;
        }
        body.dark-theme .rich-markdown blockquote {
          border-left-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.04);
        }
        /* Markdown Tables */
        .rich-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5em;
          font-size: 0.93em;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .rich-markdown thead tr {
          background: rgba(0,0,0,0.07);
        }
        body.dark-theme .rich-markdown thead tr {
          background: rgba(255,255,255,0.1);
        }
        .rich-markdown th {
          padding: 0.7em 1em;
          text-align: left;
          font-weight: 600;
          color: var(--text-color);
          border-bottom: 2px solid rgba(0,0,0,0.12);
          white-space: nowrap;
        }
        body.dark-theme .rich-markdown th {
          border-bottom-color: rgba(255,255,255,0.12);
        }
        .rich-markdown td {
          padding: 0.6em 1em;
          color: var(--text-color);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          vertical-align: top;
          line-height: 1.6;
        }
        body.dark-theme .rich-markdown td {
          border-bottom-color: rgba(255,255,255,0.06);
        }
        .rich-markdown tbody tr:hover {
          background: rgba(0,0,0,0.025);
        }
        body.dark-theme .rich-markdown tbody tr:hover {
          background: rgba(255,255,255,0.03);
        }
        .rich-markdown a {
          color: #5a8dee;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        body.dark-theme .rich-markdown a {
          color: #7aaeff;
        }
        .rich-markdown hr {
          border: none;
          border-top: 2px solid rgba(0,0,0,0.08);
          margin: 1.5em 0;
        }

        /* ── Rich Content: KaTeX ── */
        .katex-display-wrapper {
          display: flex;
          justify-content: center;
          padding: 1.2em 0;
          overflow-x: auto;
          margin-bottom: 0.5em;
        }
        .katex-display-wrapper .katex-display {
          margin: 0;
        }
        .katex-error {
          color: #cc2222;
          font-family: monospace;
          font-size: 0.85em;
          word-break: break-all;
        }
        body.dark-theme .katex-error {
          color: #ff7070;
        }
        .katex { color: var(--text-color); font-size: 1.05em; }

        /* ── Rich Content: Mermaid ── */
        .mermaid-block svg {
          max-width: 100%;
          height: auto;
        }
        .mermaid-block .mermaid-error {
          font-family: monospace;
          font-size: 0.8em;
          color: var(--muted-color);
          white-space: pre-wrap;
          word-break: break-word;
        }
        body.dark-theme .mermaid-block {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.07) !important;
        }
      `}</style>
    </>
  );
}
