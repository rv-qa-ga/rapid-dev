/**
 * Shared Markdown → Confluence "storage" format converter.
 *
 * Used by Lloyd's docs upload scripts (test strategy, QA progress) and safe to
 * reuse for any similar "markdown source of truth → Confluence sub-page" flow.
 *
 * Supports:
 *  - Headings h1..h3
 *  - Horizontal rule (`---`)
 *  - Unordered lists (`-` / `*`)
 *  - Ordered lists (`1.` / `2.` …)
 *  - Blockquotes (single-line `> ...`)
 *  - Fenced code blocks (rendered as Confluence `code` macro)
 *  - Tables (GFM pipe-tables)
 *  - Inline: **bold**, `code`, *italic*, [text](href)
 *
 * Does NOT render Mermaid or inline HTML. Callers that need Mermaid→SVG
 * should strip mermaid fences out before calling `markdownToConfluenceStorage`
 * and substitute placeholders with Confluence attachment macros afterwards
 * (see `upload-lloyds-qa-progress-to-confluence.ts` for the Kroki pattern).
 */

/**
 * Escape a URL/href so it is safe to drop into an HTML attribute.
 */
function escapeHref(href: string): string {
  return href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Convert the markdown inline tokens we care about.
 *
 * Order matters: links are converted first so that backtick-wrapped labels
 * inside a link (e.g. `[`SKILL.md`](./SKILL.md)`) survive and then become
 * `<a href="…"><code>SKILL.md</code></a>` after the code pass.
 */
export function convertInlineFormatting(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
      return `<a href="${escapeHref(href.trim())}">${label}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
}

/**
 * Parse a block of GFM-pipe-table lines into a Confluence `confluenceTable`.
 */
export function parseMarkdownTable(lines: string[], tableClass = 'wrapped confluenceTable'): string {
  if (lines.length < 2) return '';

  const rows: string[][] = [];
  let headerRow: string[] = [];
  let isFirstRow = true;

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

      if (cells.every((cell) => /^:?-+:?$/.test(cell))) {
        continue;
      }

      if (isFirstRow && cells.length > 0) {
        headerRow = cells;
        isFirstRow = false;
      } else if (cells.length > 0) {
        rows.push(cells);
      }
    }
  }

  if (headerRow.length === 0) return '';

  const colCount = headerRow.length;
  const colgroup = Array(colCount)
    .fill(0)
    .map(() => '<col />')
    .join('');

  const headerCells = headerRow
    .map((cell) => `<th>${convertInlineFormatting(cell)}</th>`)
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<td>${convertInlineFormatting(cell)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('\n');

  const cls = tableClass || 'wrapped confluenceTable';
  return `<table class="${cls}"><colgroup>${colgroup}</colgroup><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s: string): string {
  return escapeHtmlText(s).replace(/'/g, '&#39;');
}

export type MarkdownHtmlTarget = 'confluence' | 'browser-preview';

/**
 * Wrap a fenced code block into a Confluence `code` structured macro.
 */
export function codeBlockToMacro(lang: string, code: string): string {
  const safe = code.trim().replace(/]]>/g, ']]]]><![CDATA[>');
  const language = lang || 'text';
  return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${language}</ac:parameter>
  <ac:plain-text-body><![CDATA[${safe}]]></ac:plain-text-body>
</ac:structured-macro>`;
}

/**
 * Convert markdown to HTML — either Confluence storage (macros, confluenceTable)
 * or a browser preview (Mermaid in `<div class="mermaid">`, plain `<pre><code>`).
 */
export function markdownToHtml(markdown: string, target: MarkdownHtmlTarget): string {
  const tableClass = target === 'confluence' ? 'wrapped confluenceTable' : 'preview-table';
  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;
  let inList = false;
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let quoteParas: string[] = [];
  let inQuote = false;

  const closeListIfOpen = () => {
    if (!inList) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    output.push(`<${tag}>${listItems.join('\n')}</${tag}>`);
    listItems = [];
    inList = false;
    listType = null;
  };

  const closeQuoteIfOpen = () => {
    if (!inQuote) return;
    const body = quoteParas.filter((p) => p.length > 0).map((p) => `<p>${p}</p>`).join('\n');
    output.push(`<blockquote>${body}</blockquote>`);
    quoteParas = [];
    inQuote = false;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const code = codeBlockContent.join('\n');
        if (target === 'confluence') {
          output.push(codeBlockToMacro(codeBlockLang, code));
        } else if (codeBlockLang.trim().toLowerCase() === 'mermaid') {
          output.push(`<div class="mermaid">${code}</div>`);
        } else {
          const lang = escapeHtmlAttr(codeBlockLang.trim() || 'text');
          output.push(`<pre><code class="language-${lang}">${escapeHtmlText(code)}</code></pre>`);
        }
        codeBlockContent = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        closeListIfOpen();
        closeQuoteIfOpen();
        codeBlockLang = trimmed.substring(3).trim();
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      i++;
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        closeListIfOpen();
        closeQuoteIfOpen();
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
      i++;
      continue;
    } else if (inTable) {
      const tableHtml = parseMarkdownTable(tableLines, tableClass);
      if (tableHtml) output.push(tableHtml);
      tableLines = [];
      inTable = false;
    }

    if (trimmed.startsWith('### ')) {
      closeListIfOpen();
      closeQuoteIfOpen();
      output.push(`<h3>${convertInlineFormatting(trimmed.substring(4))}</h3>`);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      closeListIfOpen();
      closeQuoteIfOpen();
      output.push(`<h2>${convertInlineFormatting(trimmed.substring(3))}</h2>`);
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      closeListIfOpen();
      closeQuoteIfOpen();
      output.push(`<h1>${convertInlineFormatting(trimmed.substring(2))}</h1>`);
      i++;
      continue;
    }

    if (trimmed === '---' || /^[-]{3,}$/.test(trimmed)) {
      closeListIfOpen();
      closeQuoteIfOpen();
      output.push('<hr />');
      i++;
      continue;
    }

    if (trimmed.startsWith('>')) {
      closeListIfOpen();
      const inner = convertInlineFormatting(trimmed.replace(/^>\s?/, '').trim());
      if (!inQuote) {
        inQuote = true;
        quoteParas = [];
      }
      // Blank blockquote line (`>` alone) → paragraph break inside the same <blockquote>.
      quoteParas.push(inner);
      i++;
      continue;
    }

    // Any non-blockquote, non-blank line closes the open blockquote if we are in one.
    if (inQuote && trimmed.length > 0) {
      closeQuoteIfOpen();
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const nextType: 'ul' | 'ol' = ulMatch ? 'ul' : 'ol';
      const raw = (ulMatch ? ulMatch[1] : olMatch![1]) ?? '';
      const content = convertInlineFormatting(raw);
      if (!inList || listType !== nextType) {
        closeListIfOpen();
        listType = nextType;
        inList = true;
      }
      listItems.push(`<li>${content}</li>`);
      i++;
      continue;
    }

    if (inList && trimmed.length > 0) {
      closeListIfOpen();
    }

    if (trimmed.length > 0) {
      output.push(`<p>${convertInlineFormatting(trimmed)}</p>`);
    } else {
      output.push('');
    }

    i++;
  }

  closeListIfOpen();
  closeQuoteIfOpen();
  if (inTable && tableLines.length > 0) {
    const tableHtml = parseMarkdownTable(tableLines, tableClass);
    if (tableHtml) output.push(tableHtml);
  }
  if (inCodeBlock) {
    const code = codeBlockContent.join('\n');
    if (target === 'confluence') {
      output.push(codeBlockToMacro(codeBlockLang, code));
    } else if (codeBlockLang.trim().toLowerCase() === 'mermaid') {
      output.push(`<div class="mermaid">${code}</div>`);
    } else {
      const lang = escapeHtmlAttr(codeBlockLang.trim() || 'text');
      output.push(`<pre><code class="language-${lang}">${escapeHtmlText(code)}</code></pre>`);
    }
  }

  return output.join('\n');
}

/** Confluence storage-format HTML (existing behaviour). */
export function markdownToConfluenceStorage(markdown: string): string {
  return markdownToHtml(markdown, 'confluence');
}

/** Browser-local preview: Mermaid as raw source in `<div class="mermaid">` (load mermaid.js in the page). */
export function markdownToBrowserPreviewHtml(markdown: string): string {
  return markdownToHtml(markdown, 'browser-preview');
}
