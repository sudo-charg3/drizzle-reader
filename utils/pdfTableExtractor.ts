// ─────────────────────────────────────────────────────────────────────────────
// Table extraction from PDF items (for in-page table rendering)
// ─────────────────────────────────────────────────────────────────────────────

const INDEX_HEADER_WORDS = new Set([
  'S.NO', 'SNO', 'EXPERIMENT', 'NAME', 'DATE', 'PAGE', 'NO.', 'NO',
  'REMARKS', 'INDEX', 'CONTENTS', 'S', 'TABLE', 'OF',
]);

/**
 * Special extractor for lab-manual index tables:
 * S.NO | CONTENTS | DATE | PAGE NO | REMARKS
 *
 * Uses DATE (DD-MM-YY) tokens as row anchors — no coordinate math.
 * Returns a compact 3-column markdown table: No | Contents | Page
 */
function extractIndexTable(items: any[]): { markdown: string; entries: { title: string; pageIndex: number }[] } | null {
  const allText = items.map(i => i.str).join(' ').toUpperCase();
  if (!allText.includes('S.NO') && !allText.includes('EXPERIMENT NAME')) return null;

  // ── Build token stream in proper reading order ────────────────────────────
  const nonEmpty = items.filter(i => i.str.trim());
  const stream = [...nonEmpty]
    .sort((a, b) => {
      const yA = a.transform[5], yB = b.transform[5];
      if (Math.abs(yA - yB) <= 5) return a.transform[4] - b.transform[4];
      return yB - yA;
    })
    .map(i => i.str.trim())
    .filter(s => s)
    .join(' ');

  const DATE_RE = /\b(\d{2}-\d{2}-\d{2,4})\b/g;
  const PAGE_RE = /\b(\d+)\s*[–\-]\s*(\d+)\b/;

  const dates: Array<{ index: number; str: string }> = [];
  let dm: RegExpExecArray | null;
  while ((dm = DATE_RE.exec(stream)) !== null) {
    dates.push({ index: dm.index, str: dm[1] });
  }
  if (dates.length === 0) return null;

  let markdown = '| # | Contents | Pages |\n|:---:|---|:---:|\n';
  const entries: { title: string; pageIndex: number }[] = [];
  let lastEnd = 0;

  for (let d = 0; d < dates.length; d++) {
    const { index, str: dateStr } = dates[d];
    const before = stream.slice(lastEnd, index).trim();
    const afterEnd = d + 1 < dates.length ? dates[d + 1].index : stream.length;
    const after = stream.slice(index + dateStr.length, afterEnd).trim();
    lastEnd = index + dateStr.length;

    // Page range — first X–Y pattern after the date
    const pm = PAGE_RE.exec(after);
    if (!pm) continue;
    const page = `${pm[1]}–${pm[2]}`;
    const pageIndex = parseInt(pm[1], 10);

    // Serial + Name from `before` — find last standalone integer (the serial number)
    const words = before.split(/\s+/);
    let serialIdx = -1;
    for (let w = words.length - 1; w >= 0; w--) {
      if (/^\d{1,3}$/.test(words[w])) { serialIdx = w; break; }
    }
    if (serialIdx === -1) continue;

    const serial = words[serialIdx];
    let nameParts = words
      .slice(serialIdx + 1)
      .filter(w => !INDEX_HEADER_WORDS.has(w.toUpperCase()));

    // ── Capture wrapped name text from `after` ────────────────────────────
    // PDF Y-sort places wrapped rows BELOW the date row. In the token stream
    // (top-first), wrapped text appears AFTER the date → in the `after` slice.
    // Grab text after the page range, stopping before the next serial number.
    const afterPageEnd = pm.index + pm[0].length;
    const trailingStr = after.slice(afterPageEnd).trim();
    if (trailingStr) {
      const trailingWords = trailingStr.split(/\s+/);
      // Stop at the next standalone integer (next experiment serial)
      let stopIdx = trailingWords.length;
      for (let w = 0; w < trailingWords.length; w++) {
        if (/^\d{1,3}$/.test(trailingWords[w])) { stopIdx = w; break; }
      }
      const extra = trailingWords
        .slice(0, stopIdx)
        .filter(w => !INDEX_HEADER_WORDS.has(w.toUpperCase()));
      nameParts = [...nameParts, ...extra];
    }

    // Join and fix PDF hyphenation artifacts ("de-\ncision" → "decision")
    const name = nameParts
      .join(' ')
      .replace(/(\w)-\s+(\w)/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim();

    if (name.length < 5) continue;

    markdown += `| ${serial} | ${name.replace(/\|/g, '-')} | [${page}](#jump-page-${pageIndex}) |\n`;
    entries.push({ title: `${serial}. ${name}`, pageIndex });
  }

  const rowCount = (markdown.match(/^\|/gm) || []).length - 2;
  return rowCount > 1 ? { markdown, entries } : null;
}


/**
 * Extractor for standard academic/textbook Table of Contents:
 * "1 Introduction . . . . . . . 4"
 * "1.1 What is XGBoost? . . . . 5"
 *
 * Strategy: group PDF items by Y-line (4px tolerance), then parse each
 * line with: section_num + title + leader_dots + page_num pattern.
 * This avoids the flat-token-stream problem where all entries merge together.
 */
function extractTOCTable(items: any[]): string | null {
  const allText = items.map(i => i.str).join(' ');
  // Must look like a TOC page (dots and section numbers)
  const dotCount = (allText.match(/\.{2,}|(?:\. ){3,}/g) || []).length;
  if (dotCount < 3) return null;

  // Sort items in reading order: Y descending (top first), X ascending within line
  const nonEmpty = items.filter(i => i.str.trim());
  const sorted = [...nonEmpty].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) <= 4) return a.transform[4] - b.transform[4];
    return yDiff;
  });

  // Group into Y-lines
  const yLines: { y: number; text: string }[] = [];
  for (const item of sorted) {
    const y = item.transform[5];
    const s = item.str.trim();
    if (!s) continue;
    const last = yLines[yLines.length - 1];
    if (last && Math.abs(last.y - y) <= 4) {
      last.text += ' ' + s;
    } else {
      yLines.push({ y, text: s });
    }
  }

  // Parse each line as a TOC entry
  // Pattern: optional_section_num + title + dots + page_num
  // Dots can be: ". . . . ." or "......" or mixed
  const SEC_NUM_RE = /^(\d+(?:\.\d+)*)\s+/;
  const PAGE_AT_END_RE = /(\d+)\s*\.?\s*$/;      // page number at end of line after dots
  const DOTS_RE = /(?:\.\s*){3,}|(?:\.{3,})/;    // 3+ dots or '. . . '

  interface TocEntry { num: string; title: string; page: number; isHeader: boolean }
  const entries: TocEntry[] = [];

  for (const { text } of yLines) {
    const t = text.trim();
    if (!t || t.length < 3) continue;

    // Section/Part headers like "PART I: XGBOOST"
    if (/^(PART|CHAPTER|UNIT|SECTION)\s+/i.test(t) && !DOTS_RE.test(t)) {
      entries.push({ num: '', title: t, page: 0, isHeader: true });
      continue;
    }

    // Check if this line has leader dots (it's a TOC entry)
    if (!DOTS_RE.test(t)) continue;

    // Split on dots: left side = number + title, right side = page
    const dotIdx = t.search(DOTS_RE);
    const leftPart = t.slice(0, dotIdx).trim();
    const rightPart = t.slice(dotIdx).replace(DOTS_RE, ' ').trim();

    // Page number: last number in the rightPart
    const pgMatch = rightPart.match(/(\d+)\s*$/) || leftPart.match(/(\d+)\s*$/);
    if (!pgMatch) continue;
    const page = parseInt(pgMatch[1], 10);
    if (page <= 0 || page > 9999) continue;

    // Section number: leading "1" or "1.1" or "1.1.1"
    const numMatch = leftPart.match(SEC_NUM_RE);
    const num = numMatch ? numMatch[1] : '';
    const titleRaw = numMatch ? leftPart.slice(numMatch[0].length) : leftPart;
    const title = titleRaw.replace(/\.+\s*$/, '').replace(/(\d+)\s*$/, '').trim();

    if (title.length < 2) continue;
    entries.push({ num, title, page, isHeader: false });
  }

  const dataRows = entries.filter(e => !e.isHeader);
  if (dataRows.length < 2) return null;

  let markdown = '| # | Section | Page |\n|:---|:---|:---:|\n';
  for (const e of entries) {
    if (e.isHeader) {
      markdown += `| | **${e.title.replace(/\|/g, '-')}** | |\n`;
    } else {
      markdown += `| ${e.num} | ${e.title.replace(/\|/g, '-')} | [${e.page}](#jump-page-${e.page}) |\n`;
    }
  }
  return markdown;
}

