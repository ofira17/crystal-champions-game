export interface QAPair {
  question: string;
  answer: string;
}

// DOCX: mammoth converts to HTML — extract 2-column table rows
export async function extractQAPairsFromDocx(buffer: Buffer): Promise<QAPair[]> {
  const mammoth = await import("mammoth");
  const { value: html } = await mammoth.convertToHtml({ buffer });

  const pairs = parseTableFromHtml(html);
  if (pairs.length > 0) return pairs;

  // Fallback: plain text alternating lines
  const text = html.replace(/<[^>]+>/g, "\n").replace(/&[a-z]+;/gi, " ");
  return extractQAPairsFromText(text);
}

// PDF: pdf-parse gives plain text — parse alternating lines or blank-separated blocks
export async function extractQAPairsFromPdf(buffer: Buffer): Promise<QAPair[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const { text } = await pdfParse(buffer);
  return extractQAPairsFromText(text as string);
}

// ── Parsers ───────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

function parseTableFromHtml(html: string): QAPair[] {
  const pairs: QAPair[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const text = stripTags(cellMatch[1]).trim();
      cells.push(text);
    }

    if (cells.length >= 2) {
      const q = cells[0].trim();
      const a = cells[1].trim();
      // Skip header rows
      if (q && a && !(q === "שאלה" && a === "תשובה") && !(q.toLowerCase() === "question")) {
        pairs.push({ question: q, answer: a });
      }
    }
  }

  return pairs;
}

// Split a single line of the form "<question>? <answer>" into a pair.
// Returns null if the line has no "?" or no text after the first "?".
function splitInlineQA(line: string): QAPair | null {
  const trimmed = line.trim();
  // Support both ASCII "?" and Arabic question mark "؟"
  const match = trimmed.match(/^(.+?[?؟])\s*(.+)$/);
  if (!match) return null;
  const question = match[1].trim();
  const answer = match[2].trim();
  if (!question || !answer) return null;
  return { question, answer };
}

export function extractQAPairsFromText(text: string): QAPair[] {
  const pairs: QAPair[] = [];

  // Strategy 0: each line contains "<question>? <answer>" on a single line
  const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (allLines.length > 0) {
    const inlinePairs: QAPair[] = [];
    let inlineHits = 0;
    for (const line of allLines) {
      const p = splitInlineQA(line);
      if (p) {
        inlinePairs.push(p);
        inlineHits++;
      }
    }
    // Accept this strategy only if a strong majority of lines fit the pattern,
    // so we don't mis-split blank-separated or alternating-line formats.
    if (inlineHits >= 2 && inlineHits / allLines.length >= 0.8) {
      return inlinePairs;
    }
  }

  // Strategy 1: blank-line separated blocks (question\nanswer)
  const blocks = text.split(/\n[ \t]*\n+/).map(b => b.trim()).filter(Boolean);
  if (blocks.length >= 2) {
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        pairs.push({ question: lines[0], answer: lines[1] });
      } else if (lines.length === 1) {
        const inline = splitInlineQA(lines[0]);
        if (inline) pairs.push(inline);
      }
    }
    if (pairs.length > 0) return pairs;
  }

  // Strategy 2: alternating lines (q, a, q, a...)
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = 0; i + 1 < lines.length; i += 2) {
    pairs.push({ question: lines[i], answer: lines[i + 1] });
  }

  return pairs;
}
