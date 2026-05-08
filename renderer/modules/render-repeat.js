'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// fill=repeat: one row per semester of the same repeatable course.
module.exports = function renderRepeat(group, courseMap, prefix, opts) {
  const base      = sanitizeId(group.id);
  const semesters = group.semesters || 1;
  const course    = group.course_id ? courseMap[group.course_id] : null;
  const baseCode  = course ? course.code : (group.course_id || group.title);

  const descParts = [];
  if (group.credits_per_semester) descParts.push(`${group.credits_per_semester} credits/semester`);
  if (group.total_credits)        descParts.push(`${group.total_credits} total credits`);
  if (group.level_progression) {
    group.level_progression.forEach(lp => {
      if (lp.note) descParts.push(esc(lp.note));
    });
  }
  if (group.note) descParts.push(esc(group.note));
  const descHTML = descParts.join(' · ');

  const rows = [];
  for (let i = 0; i < semesters; i++) {
    rows.push(makeRow(
      `${base}-${i}`,
      prefix,
      `${esc(baseCode)} (Sem ${i + 1})`,
      i === 0 ? descHTML : '',
      opts
    ));
  }
  return tableWrap(rows.join(''));
};