/**
 * Extractor for simple chapter indexes:
 * CHAPTER TITLE PAGE NO.
 * 1 Modernism And Rationality 7
 */
function extractChapterIndexTable(items: any[]): { markdown: string; entries: { title: string; pageIndex: number }[] } | null {
  const allText = items.map(i => i.str).join(' ').toUpperCase();
  if (!allText.includes('CHAPTER') || !allText.includes('TITLE') || !allText.includes('PAGE NO')) return null;

  const nonEmpty = items.filter(i => i.str.trim());
  const sorted = [...nonEmpty].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) <= 5) return a.transform[4] - b.transform[4];
    return yDiff;
  });

  const stream = sorted.map(i => i.str.trim()).filter(s => s).join(' ');
  
  const headerMatch = stream.match(/CHAPTER\s+TITLE\s+PAGE\s*NO\.?/i);
  if (!headerMatch) return null;
  
  const contentStream = stream.slice(headerMatch.index! + headerMatch[0].length).trim();
  
  const regex = /\b(\d+)\s+([^\d]+?)\s+(\d+)(?=\s+\d+\s+[^\d]|$)/g;
  let match;
  let markdown = '| # | Title | Page |\n|:---:|---|:---:|\n';
  const entries: { title: string; pageIndex: number }[] = [];
  let rowCount = 0;
  
  while ((match = regex.exec(contentStream)) !== null) {
    const chapNum = match[1];
    const title = match[2].trim().replace(/\|/g, '-');
    const pageNum = parseInt(match[3], 10);
    
    markdown += `| ${chapNum} | ${title} | [${pageNum}](#jump-page-${pageNum}) |\n`;
    entries.push({ title: `${chapNum}. ${title}`, pageIndex: pageNum });
    rowCount++;
  }
  
  if (rowCount < 2) return null;
  return { markdown, entries };
}

