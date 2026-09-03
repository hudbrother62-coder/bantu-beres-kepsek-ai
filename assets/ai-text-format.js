function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineText(value = "") {
  let text = escapeHtml(String(value).trim());

  // Keep links readable without allowing model-generated HTML or unsafe href values.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 <span class=\"assistant-link-text\">($2)</span>");

  // Render well-formed emphasis, then remove any unmatched model markers.
  text = text.replace(/(?:\*\*|__)(.+?)(?:\*\*|__)/g, "<strong>$1</strong>");
  text = text.replace(/~~(.+?)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/(^|[\s([{])(?:\*{1,3}|_{1,3}|`{1,3})(?=\S)/g, "$1");
  text = text.replace(/(\S)(?:\*{1,3}|_{1,3}|`{1,3})(?=$|[\s)\]},.!?:;])/g, "$1");
  text = text.replace(/\\([#*_|`>~-])/g, "$1");

  return text;
}

function splitTableRow(line = "") {
  return String(line).trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => inlineText(cell));
}

function isTableSeparator(line = "") {
  const cells = String(line).trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
  return cells.length > 1 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function normalizeLines(value = "") {
  return String(value)
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*```(?:markdown|md|text|plaintext)?\s*$/gim, "")
    .replace(/^\s*```\s*$/gim, "")
    .split("\n");
}

export function containsVisibleAiMarkup(value = "") {
  return /(^|\n)\s{0,3}(?:#{1,6}\s|[*+]\s|```)|\*\*|__|~~|`[^`]+`/.test(String(value));
}

export function renderAiText(value = "") {
  const lines = normalizeLines(value);
  const html = [];
  let paragraph = [];
  let listType = "";

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = "";
  };
  const flushParagraph = () => {
    if (!paragraph.length) return;
    closeList();
    const content = inlineText(paragraph.join(" ").replace(/\s+/g, " "));
    if (content) html.push(`<p>${content}</p>`);
    paragraph = [];
  };
  const pushListItem = (type, content) => {
    flushParagraph();
    if (listType !== type) {
      closeList();
      listType = type;
      html.push(`<${type}>`);
    }
    html.push(`<li>${inlineText(content.replace(/^[\"“”']+|[\"“”']+$/g, ""))}</li>`);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim();
    if (!raw) {
      flushParagraph();
      closeList();
      continue;
    }

    if (raw.includes("|") && lines[index + 1] && isTableSeparator(lines[index + 1])) {
      flushParagraph();
      closeList();
      const headers = splitTableRow(raw);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      html.push(`<div class="assistant-table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    const heading = raw.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h3>${inlineText(heading[1])}</h3>`);
      continue;
    }

    const unordered = raw.match(/^(?:[-*+•▪◦–—])\s+(.+)$/);
    if (unordered) {
      const numberedInside = unordered[1].match(/^(\d+)[.)]\s*(.+)$/);
      pushListItem(numberedInside ? "ol" : "ul", numberedInside ? numberedInside[2] : unordered[1]);
      continue;
    }

    const ordered = raw.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      pushListItem("ol", ordered[1]);
      continue;
    }

    const quote = raw.match(/^>\s*(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineText(quote[1])}</blockquote>`);
      continue;
    }

    if (/^(?:---+|___+|\*\*\*+)$/.test(raw)) {
      flushParagraph();
      closeList();
      continue;
    }

    paragraph.push(raw);
  }

  flushParagraph();
  closeList();
  return html.join("");
}

