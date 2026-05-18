'use strict';

const L = require('../layout');
const { makeRow, totalWidth, formatOption } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');

/**
 * Renders a `fixed` fill group: one row per slot.
 * Inline choose_one / choose_one_set slots become a single row with joined options.
 */
function renderFixed(page, form, x, y, widths, group, courseMap, fonts) {
  y = drawTableHeaders(page, x, y, widths, fonts);
  y = renderSlots(page, form, x, y, widths, group.slots || [], group.id, courseMap, fonts, {
    exempt: group.exempt,
  });
  return closeTable(page, x, y, widths);
}

/**
 * Shared slot renderer used by renderFixed and renderChooseOneTrack.
 * Each slot is either { course_id } or an inline fill ({ fill, options }).
 */
function renderSlots(page, form, x, y, widths, slots, groupId, courseMap, fonts, opts = {}) {
  for (let i = 0; i < slots.length; i++) {
    const slot  = slots[i];
    const rowId = `${groupId}.${i}`;

    if (slot.course_id) {
      const c = courseMap[slot.course_id];
      y = makeRow(page, form, x, y, widths, rowId, c ? c.code : slot.course_id, fonts, opts);

    } else if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      const label = (slot.options || []).map(o => formatOption(o, courseMap)).join(' or ');
      y = makeRow(page, form, x, y, widths, rowId, label, fonts, opts);
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
