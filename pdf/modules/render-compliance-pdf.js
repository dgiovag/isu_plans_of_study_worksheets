'use strict';

const L = require('../layout');
const { breakIfNeeded, sanitizeId } = require('./row-pdf');
const { drawSectionTitle, drawGroupTitle } = require('./table-pdf');

const CATEGORY_LABELS = {
  health:            'Health & Immunization',
  background:        'Background & Screening',
  licensure:         'Licensure & Certification',
  teacher_education: 'Teacher Education',
};

const CHECK_W = 10;

function renderCompliance(ctx, y, program, fonts) {
  const items = program.compliance_requirements;
  if (!items || items.length === 0) return y;

  const x    = L.MARGIN.left;
  const colW = L.CONTENT_WIDTH;

  y = drawSectionTitle(ctx.page, x, y, 'Compliance Requirements', colW, fonts);

  // Group by category, preserving insertion order
  const byCategory = new Map();
  for (const item of items) {
    const cat = item.category || 'other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(item);
  }

  for (const [cat, catItems] of byCategory) {
    const catLabel = CATEGORY_LABELS[cat] || cat;

    y = breakIfNeeded(ctx, y, L.GROUP_TITLE_H + L.ROW_H, fonts);
    y = drawGroupTitle(ctx.page, x, y, catLabel, colW, fonts);

    // Top border for item list
    ctx.page.drawLine({
      start: { x, y }, end: { x: x + colW, y },
      thickness: 0.4, color: L.GRAY_BORDER,
    });

    for (const item of catItems) {
      y = breakIfNeeded(ctx, y, L.ROW_H, fonts);
      const bot = y - L.ROW_H;
      const { page, form } = ctx;

      page.drawLine({
        start: { x, y: bot }, end: { x: x + colW, y: bot },
        thickness: 0.3, color: L.GRAY_BORDER,
      });

      const cbSize = 9;
      const cbY    = bot + (L.ROW_H - cbSize) / 2;
      const cb = form.createCheckBox(sanitizeId(`compliance_${item.id}`) + '_check');
      cb.addToPage(page, {
        x: x + 1, y: cbY, width: cbSize, height: cbSize,
        borderWidth: 0.5, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
      });

      page.drawText(item.title, {
        x: x + CHECK_W + 2, y: y - L.FONT.tableBody - 1.5,
        size: L.FONT.tableBody, font: fonts.reg, color: L.BLACK,
      });

      y = bot;
    }

    y -= 4;
  }

  return y;
}

module.exports = { renderCompliance };
