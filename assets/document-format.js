function removeInlineMarkdown(value = "") {
  return String(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([#*_|`>~-])/g, "$1")
    .trim();
}

function splitTableRow(line) {
  return String(line).trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => removeInlineMarkdown(cell.trim()));
}

function isSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

export function parseDocumentBlocks(markdown = "") {
  const lines = String(markdown).replace(/\r\n?/g, "\n").replace(/^```(?:markdown|text)?\s*$/gim, "").replace(/^```\s*$/gim, "").split("\n");
  const blocks = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = removeInlineMarkdown(paragraph.join(" ").replace(/\s+/g, " "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim();
    if (!raw) { flushParagraph(); continue; }
    const heading = raw.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: Math.min(heading[1].length, 4), text: removeInlineMarkdown(heading[2]) });
      continue;
    }
    if (/^(---+|___+|\*\*\*+)$/.test(raw)) {
      flushParagraph();
      blocks.push({ type: "divider" });
      continue;
    }
    if (raw.includes("|") && lines[index + 1] && isSeparator(lines[index + 1])) {
      flushParagraph();
      const rows = [splitTableRow(raw)];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1).filter((row) => row.some(Boolean)) });
      continue;
    }
    const list = raw.match(/^\s*(?:[-*+]\s+|(\d+)[.)]\s+)(.+)$/);
    if (list) {
      flushParagraph();
      blocks.push({ type: "list", ordered: Boolean(list[1]), text: removeInlineMarkdown(list[2]) });
      continue;
    }
    const quote = raw.match(/^>\s*(.+)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ type: "quote", text: removeInlineMarkdown(quote[1]) });
      continue;
    }
    paragraph.push(raw);
  }
  flushParagraph();
  return blocks;
}

export function cleanDocumentText(markdown = "") {
  return parseDocumentBlocks(markdown).map((block) => {
    if (block.type === "table") return [block.headers, ...block.rows].map((row) => row.join(" | ")).join("\n");
    if (block.type === "divider") return "";
    return block.text || "";
  }).filter(Boolean).join("\n\n");
}

export function documentStatistics(markdown = "") {
  const blocks = parseDocumentBlocks(markdown);
  return {
    characters: cleanDocumentText(markdown).length,
    headings: blocks.filter((block) => block.type === "heading").length,
    tables: blocks.filter((block) => block.type === "table").length,
    placeholders: (String(markdown).match(/\[(?:PERLU|WAJIB)\s+(?:DIKONFIRMASI|DILENGKAPI)[^\]]*\]/gi) || []).length,
  };
}
