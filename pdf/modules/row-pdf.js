'use strict';

const L = require('../layout');

const LINE_H = L.FONT.tableBody + 2.5; // vertical step between wrapped label lines

// y at which column content begins on a continuation page (inside top margin)
const CONTINUATION_Y = L.PAGE_HEIGHT - L.MARGIN.top - 16;

/**
 * If `y - neededH` would fall below the bottom margin, adds a new page to
 * ctx.doc, updates ctx.page, and returns the reset y for the new page.
 * Otherwise returns y unchanged.
 */
function breakIfNeeded(ctx, y, neededH, fonts) {
  if (y - neededH >= L.MARGIN.bottom) return y;

  ctx.page = ctx.doc.addPage([L.PAGE_WIDTH, L.PAGE_HEIGHT]);

  ctx.page.drawText('(continued)', {
    x: L.MARGIN.left, y: L.PAGE_HEIGHT - L.MARGIN.top - 8,
    size: 7, font: fonts.reg, color: L.GRAY_TEXT,
  });

  return CONTINUATION_Y;
}

/**
 * Draws one worksheet row (checkbox + label + course/grade/term fields).
 * Triggers a page break automatically when there is not enough room.
 *
 * @param {object}  ctx     { doc, page, form } — ctx.page may be replaced on break
 * @param {number}  x       left edge of column
 * @param {number}  y       top of row (pdf-lib coords: y=0 at bottom)
 * @param {object}  widths  COL_WIDTHS.left or COL_WIDTHS.right
 * @param {string}  rowId   unique AcroForm field name prefix
 * @param {string}  label   text shown in the requirement column
 * @param {object}  fonts   { reg, bold }
 * @param {object}  opts    { exempt, bold }
 * @returns {number}        y coordinate below this row
 */
function makeRow(ctx, x, y, widths, rowId, label, fonts, opts = {}) {
  const colW = totalWidth(widths);

  // Word-wrap the label; row height expands to fit.
  const labelFont  = opts.bold ? fonts.bold : fonts.reg;
  const labelLines = wrapText(labelFont, label, L.FONT.tableBody, widths.req - 3);
  const rowHeight  = Math.max(L.ROW_H, labelLines.length * LINE_H + 3);

  y = breakIfNeeded(ctx, y, rowHeight, fonts);

  const { page, form } = ctx;
  const bot = y - rowHeight;

  if (opts.exempt) {
    page.drawRectangle({ x, y: bot, width: colW, height: rowHeight, color: L.GRAY_BG });
  }

  page.drawLine({
    start: { x, y: bot }, end: { x: x + colW, y: bot },
    thickness: 0.3, color: L.GRAY_BORDER,
  });

  // Checkbox / exempt indicator — vertically centered
  const cbSize = 9;
  const cbY    = bot + (rowHeight - cbSize) / 2;
  if (opts.exempt) {
    page.drawRectangle({ x: x + 1, y: cbY, width: cbSize, height: cbSize, color: L.GRAY_BORDER });
  } else {
    const cb = form.createCheckBox(sanitizeId(rowId) + '_check');
    cb.addToPage(page, {
      x: x + 1, y: cbY, width: cbSize, height: cbSize,
      borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
    });
  }

  // Label lines — omitted when req column is collapsed (widths.req === 0)
  if (widths.req > 0) {
    const labelX = x + widths.check + 2;
    for (let i = 0; i < labelLines.length; i++) {
      page.drawText(labelLines[i], {
        x: labelX, y: y - L.FONT.tableBody - 1.5 - i * LINE_H,
        size: L.FONT.tableBody, font: labelFont,
        color: opts.exempt ? L.GRAY_TEXT : L.BLACK,
      });
    }
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

function wrapText(font, text, size, maxWidth) {
  const words = text.replace(/[\r\n]+/g, ' ').split(' ');
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

function sanitizeId(id) {
  return id.replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function totalWidth(widths) {
  return widths.check + widths.req + widths.course + widths.grade + widths.term;
}

function formatOption(opt, courseMap) {
  if (typeof opt === 'string') {
    const c = courseMap[opt];
    return c ? c.code : opt;
  }
  if (opt && opt.type === 'set') {
    return '(' + (opt.course_ids || []).map(id => {
      const c = courseMap[id]; return c ? c.code : id;
    }).join(' + ') + ')';
  }
  return String(opt);
}

// Returns a copy of widths with the req column collapsed into course.
// Use for open/open_constrained groups where no requirement label is shown.
function noReqWidths(widths) {
  return { ...widths, req: 0, course: widths.course + widths.req };
}

module.exports = { makeRow, breakIfNeeded, wrapText, sanitizeId, totalWidth, formatOption, noReqWidths };
