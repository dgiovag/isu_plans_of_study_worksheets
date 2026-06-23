'use strict';

const L = require('../layout');
const { breakIfNeeded, sanitizeId, wrapText } = require('./row-pdf');
const { drawSectionTitle } = require('./table-pdf');

const CHECK_W      = 10;
const NOTE_MIN_WIDTH = 400; // notes only shown in wide (full-width) mode
const TITLE_W      = 270;  // space reserved for title before the note column

// Maps graduation_requirements trackable item IDs → course graduation_flags keys.
const GRAD_ITEM_FLAG = {
  amali:            'amali',
  ideas:            'ideas',
  bs_smt:           'bs_smt',
  ba_world_language: 'ba_wl',
};

// Human-readable key entries shown at the bottom of the panel.
const FLAG_KEY_LABELS = {
  amali:  'AMALI = AMALI Requirement',
  ideas:  'IDEAS = Inclusion, Diversity, Equity & Access',
  bs_smt: 'SMT = B.S. Science, Math & Technology',
  ba_wl:  'WL = B.A. World Language',
};

function appliesToProgram(item, program) {
  if (!item.applies_when) return true;
  const aw = item.applies_when;
  if (aw.degree  && aw.degree  !== program.program.degree)  return false;
  if (aw.college && aw.college !== program.program.college) return false;
  return true;
}

// Build a map from flag key → sorted list of course codes that carry that flag.
function buildFlagCoursesMap(program, gradFlagsMap) {
  if (!gradFlagsMap?.size) return new Map();
  const codeById = new Map((program.courses || []).map(c => [c.id, c.code]));
  const out = new Map();
  for (const [courseId, flags] of gradFlagsMap) {
    for (const flag of flags) {
      if (!out.has(flag)) out.set(flag, []);
      out.get(flag).push(codeById.get(courseId) || courseId);
    }
  }
  for (const [flag, codes] of out) out.set(flag, codes.sort());
  return out;
}

function renderGraduation(ctx, x, y, colWidth, program, fonts) {
  const grad = program.graduation_requirements;
  if (!grad) return y;

  const showNotes   = colWidth >= NOTE_MIN_WIDTH;
  const trackable   = (grad.trackable || []).filter(item => appliesToProgram(item, program));
  const flagCourses = buildFlagCoursesMap(program, ctx.gradFlagsMap);

  y = drawSectionTitle(ctx.page, x, y, 'Graduation Requirements', colWidth, fonts);

  ctx.page.drawLine({
    start: { x, y }, end: { x: x + colWidth, y },
    thickness: 0.4, color: L.GRAY_BORDER,
  });

  for (const item of trackable) {
    y = breakIfNeeded(ctx, y, L.ROW_H, fonts);
    const bot = y - L.ROW_H;
    const { page, form } = ctx;

    page.drawLine({
      start: { x, y: bot }, end: { x: x + colWidth, y: bot },
      thickness: 0.3, color: L.GRAY_BORDER,
    });

    const flagKey    = GRAD_ITEM_FLAG[item.id];
    const satisfiers = flagKey ? flagCourses.get(flagKey) : null;

    const cbSize = 9;
    const cbY    = bot + (L.ROW_H - cbSize) / 2;
    const textY  = y - L.FONT.tableBody - 1.5;

    if (satisfiers?.length) {
      // Requirement covered by a major course — shade the row and show "in major" note.
      page.drawRectangle({ x, y: bot, width: colWidth, height: L.ROW_H, color: L.GRAY_BG });
      page.drawRectangle({ x: x + 1, y: cbY, width: cbSize, height: cbSize, color: L.GRAY_BORDER });

      page.drawText(item.title, {
        x: x + CHECK_W + 2, y: textY,
        size: L.FONT.tableBody, font: fonts.bold, color: L.GRAY_TEXT,
      });

      const maxShow  = 3;
      const shown    = satisfiers.slice(0, maxShow).join(', ');
      const overflow = satisfiers.length > maxShow ? ` +${satisfiers.length - maxShow} more` : '';
      const noteText = `via ${shown}${overflow}`;

      if (showNotes) {
        page.drawText(noteText, {
          x: x + CHECK_W + 2 + TITLE_W, y: textY,
          size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
        });
      } else {
        // Narrow mode: append note after title (truncated to fit)
        page.drawText(` — ${noteText}`, {
          x: x + CHECK_W + 2 + fonts.bold.widthOfTextAtSize(item.title, L.FONT.tableBody) + 2,
          y: textY,
          size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
        });
      }
    } else {
      // Not covered — render checkbox as before.
      const cb = form.createCheckBox(sanitizeId(`grad_${item.id}`) + '_check');
      cb.addToPage(page, {
        x: x + 1, y: cbY, width: cbSize, height: cbSize,
        borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
      });

      page.drawText(item.title, {
        x: x + CHECK_W + 2, y: textY,
        size: L.FONT.tableBody, font: fonts.bold, color: L.BLACK,
      });

      if (showNotes && item.note) {
        page.drawText(item.note, {
          x: x + CHECK_W + 2 + TITLE_W, y: textY,
          size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
        });
      }
    }

    y = bot;
  }

  // Key legend — only shown when at least one flag appears in this program.
  const usedFlags = ['amali', 'ideas', 'bs_smt', 'ba_wl'].filter(f => flagCourses.has(f));
  if (usedFlags.length > 0) {
    const keyText = 'Key: ' + usedFlags.map(f => FLAG_KEY_LABELS[f]).join('  ·  ');
    const keyLines = wrapText(fonts.reg, keyText, L.FONT.footnote, colWidth - 4);
    y -= 4;
    for (const line of keyLines) {
      y -= L.FONT.footnote + 1.5;
      ctx.page.drawText(line, {
        x: x + 2, y,
        size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
      });
    }
    y -= 2;
  }

  return y - 6;
}

module.exports = { renderGraduation };
