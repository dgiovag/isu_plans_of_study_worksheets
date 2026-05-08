'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// fill=open: `count` rows.
// Handles two auto-fulfillment cases:
//   opts.autoFulfilled=true        → whole group pre-checked (group-ref in auto_fulfilled_by)
//   opts.autoFulfilledCourses=[..] → first N rows pre-checked with specific course codes
module.exports = function renderOpen(group, courseMap, prefix, opts) {
  const o = opts || {};
  const base  = sanitizeId(group.id);
  const count = group.count || 1;

  const descParts = [];
  if (group.note)       descParts.push(esc(group.note));
  if (group.constraint) descParts.push(esc(group.constraint));
  const descHTML = descParts.join(' · ');

  const rows = [];
  for (let i = 0; i < count; i++) {
    const rowId = `${base}-${i}`;
    const rowDesc = i === 0 ? descHTML : '';

    if (o.autoFulfilled) {
      const label = count === 1 ? esc(group.title) : `${esc(group.title)} #${i + 1}`;
      rows.push(makeRow(rowId, prefix, label, rowDesc, { autoFulfilled: true, preChecked: true }));

    } else if (o.autoFulfilledCourses && i < o.autoFulfilledCourses.length) {
      const courseId = o.autoFulfilledCourses[i];
      const course   = courseMap[courseId];
      const label    = course ? esc(course.code) : esc(courseId);
      rows.push(makeRow(rowId, prefix, label, rowDesc, { autoFulfilled: true, preChecked: true }));

    } else {
      const label = count === 1 ? esc(group.title) : `${esc(group.title)} #${i + 1}`;
      rows.push(makeRow(rowId, prefix, label, rowDesc, {}));
    }
  }
  return tableWrap(rows.join(''));
};
