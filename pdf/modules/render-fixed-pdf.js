'use strict';

const L = require('../layout');
const { makeRow, totalWidth, formatOption } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');

function renderFixed(ctx, x, y, widths, group, courseMap, fonts) {
  y = drawTableHeaders(ctx.page, x, y, widths, fonts);
  y = renderSlots(ctx, x, y, widths, group.slots || [], group.id, courseMap, fonts, {
    exempt: group.exempt,
  });
  return closeTable(ctx.page, x, y, widths);
}

function renderSlots(ctx, x, y, widths, slots, groupId, courseMap, fonts, opts = {}) {
  for (let i = 0; i < slots.length; i++) {
    const slot  = slots[i];
    const rowId = `${groupId}.${i}`;

    if (slot.course_id) {
      const c = courseMap[slot.course_id];
      y = makeRow(ctx, x, y, widths, rowId, c ? c.code : slot.course_id, fonts, opts);

    } else if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      const label = (slot.options || []).map(o => formatOption(o, courseMap)).join(' or ');
      y = makeRow(ctx, x, y, widths, rowId, label, fonts, opts);
    }
  }
  return y;
}

function closeTable(page, x, y, widths) {
  page.drawLine({
    start: { x, y }, end: { x: x + totalWidth(widths), y },
    thickness: 0.4, color: L.GRAY_BORDER,
  });
  return y;
}

module.exports = { renderFixed, renderSlots, closeTable };