export function extractTablesFromItems(items: any[], viewportHeight: number) {
  // ── Fast path: index/contents table (lab-manual style) ──────────────────
  const indexResult = extractIndexTable(items);
  if (indexResult) {
    const nonEmpty = items.filter(i => i.str.trim());
    const ys = nonEmpty.map(i => i.transform[5]);
    const maxY = Math.max(...ys);
    const minY = Math.min(...ys);
    return {
      extractedTableBlocks: [{
        type: 'table',
        y: viewportHeight - maxY,
        height: maxY - minY + 20,
        paragraphs: [indexResult.markdown],
      }],
      tableItemsToExclude: new Set<any>(nonEmpty),
      outlineEntries: indexResult.entries,
    };
  }

  // ── Fast path 2: section-number dotted TOC (1, 1.1, 2.3 … page) ──────────
  const tocMarkdown = extractTOCTable(items);
  if (tocMarkdown) {
    const nonEmpty = items.filter(i => i.str.trim());
    const ys = nonEmpty.map(i => i.transform[5]);
    const maxY = Math.max(...ys);
    const minY = Math.min(...ys);
    return {
      extractedTableBlocks: [{
        type: 'table',
        y: viewportHeight - maxY,
        height: maxY - minY + 20,
        paragraphs: [tocMarkdown],
      }],
      tableItemsToExclude: new Set<any>(nonEmpty),
      outlineEntries: [] as { title: string; pageIndex: number }[],
    };
  }

  // ── Fast path 3: Simple Chapter Index ──────────
  const chapterIndexResult = extractChapterIndexTable(items);
  if (chapterIndexResult) {
    const nonEmpty = items.filter(i => i.str.trim());
    const ys = nonEmpty.map(i => i.transform[5]);
    const maxY = Math.max(...ys);
    const minY = Math.min(...ys);
    return {
      extractedTableBlocks: [{
        type: 'table',
        y: viewportHeight - maxY,
        height: maxY - minY + 20,
        paragraphs: [chapterIndexResult.markdown],
      }],
      tableItemsToExclude: new Set<any>(nonEmpty),
      outlineEntries: chapterIndexResult.entries,
    };
  }

  return { 
    extractedTableBlocks: [], 
    tableItemsToExclude: new Set<any>(),
    outlineEntries: [] as { title: string; pageIndex: number }[]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Outline extractor — CSV / token-stream pattern approach
//
// Row grammar (for lab-manual style index):
//   <SERIAL>  <NAME...>  <DATE DD-MM-YY>  <PAGE_RANGE X–Y>  [repeat]
//
// We use the DATE token as a reliable anchor to split the stream into segments,
// then walk backward for the serial + name, forward for the page range.
// No X/Y coordinate math — purely pattern-based.
// ─────────────────────────────────────────────────────────────────────────────

export async function extractCustomOutline(pdfDoc: any): Promise<any[]> {
  const outline: any[] = [];
  const maxPages = Math.min(20, pdfDoc.numPages);

  const DOTS_RE = /(?:\.\s*){3,}|(?:\.{3,})/;
  const SEC_NUM_RE = /^(\d+(?:\.\d+)*)\s+/;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    const rawText = items.map((t: any) => t.str).join(' ');
    const rawUpper = rawText.toUpperCase();

    // ── Strategy A: Lab-manual date-anchor format (only on INDEX/CONTENTS pages) ──
    if (rawUpper.includes('INDEX') || rawUpper.includes('CONTENTS')) {
      const tokenStream = [...items]
        .sort((a, b) => {
          const yA = a.transform[5], yB = b.transform[5];
          if (Math.abs(yA - yB) <= 5) return a.transform[4] - b.transform[4];
          return yB - yA;
        })
        .map((item: any) => item.str.trim())
        .filter(s => s.length > 0)
        .join(' ');

      const DATE_RE = /\b(\d{2}-\d{2}-\d{2,4})\b/g;
      const PAGE_RE = /\b(\d+)\s*[–\-]\s*(\d+)\b/;
      const HEADER_WORDS = new Set([
        'S.NO', 'SNO', 'EXPERIMENT', 'NAME', 'DATE', 'PAGE', 'NO.', 'NO',
        'REMARKS', 'INDEX', 'CONTENTS', 'S', 'TABLE', 'OF',
      ]);

      const allDates: Array<{ index: number; str: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = DATE_RE.exec(tokenStream)) !== null) {
        allDates.push({ index: m.index, str: m[1] });
      }

      if (allDates.length > 0) {
        let lastEnd = 0;
        for (let d = 0; d < allDates.length; d++) {
          const { index, str: dateStr } = allDates[d];
          const before = tokenStream.slice(lastEnd, index).trim();
          const afterEnd = d + 1 < allDates.length ? allDates[d + 1].index : tokenStream.length;
          const after = tokenStream.slice(index + dateStr.length, afterEnd).trim();
          lastEnd = index + dateStr.length;

          const pageMatch = PAGE_RE.exec(after);
          if (!pageMatch) continue;
          const pageIndex = parseInt(pageMatch[1], 10);
          if (pageIndex <= 0 || pageIndex > pdfDoc.numPages) continue;

          const beforeWords = before.split(/\s+/);
          let serialIdx = -1;
          for (let w = beforeWords.length - 1; w >= 0; w--) {
            if (/^\d{1,3}$/.test(beforeWords[w])) { serialIdx = w; break; }
          }
          if (serialIdx === -1) continue;

          const serial = beforeWords[serialIdx];
          const rawName = beforeWords.slice(serialIdx + 1).join(' ');
          const cleanName = rawName.split(/\s+/)
            .filter(w => !HEADER_WORDS.has(w.toUpperCase()))
            .join(' ').trim();
          if (cleanName.length < 5) continue;

          outline.push({ title: `${serial}. ${cleanName}`, pageIndex, depth: 0 });
        }
        if (outline.length > 0) break;
      }
    }

    // ── Strategy B: Dotted TOC — runs on EVERY page regardless of heading text ──
    // extractTOCTable succeeds for this page type (it has ≥3 dot sequences).
    // extractCustomOutline must use the same gate condition.
    const dotCount = (rawText.match(/\.{2,}|(?:\. ){3,}/g) || []).length;
    if (dotCount < 3) continue; // not a TOC-style page

    const tocSorted = [...items]
      .filter((t: any) => t.str?.trim())
      .sort((a: any, b: any) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) <= 4) return a.transform[4] - b.transform[4];
        return yDiff;
      });

    const yLines: { y: number; text: string }[] = [];
    for (const item of tocSorted) {
      const y = (item as any).transform[5];
      const s = (item as any).str.trim();
      if (!s) continue;
      const last = yLines[yLines.length - 1];
      if (last && Math.abs(last.y - y) <= 4) {
        last.text += ' ' + s;
      } else {
        yLines.push({ y, text: s });
      }
    }

    for (const { text } of yLines) {
      const t = text.trim();
      if (!t || !DOTS_RE.test(t)) continue;

      const dotIdx = t.search(DOTS_RE);
      const leftPart = t.slice(0, dotIdx).trim();
      const rightPart = t.slice(dotIdx).replace(DOTS_RE, ' ').trim();

      const pgMatch = rightPart.match(/(\d+)\s*$/) || leftPart.match(/(\d+)\s*$/);
      if (!pgMatch) continue;
      const pg = parseInt(pgMatch[1], 10);
      if (pg <= 0 || pg > pdfDoc.numPages) continue;

      const numMatch = leftPart.match(SEC_NUM_RE);
      const num = numMatch ? numMatch[1] : '';
      const titleRaw = numMatch ? leftPart.slice(numMatch[0].length) : leftPart;
      const title = (num ? `${num} ${titleRaw}` : titleRaw)
        .replace(/\.+\s*$/, '').replace(/(\d+)\s*$/, '').trim();
      if (title.length < 2) continue;

      const depth = num ? (num.split('.').length - 1) : 0;
      outline.push({ title, pageIndex: pg, depth, num });
    }

    if (outline.length > 0) break;
  }

  return outline;
}


