'use strict';

const { makeRow, noReqWidths } = require('./row-pdf');
const { drawTableHeaders }     = require('./table-pdf');
const { closeTable }           = require('./render-fixed-pdf');

function openRowCount(group) {
  if (group.minimum_hours) return Math.ceil(group.minimum_hours / 3);
  return group.count || 1;
}

// Mirrors the auto_fulfilled_by logic in renderer/modules/render-group.js.
// Group refs (id contains '.') mean the whole group is satisfied.
// Course refs (no '.') mean specific courses fill specific slots.
function autoFulfilledOpts(group) {
  const ids = group.auto_fulfilled_by || [];
  if (!ids.length) return {};
  const groupRefs  = ids.filter(id => id.includes('.'));
  const courseRefs = ids.filter(id => !id.includes('.'));
  const o = {};
  if (groupRefs.length)  o.autoFulfilled = true;
  if (courseRefs.length) o.autoFulfilledCourses = courseRefs;
  return o;
}

function renderOpen(ctx, x, y, widths, group, courseMap, fonts) {
  const count = openRowCount(group);
  const ao    = autoFulfilledOpts(group);

  if (ao.autoFulfilled) {
    y = drawTableHeaders(ctx.page, x, y, widths, fonts);
    for (let i = 0; i < count; i++) {
      const label = count === 1 ? group.title : `${group.title} #${i + 1}`;
      y = makeRow(ctx, x, y, widths, `${group.id}.${i}`, label, fonts, { bold: true });
    }
    return closeTable(ctx.page, x, y, widths);
  }

  if (ao.autoFulfilledCourses) {
    const courseIds = ao.autoFulfilledCourses;
    y = drawTableHeaders(ctx.page, x, y, widths, fonts);
    for (let i = 0; i < count; i++) {
      let label;
      if (courseIds.length > count) {
        label = courseIds.map(id => { const c = courseMap[id]; return c ? c.code : id; }).join(' / ');
      } else if (i < courseIds.length) {
        const c = courseMap[courseIds[i]];
        label = c ? c.code : courseIds[i];
      } else {
        label = group.title;
      }
      y = makeRow(ctx, x, y, widths, `${group.id}.${i}`, label, fonts, { bold: true });
    }
    return closeTable(ctx.page, x, y, widths);
  }

  // No auto-fulfillment: blank rows with req column collapsed (open slot appearance)
  const w = noReqWidths(widths);
  y = drawTableHeaders(ctx.page, x, y, w, fonts);
  for (let i = 0; i < count; i++) {
    y = makeRow(ctx, x, y, w, `${group.id}.${i}`, '', fonts);
  }
  return closeTable(ctx.page, x, y, w);
}

module.exports = { renderOpen, openRowCount };
