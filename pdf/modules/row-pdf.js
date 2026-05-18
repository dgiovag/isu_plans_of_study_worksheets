'use strict';

const L = require('../layout');

const LINE_H = L.FONT.tableBody + 2.5; // vertical step between wrapped label lines

/**
 * Draws one worksheet row (checkbox + label + course/grade/term fields).
 * Row height expands automatically when the requirement label wraps.
 *
 * @param {PDFPage}  page
 * @param {PDFForm}  form
 * @param {number}   x       left edge of column
 * @param {number}   y       top of row (pdf-lib coords: y=0 at bottom)
 * @param {object}   widths  COL_WIDTHS.left or COL_WIDTHS.right
 * @param {string}   rowId   unique AcroForm field name prefix
 * @param {string}   label   text shown in the requirement column
 * @param {object}   fonts   { reg, bold }
 * @param {object}   opts    { preChecked, exempt, autoFulfilled }
 * @returns {number}         y coordinate below this row
 */
function makeRow(page, form, x, y, widths, rowId, label, fonts, opts = {}) {
  const colW = totalWidth(widths);

  // Word-wrap the label to fit the req column; row grows to fit.
  const labelLines = wrapText(fonts.reg, label, L.FONT.tableBody, widths.req - 3);
  const rowHeight  = Math.max(L.ROW_H, labelLines.length * LINE_H + 3);
  const bot        = y - rowHeight;

  // Background for exempt rows
  if (opts.exempt) {
    page.drawRectangle({ x, y: bot, width: colW, height: rowHeight, color: L.GRAY_BG });
  }

  // Bottom separator
  page.drawLine({
    start: { x, y: bot }, end: { x: x + colW, y: bot },
    thickness: 0.3, color: L.GRAY_BORDER,
  });

  // Checkbox / exempt indicator — vertically centered
  const cbSize = 9;
  const cbY = bot + (rowHeight - cbSize) / 2;
  if (opts.exempt) {
    page.drawRectangle({ x: x + 1, y: cbY, width: cbSize, height: cbSize, color: L.GRAY_BORDER });
  } else {
    const cb = form.createCheckBox(sanitizeId(rowId) + '_check');
    if (opts.preChecked) cb.check();
    cb.addToPage(page, {
      x: x + 1, y: cbY, width: cbSize, height: cbSize,
      borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  // Label lines — top-aligned within the row
  const labelX = x + widths.check + 2;
  for (let i = 0; i < labelLines.length; i++) {
    page.drawText(labelLines[i], {
      x: labelX, y: y - L.FONT.tableBody - 1.5 - i * LINE_H,
      size: L.FONT.tableBody, font: fonts.reg,
      color: opts.exempt ? L.GRAY_TEXT : L.BLACK,
    });
  }

  // AcroForm fields — vertically centered, fixed height
  if (!opts.exempt) {
    const fieldH  = L.ROW_H - 2;
    const fieldY  = bot + (rowHeight - fieldH) / 2;
    const courseX = x + widths.check + widths.req;

    const tf = form.createTextField(sanitizeId(rowId) + '_course');
    tf.addToPage(page, {
      x: courseX, y: fieldY, width: widths.course - 1, height: fieldH,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });

    const gf = form.createTextField(sanitizeId(rowId) + '_grade');
    gf.addToPage(page, {
      x: courseX + widths.course, y: fieldY, width: widths.grade - 1, height: fieldH,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });

    const tf2 = form.createTextField(sanitizeId(rowId) + '_term');
    tf2.addToPage(page, {
      x: courseX + widths.course + widths.grade, y: fieldY, width: widths.term, height: fieldH,
      borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  return bot;
}

// Word-wraps text into lines that fit within maxWidth at size.
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
  return lines.length ? lines : [''];
}

// Converts a dotted group ID to a safe AcroForm field name prefix.
function sanitizeId(id) {
  return id.replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function totalWidth(widths) {
  return widths.check + widths.req + widths.course + widths.grade + widths.term;
}

module.exports = { makeRow, wrapText, sanitizeId, totalWidth };
