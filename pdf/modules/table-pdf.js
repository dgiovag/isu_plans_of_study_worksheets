'use strict';

const L = require('../layout');
const { totalWidth } = require('./row-pdf');

/**
 * Draws a full-width section title bar (red, white text).
 * Used for column headers: "GENERAL EDUCATION", "MAJOR REQUIREMENTS".
 */
function drawSectionTitle(page, x, y, title, colWidth, fonts) {
  const H = L.SECTION_HDR_H;
  page.drawRectangle({ x, y: y - H, width: colWidth, height: H, color: L.RED });
  page.drawText(title.toUpperCase(), {
    x: x + 5, y: y - H + 5,
    size: L.FONT.sectionTitle, font: fonts.bold, color: L.WHITE,
  });
  return y - H;
}

/**
 * Draws a group title bar (dark gray, white text).
 * Used above each fill group.
 */
function drawGroupTitle(page, x, y, title, colWidth, fonts) {
  const H = L.GROUP_TITLE_H;
  page.drawRectangle({ x, y: y - H, width: colWidth, height: H, color: L.GRAY_TEXT });
  page.drawText(title, {
    x: x + 4, y: y - H + 4,
    size: L.FONT.groupTitle, font: fonts.bold, color: L.WHITE,
  });
  return y - H;
}

/**
 * Draws the table column headers row.
 */
function drawTableHeaders(page, x, y, widths, fonts) {
  const H = L.TABLE_HDR_H;
  const colW = totalWidth(widths);

  page.drawRectangle({ x, y: y - H, width: colW, height: H, color: L.GRAY_BG });

  const textY = y - H + 3;
  const headers = [
    { label: 'Requirement', x: x + widths.check + 2 },
    { label: 'Course',      x: x + widths.check + widths.req },
    { label: 'Gr',          x: x + widths.check + widths.req + widths.course },
    { label: 'Term',        x: x + widths.check + widths.req + widths.course + widths.grade },
  ];
  for (const h of headers) {
    page.drawText(h.label, { x: h.x, y: textY, size: L.FONT.tableHeader, font: fonts.bold, color: L.BLACK });
  }

  // Top border
  page.drawLine({
    start: { x, y }, end: { x: x + colW, y },
    thickness: 0.4, color: L.GRAY_BORDER,
  });

  return y - H;
}

/**
 * Draws a small note line below a group (e.g. constraints, guidance).
 */
function drawNote(page, x, y, text, colWidth, fonts) {
  const lines = wrapText(fonts.reg, text, L.FONT.footnote, colWidth - 8);
  for (const line of lines) {
    page.drawText(line, { x: x + 4, y: y - 8, size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT });
    y -= 8;
  }
  return y - 2;
}

// Naive word-wrap: splits text into lines that fit within maxWidth at size.
function wrapText(font, text, size, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

module.exports = { drawSectionTitle, drawGroupTitle, drawTableHeaders, drawNote, wrapText };
