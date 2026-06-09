'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// Return the common credit value across a list of course IDs, or null if they differ.
function commonCredits(ids, courseMap) {
  const vals = ids.map(id => courseMap[id]?.credits).filter(c => c != null);
  if (!vals.length) return null;
  return vals.every(c => c === vals[0]) ? vals[0] : null;
}

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

// Collect all string option IDs from a choose_one or choose_one_set slot.
function inlineOptionIds(slot) {
  return (slot.options || []).flatMap(opt => {
    if (typeof opt === 'string') return [opt];
    if (opt.type === 'set' && opt.course_ids) return opt.course_ids;
    return [];
  });
}

// fill=fixed: one row per slot.
// Slots may be { course_id } or inline { fill:"choose_one"|"choose_one_set", options:[...] }.
module.exports = function renderFixed(group, courseMap, prefix, opts) {
  const base = sanitizeId(group.id);
  const rows = (group.slots || []).map((slot, i) => {
    const rowId = `${base}-${i}`;
    let codeHTML, descHTML = '', slotOpts;

    if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      codeHTML = inlineChoiceHTML(slot, courseMap);
      if (slot.note) descHTML = esc(slot.note);
      const credits = commonCredits(inlineOptionIds(slot), courseMap);
      slotOpts = { ...opts, credits };
    } else if (slot.course_id) {
      const course = courseMap[slot.course_id];
      codeHTML = course ? esc(course.code) : esc(slot.course_id);
      const noteText = slot.note || (course && course.note) || '';
      if (noteText) descHTML = esc(noteText);
      slotOpts = { ...opts, credits: course?.credits ?? null };
    } else {
      codeHTML = '—';
      slotOpts = opts;
    }

    return makeRow(rowId, prefix, codeHTML, descHTML, slotOpts);
  });

  return tableWrap(rows.join(''));
};
