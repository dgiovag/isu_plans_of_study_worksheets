'use strict';

const { makeRow } = require('./row-pdf');
const { drawTableHeaders } = require('./table-pdf');
const { closeTable } = require('./render-fixed-pdf');

function renderRepeat(page, form, x, y, widths, group, courseMap, fonts) {
  const semesters = group.semesters || 1;
  const course    = courseMap[group.course_id];
  const code      = course ? course.code : (group.course_id || 'Course');

  y = drawTableHeaders(page, x, y, widths, fonts);
  for (let i = 0; i < semesters; i++) {
    y = makeRow(page, form, x, y, widths, `${group.id}.${i}`, `${code} (Sem ${i + 1})`, fonts);
  }
  return closeTable(page, x, y, widths);
}

module.exports = { renderRepeat };
