"use client";

import { useEffect, useRef, memo } from "react";

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Detect whether a string looks like it contains LaTeX math, Markdown table
 * syntax, Mermaid diagram blocks, or Markdown structural syntax.
 */
const classifyParagraph = (text: string): "mermaid" | "table" | "markdown" | "latex" | "plain" => {
  const t = text.trim();

  // Mermaid fenced blocks
  if (/^```mermaid/i.test(t) || /^```\s*(graph|sequenceDiagram|flowchart|classDiagram|gantt|pie|gitGraph|erDiagram|journey|stateDiagram)/im.test(t)) {
    return "mermaid";
  }

  // Bare mermaid keyword starters (no fences, extracted from PDF)
  if (/^(graph\s+(TD|LR|RL|BT|TB)|flowchart\s+(TD|LR|RL|BT|TB)|sequenceDiagram|classDiagram|stateDiagram|gantt|pie\s+title|erDiagram|gitGraph|journey)/i.test(t)) {
    return "mermaid";
  }

  // Markdown tables – look for pipe characters on multiple lines
  if ((t.match(/\|/g) || []).length >= 4 && t.includes("\n") && /\|[-: ]+\|/.test(t)) {
    return "table";
  }

  // LaTeX display math $$ ... $$ or \[ ... \]
  if (/\$\$[\s\S]+?\$\$/.test(t) || /\\\[[\s\S]+?\\\]/.test(t)) {
    return "latex";
  }

  // Inline math $...$ or \(...\)
  if (/\$[^$\n]+?\$/.test(t) || /\\\([\s\S]+?\\\)/.test(t)) {
    return "latex";
  }

  // LaTeX command patterns without $
  if (/\\(frac|sum|int|prod|sqrt|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|partial|nabla|infty|cdot|times|div|pm|leq|geq|neq|approx|equiv|sim|propto|forall|exists|in|notin|subset|supset|cup|cap|wedge|vee|neg|rightarrow|leftarrow|Rightarrow|Leftrightarrow|vec|hat|bar|tilde|overline|begin|end|matrix|pmatrix|bmatrix|cases|align|lim|log|sin|cos|tan|arcsin|arccos|arctan|exp|ln|det|dim|ker|text|mathbf|mathit|mathrm|mathbb|mathcal|mathscr|boldsymbol)\b/.test(t)) {
    return "latex";
  }

  // Markdown headings / code blocks / bold / lists
  if (/^#{1,6}\s/.test(t) || /^```/.test(t) || /\*\*.+?\*\*/.test(t) || /^(\s*[-*+]\s|\s*\d+\.\s)/.test(t)) {
    return "markdown";
  }

  return "plain";
};

