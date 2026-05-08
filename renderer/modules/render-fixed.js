'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// Renders a single inline slot that offers a choice.
// Handles both choose_one (string IDs) and choose_one_set (string or set-object options).
function inlineChoiceHTML(slot, courseMap) {
  const parts = (slot.options || []).map(opt => {
    if (typeof opt === 'string') {
      const c = courseMap[opt];
      return c ? esc(c.code) : esc(opt);
    }
    // set-object: { type:"set", course_ids:[...], note:"..." }
    if (opt.type === 'set' && opt.course_ids) {
      const codes = opt.course_ids.map(id => {
        const c = courseMap[id];
        return c ? esc(c.code) : esc(id);
      }).join(' + ');
      return opt.note ? `${codes} <span class="req-desc">(${esc(opt.note)})</span>` : codes;
    }
    return esc(String(opt));
  });
  return parts.join(' or ');
}

// fill=fixed: one row per slot.
// Slots may be { course_id } or inline { fill:"choose_one"|"choose_one_set", options:[...] }.
module.exports = function renderFixed(group, courseMap, prefix, opts) {
  const base = sanitizeId(group.id);
  const rows = (group.slots || []).map((slot, i) => {
    const rowId = `${base}-${i}`;
    let codeHTML, descHTML = '';

    if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      codeHTML = inlineChoiceHTML(slot, courseMap);
      if (slot.note) descHTML = esc(slot.note);
    } else if (slot.course_id) {
      const course = courseMap[slot.course_id];
      codeHTML = course ? esc(course.code) : esc(slot.course_id);
      const noteText = slot.note || (course && course.note) || '';
      if (noteText) descHTML = esc(noteText);
    } else {
      codeHTML = '—';
    }

    return makeRow(rowId, prefix, codeHTML, descHTML, opts);
  });

  return tableWrap(rows.join(''));
};
