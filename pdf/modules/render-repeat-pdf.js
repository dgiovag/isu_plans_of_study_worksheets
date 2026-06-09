'use strict';

const { makeRow, totalWidth } = require('./row-pdf');
const { drawTableHeaders, drawNote } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderRepeat(ctx, x, y, widths, group, courseMap, fonts) {
  const semesters = group.semesters || 1;
  const course    = courseMap[group.course_id];
  const code      = course ? course.code : (group.course_id || 'Course');
  const colW      = totalWidth(widths);

  // Credit and level-progression notes (group.note is already drawn by render-group-pdf.js)
  const noteParts = [];
  if (group.credits_per_semester) noteParts.push(`${group.credits_per_semester} credits/semester`);
  if (group.total_credits)        noteParts.push(`${group.total_credits} total credits`);
  for (const lp of group.level_progression || []) {
    if (lp.note) noteParts.push(lp.note);
  }
  if (noteParts.length) {
    y = drawNote(ctx.page, x, y, noteParts.join(' · '), colW, fonts);
  }

  y = drawTableHeaders(ctx.page, x, y, widths, fonts);
  for (let i = 0; i < semesters; i++) {
    y = makeRow(ctx, x, y, widths, `${group.id}.${i}`, `${code} (Sem ${i + 1})`, fonts);
  }
  return closeTable(ctx.page, x, y, widths);
}

module.exports = { renderRepeat };
