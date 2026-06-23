'use strict';

const L = require('../layout');
const { makeRow, totalWidth, formatOption, breakIfNeeded, noCourseWidths } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');

const FLAG_LABELS = { amali: 'AMALI', ideas: 'IDEAS', bs_smt: 'SMT', ba_wl: 'WL' };

function renderFixed(ctx, x, y, widths, group, courseMap, fonts) {
  const w = noCourseWidths(widths);
  y = drawTableHeaders(ctx.page, x, y, w, fonts);
  y = renderSlots(ctx, x, y, w, group.slots || [], group.id, courseMap, fonts, {
    exempt: group.exempt,
  });
  return closeTable(ctx.page, x, y, w);
}

function renderSlots(ctx, x, y, widths, slots, groupId, courseMap, fonts, opts = {}) {
  for (let i = 0; i < slots.length; i++) {
    const slot  = slots[i];
    const rowId = `${groupId}.${i}`;

    // Widow protection: keep last 2 rows together rather than splitting 1 onto a new page.
    const remaining = slots.length - i;
    if (remaining === 2) y = breakIfNeeded(ctx, y, 2 * L.ROW_H, fonts);

    if (slot.course_id) {
      const c       = courseMap[slot.course_id];
      const isXref  = ctx.xrefCourseIds && ctx.xrefCourseIds.has(slot.course_id);
      const flags   = ctx.gradFlagsMap && ctx.gradFlagsMap.get(slot.course_id);
      const flagTag = flags?.length ? flags.map(f => FLAG_LABELS[f]).join(' · ') : null;
      const rowOpts = { ...opts };
      if (isXref)     rowOpts.bold    = true;
      if (flagTag)    rowOpts.flagTag = flagTag;
      if (c?.credits) rowOpts.hours   = c.credits;
      y = makeRow(ctx, x, y, widths, rowId, c ? c.code : slot.course_id, fonts, rowOpts);

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
