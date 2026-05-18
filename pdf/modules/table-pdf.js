'use strict';

const L = require('../layout');
const { totalWidth, wrapText } = require('./row-pdf');

const TITLE_LINE_H = L.FONT.sectionTitle + 2.5;
const GROUP_LINE_H = L.FONT.groupTitle + 2;

/**
 * Draws a full-width section title bar (red, white text).
 * Height expands for long titles.
 */
function drawSectionTitle(page, x, y, title, colWidth, fonts) {
  const lines  = wrapText(fonts.bold, title.toUpperCase(), L.FONT.sectionTitle, colWidth - 10);
  const height = Math.max(L.SECTION_HDR_H, lines.length * TITLE_LINE_H + 6);

  page.drawRectangle({ x, y: y - height, width: colWidth, height, color: L.RED });

  for (let i = 0; i < lines.length; i++) {
    page.drawText(lines[i], {
      x: x + 5, y: y - L.FONT.sectionTitle - 3 - i * TITLE_LINE_H,
      size: L.FONT.sectionTitle, font: fonts.bold, color: L.WHITE,
    });
  }

  return y - height;
}

/**
 * Draws a group title bar (dark gray, white text).
 * Height expands for long titles.
 */
function drawGroupTitle(page, x, y, title, colWidth, fonts) {
  const lines  = wrapText(fonts.bold, title, L.FONT.groupTitle, colWidth - 8);
  const height = Math.max(L.GROUP_TITLE_H, lines.length * GROUP_LINE_H + 4);

  page.drawRectangle({ x, y: y - height, width: colWidth, height, color: L.GRAY_TEXT });

  for (let i = 0; i < lines.length; i++) {
    page.drawText(lines[i], {
      x: x + 4, y: y - L.FONT.groupTitle - 2 - i * GROUP_LINE_H,
      size: L.FONT.groupTitle, font: fonts.bold, color: L.WHITE,
    });
  }

  return y - height;
}

/**
 * Draws the table column headers row.
 */
function drawTableHeaders(page, x, y, widths, fonts) {
  const H    = L.TABLE_HDR_H;
  const colW = totalWidth(widths);

  page.drawRectangle({ x, y: y - H, width: colW, height: H, color: L.GRAY_BG });

  const textY = y - H + 3;
  const headers = [
    ...(widths.req > 0 ? [{ label: 'Requirement', x: x + widths.check + 2 }] : []),
    { label: 'Course', x: x + widths.check + widths.req },
    { label: 'Gr',     x: x + widths.check + widths.req + widths.course },
    { label: 'Term',   x: x + widths.check + widths.req + widths.course + widths.grade },
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
 * Draws a small note line below a group (word-wrapped).
 * Returns the y coordinate below the note block.
 */
function drawNote(page, x, y, text, colWidth, fonts) {
  const lines = wrapText(fonts.reg, text, L.FONT.footnote, colWidth - 8);
  for (const line of lines) {
    y -= 8;
    page.drawText(line, { x: x + 4, y, size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT });
  }
  return y - 2;
}

module.exports = { drawSectionTitle, drawGroupTitle, drawTableHeaders, drawNote };
