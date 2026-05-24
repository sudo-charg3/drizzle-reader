// ─────────────────────────────────────────────────────────────────────────────
// Table extraction from PDF items (for in-page table rendering)
// ─────────────────────────────────────────────────────────────────────────────

const INDEX_HEADER_WORDS = new Set([
  'S.NO', 'SNO', 'EXPERIMENT', 'NAME', 'DATE', 'PAGE', 'NO.', 'NO',
  'REMARKS', 'INDEX', 'CONTENTS', 'S', 'TABLE', 'OF',
]);

/**
 * Special extractor for lab-manual index tables:
 * S.NO | EXPERIMENT NAME | DATE | PAGE NO | REMARKS
 *
 * Uses DATE (DD-MM-YY) tokens as row anchors — no coordinate math.
 * Returns a compact 3-column markdown table: No | Experiment | Page
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

  let markdown = '| # | Experiment | Pages |\n|:---:|---|:---:|\n';
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
  return rowCount > 0 ? { markdown, entries } : null;
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

  // Skip pure-whitespace items — they are column spacers in the original PDF
  // and merging them causes columns to collapse into one blob
  const nonSpace = items.filter(item => item.str.trim().length > 0);
  const sorted = [...nonSpace].sort((a, b) => b.transform[5] - a.transform[5]);

  // Group items into lines by Y coordinate
  let lines: any[][] = [];
  let currentLine: any[] = [];
  let currentY: number | null = null;

  for (const item of sorted) {
    if (currentY === null || Math.abs(currentY - item.transform[5]) <= 5) {
      currentLine.push(item);
      if (currentY === null) currentY = item.transform[5];
    } else {
      lines.push(currentLine);
      currentLine = [item];
      currentY = item.transform[5];
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Sort each line by X and merge very-close items
  for (let i = 0; i < lines.length; i++) {
    lines[i].sort((a, b) => a.transform[4] - b.transform[4]);
    const merged: any[] = [];
    let cur: any = null;
    for (const item of lines[i]) {
      if (!cur) {
        cur = { ...item };
      } else if (item.transform[4] - (cur.transform[4] + cur.width) < 8) {
        cur.str += ' ' + item.str;
        cur.width = (item.transform[4] + item.width) - cur.transform[4];
      } else {
        merged.push(cur);
        cur = { ...item };
      }
    }
    if (cur) merged.push(cur);
    lines[i] = merged;
  }

  const getColumns = (line: any[]) => line.map(cell => cell.transform[4]);

  let tables: any[][][] = [];
  let currentTable: any[][] = [];
  let tableColumns: number[] = [];
  let lastY = 0;

  for (const line of lines) {
    if (line.length === 0) continue;
    const y = line[0].transform[5];
    const isDense = line.length >= 3;

    if (currentTable.length === 0) {
      if (isDense) {
        currentTable.push(line);
        tableColumns = getColumns(line);
        lastY = y;
      }
    } else {
      const yGap = Math.abs(lastY - y);
      if (yGap > 40) {
        if (currentTable.length >= 3) tables.push([...currentTable]);
        currentTable = [];
        if (isDense) {
          currentTable.push(line);
          tableColumns = getColumns(line);
          lastY = y;
        }
        continue;
      }

      let alignedItems = 0;
      for (const cell of line) {
        if (tableColumns.some(colX => Math.abs(colX - cell.transform[4]) < 30)) alignedItems++;
      }
      const isAligned = alignedItems >= Math.max(1, line.length - 1);

      if (isAligned || isDense) {
        currentTable.push(line);
        for (const cell of line) {
          if (!tableColumns.some(colX => Math.abs(colX - cell.transform[4]) < 30)) {
            tableColumns.push(cell.transform[4]);
          }
        }
        tableColumns.sort((a, b) => a - b);
        lastY = y;
      } else {
        if (currentTable.length >= 3) tables.push([...currentTable]);
        currentTable = [];
        if (isDense) {
          currentTable.push(line);
          tableColumns = getColumns(line);
          lastY = y;
        }
      }
    }
  }
  if (currentTable.length >= 3) tables.push(currentTable);

  const extractedTableBlocks: any[] = [];
  const tableItemsToExclude = new Set<any>();

  for (const t of tables) {
    const allX: number[] = [];
    for (const row of t) for (const cell of row) allX.push(cell.transform[4]);
    allX.sort((a, b) => a - b);

    const columns: number[] = [];
    let curCol: number[] = [];
    for (const x of allX) {
      if (curCol.length === 0 || Math.abs(x - curCol[curCol.length - 1]) < 30) {
        curCol.push(x);
      } else {
        columns.push(curCol.reduce((a, b) => a + b, 0) / curCol.length);
        curCol = [x];
      }
    }
    if (curCol.length > 0) columns.push(curCol.reduce((a, b) => a + b, 0) / curCol.length);

    let logicalRows: any[][] = [];
    let currentRowMap = new Map<number, any>();

    const pushLogicalRow = () => {
      if (currentRowMap.size > 0) {
        logicalRows.push(columns.map((_, c) => currentRowMap.get(c) || { str: '' }));
        currentRowMap = new Map();
      }
    };

    // Build column boundaries: midpoint between each adjacent column X
    // An item belongs to column C if its X is between boundary[C-1] and boundary[C]
    const colBoundaries: number[] = [];
    for (let c = 0; c < columns.length - 1; c++) {
      colBoundaries.push((columns[c] + columns[c + 1]) / 2);
    }
    const assignToCol = (x: number): number => {
      for (let c = 0; c < colBoundaries.length; c++) {
        if (x < colBoundaries[c]) return c;
      }
      return columns.length - 1;
    };

    for (const line of t) {
      const occupiedCols = new Map<number, any>();
      for (const cell of line) {
        const colIdx = assignToCol(cell.transform[4]);
        if (occupiedCols.has(colIdx)) {
          occupiedCols.get(colIdx).str += ' ' + cell.str;
        } else {
          occupiedCols.set(colIdx, { ...cell });
        }
      }
      // Only start a NEW logical row when column 0 (serial/S.NO) is occupied.
      // Wrapped name lines only have column 1+ → they should append to current row.
      if (occupiedCols.has(0) && currentRowMap.size > 0) pushLogicalRow();
      for (const [c, cell] of Array.from(occupiedCols.entries())) {
        if (currentRowMap.has(c)) currentRowMap.get(c).str += ' ' + cell.str;
        else currentRowMap.set(c, { ...cell });
      }
    }
    pushLogicalRow();

    if (logicalRows.length < 2) continue;

    // Identify column roles by header text
    const headerRow = logicalRows[0];
    let colNo = 0, colName = 1, colPage = columns.length - 2;
    for (let c = 0; c < headerRow.length; c++) {
      const h = (headerRow[c]?.str || '').toUpperCase().trim();
      // Match serial col: "S.NO", "SNO", "S NO", "#" — but NOT "PAGE NO."
      if (/^S[\s.]?NO\.?$/.test(h) || h === '#') colNo = c;
      // Match name col
      if (h.includes('NAME') || h.includes('EXPERIMENT') || h.includes('TITLE') || h.includes('TOPIC') || h.includes('DESCRIPTION')) colName = c;
      // Match page col: must contain PAGE but not be confused with name
      if ((h.includes('PAGE') || h === 'P.NO' || h === 'PG') && !h.includes('NAME')) colPage = c;
    }

    // Build compact 3-col markdown: No. | Experiment | Page
    let markdown = `| No. | Experiment | Page |\n|---|---|---|\n`;
    for (let i = 1; i < logicalRows.length; i++) {
      const row = logicalRows[i];
      const no   = (row[colNo]?.str   || '').trim().replace(/\|/g, '-');
      const name = (row[colName]?.str  || '').trim().replace(/\|/g, '-');
      const page = (row[colPage]?.str  || '').trim().replace(/\|/g, '-');
      if (!no && !name) continue;
      markdown += `| ${no} | ${name} | ${page} |\n`;
    }

    const firstRowY = t[0][0].transform[5];
    const lastRowY  = t[t.length - 1][0].transform[5];
    extractedTableBlocks.push({
      type: 'table',
      y: viewportHeight - firstRowY,
      height: Math.abs(firstRowY - lastRowY) + 30,
      paragraphs: [markdown],
    });

    for (const row of t) {
      for (const mergedCell of row) {
        for (const originalItem of items) {
          if (
            Math.abs(originalItem.transform[5] - mergedCell.transform[5]) <= 5 &&
            originalItem.transform[4] >= mergedCell.transform[4] - 5 &&
            originalItem.transform[4] <= mergedCell.transform[4] + mergedCell.width + 5
          ) {
            tableItemsToExclude.add(originalItem);
          }
        }
      }
    }
  }

  return { extractedTableBlocks, tableItemsToExclude };
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


