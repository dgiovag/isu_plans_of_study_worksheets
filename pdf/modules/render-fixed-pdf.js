'use strict';

const { makeRow, totalWidth } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');

/**
 * Renders a `fixed` fill group: one row per slot.
 * Inline choose_one slots are rendered as a single row with joined options.
 */
function renderFixed(page, form, x, y, widths, group, courseMap, fonts) {
  y = drawTableHeaders(page, x, y, widths, fonts);

  const slots = group.slots || [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const rowId = `${group.id}.${i}`;

    if (slot.course_id) {
      const course = courseMap[slot.course_id];
      const label = course ? course.code : slot.course_id;
      y = makeRow(page, form, x, y, widths, rowId, label, fonts, {
        exempt: group.exempt,
      });

    } else if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      const label = (slot.options || [])
        .map(id => { const c = courseMap[id]; return c ? c.code : id; })
        .join(' or ');
      y = makeRow(page, form, x, y, widths, rowId, label, fonts);
    }
  }

  // Close table with a bottom border
  const colW = totalWidth(widths);
  page.drawLine({
    start: { x, y }, end: { x: x + colW, y },
    thickness: 0.4, color: require('../layout').GRAY_BORDER,
  });

  return y;
}

module.exports = { renderFixed };