/** Strip optional ``` fences from a mermaid block */
const extractMermaidCode = (text: string): string => {
  return text
    .replace(/^```mermaid\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
};

// ─── Sub-renderers ───────────────────────────────────────────────────────────

/** Inline + display LaTeX renderer using KaTeX */
function LatexParagraph({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    import("katex").then((katexMod) => {
      const katex = katexMod.default;

      // Process the text: replace $$ blocks, \[ blocks, $ blocks, \( blocks
      const container = ref.current!;

      // Build HTML with rendered math
      let result = text;

      // Display math: $$...$$ → <span class="katex-display-block">
      result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula) => {
        try {
          return `<div class="katex-display-wrapper">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false, output: "html" })}</div>`;
        } catch {
          return `<div class="katex-display-wrapper katex-error">${formula}</div>`;
        }
      });

      // Display math: \[...\]
      result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_match, formula) => {
        try {
          return `<div class="katex-display-wrapper">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false, output: "html" })}</div>`;
        } catch {
          return `<div class="katex-display-wrapper katex-error">${formula}</div>`;
        }
      });

      // Inline math: $...$
      result = result.replace(/\$([^$\n]+?)\$/g, (_match, formula) => {
        try {
          return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, output: "html" });
        } catch {
          return `<span class="katex-error">${formula}</span>`;
        }
      });

      // Inline math: \(...\)
      result = result.replace(/\\\(([\s\S]+?)\\\)/g, (_match, formula) => {
        try {
          return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, output: "html" });
        } catch {
          return `<span class="katex-error">${formula}</span>`;
        }
      });

      // Render bare LaTeX commands that appear without delimiters — wrap full line if it looks math-heavy
      // (heuristic: >2 backslash commands in a short string)
      const backslashCount = (text.match(/\\/g) || []).length;
      if (backslashCount > 2 && !text.includes("$") && !text.includes("\\[") && !text.includes("\\(")) {
        try {
          result = `<div class="katex-display-wrapper">${katex.renderToString(text.trim(), { displayMode: true, throwOnError: false, output: "html" })}</div>`;
        } catch {
          // leave result as-is
        }
      }

      container.innerHTML = result;
    });

    // Load KaTeX CSS if not already present
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
  }, [text]);

  return (
    <div
      ref={ref}
      className="katex-paragraph animate-in fade-in slide-in-from-bottom-1 duration-700"
      style={{ marginBottom: "1.5em", lineHeight: "inherit", color: "inherit", fontFamily: "inherit" }}
    />
  );
}

/** Markdown → HTML renderer using `marked`, for tables, headings, code blocks, bold, lists */
function MarkdownParagraph({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import("marked").then(({ marked }) => {
      // Marked v5+ returns string, not a Promise in synchronous mode
      const html = marked.parse(text, { async: false, gfm: true, breaks: true }) as string;
      ref.current!.innerHTML = html;
    });
  }, [text]);

  return (
    <div
      ref={ref}
      className="markdown-paragraph rich-markdown animate-in fade-in slide-in-from-bottom-1 duration-700"
      style={{ 
        marginBottom: "1.5em", 
        lineHeight: "inherit", 
        color: "inherit", 
        fontFamily: "inherit",
        textAlign: "justify",
        hyphens: "auto"
      }}
    />
  );
}

/** Mermaid diagram renderer */
function MermaidBlock({ text, blockId }: { text: string; blockId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const code = extractMermaidCode(text);

    import("mermaid").then((mermaidMod) => {
      const mermaid = mermaidMod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: document.body.classList.contains("dark-theme") ? "dark" : "neutral",
        themeVariables: {
          fontFamily: "var(--font-family, 'DM Sans', sans-serif)",
        },
        securityLevel: "loose",
      });

      const container = ref.current!;
      container.innerHTML = `<div class="mermaid-inner" id="mermaid-${blockId}">${code}</div>`;

      mermaid.run({ nodes: [container.querySelector(`#mermaid-${blockId}`)!] }).catch((err) => {
        console.warn("Mermaid render error", err);
        container.innerHTML = `<pre class="mermaid-error">${code}</pre>`;
      });
    });
  }, [text, blockId]);

  return (
    <div
      ref={ref}
      className="mermaid-block animate-in fade-in slide-in-from-bottom-2 duration-1000"
      style={{
        marginBottom: "1.5em",
        padding: "1.5rem",
        borderRadius: "12px",
        background: "rgba(0,0,0,0.03)",
        border: "1px solid rgba(0,0,0,0.07)",
        overflowX: "auto",
        display: "flex",
        justifyContent: "center",
      }}
    />
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

interface RichTextRendererProps {
  paragraphs: string[];
  pageId: number;
  blockIdx: number;
}

export const RichTextRenderer = memo(function RichTextRenderer({
  paragraphs,
  pageId,
  blockIdx,
}: RichTextRendererProps) {
  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const kind = classifyParagraph(para);
        const key = `rich-${pageId}-${blockIdx}-${pIdx}`;

        if (kind === "mermaid") {
          return <MermaidBlock key={key} text={para} blockId={`${pageId}-${blockIdx}-${pIdx}`} />;
        }

        if (kind === "latex") {
          return <LatexParagraph key={key} text={para} />;
        }

        if (kind === "table" || kind === "markdown") {
          return <MarkdownParagraph key={key} text={para} />;
        }

        // Plain text — same as before
        return <p key={key}>{para}</p>;
      })}
    </>
  );
});

export default RichTextRenderer;
