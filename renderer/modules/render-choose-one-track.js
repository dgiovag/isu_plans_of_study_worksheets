'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

// Return the common credit value across a list of course IDs, or null if they differ.
function commonCredits(ids, courseMap) {
  const vals = ids.map(id => courseMap[id]?.credits).filter(c => c != null);
  if (!vals.length) return null;
  return vals.every(c => c === vals[0]) ? vals[0] : null;
}

// Collect all string/set option IDs from a choose_one or choose_one_set slot.
function inlineOptionIds(slot) {
  return (slot.options || []).flatMap(opt => {
    if (typeof opt === 'string') return [opt];
    if (opt.type === 'set' && opt.course_ids) return opt.course_ids;
    return [];
  });
}

// Render a single slot's code HTML (handles course_id, choose_one, choose_one_set).
function slotCodeHTML(slot, courseMap) {
  if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
    return (slot.options || []).map(opt => {
      if (typeof opt === 'string') {
        const c = courseMap[opt];
        return c ? esc(c.code) : esc(opt);
      }
      if (opt.type === 'set' && opt.course_ids) {
        const codes = opt.course_ids.map(id => {
          const c = courseMap[id];
          return c ? esc(c.code) : esc(id);
        }).join(' + ');
        return opt.note ? `${codes} <span class="req-desc">(${esc(opt.note)})</span>` : codes;
      }
      return esc(String(opt));
    }).join(' or ');
  }
  if (slot.course_id) {
    const course = courseMap[slot.course_id];
    return course ? esc(course.code) : esc(slot.course_id);
  }
  return '—';
}

function slotDescHTML(slot, courseMap) {
  if (slot.course_id) {
    const course = courseMap[slot.course_id];
    const noteText = slot.note || (course && course.note) || '';
    return noteText ? esc(noteText) : '';
  }
  return slot.note ? esc(slot.note) : '';
}

// Resolve credits and singleCourse flag for a slot.
function slotRowOpts(slot, courseMap) {
  if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
    return { credits: commonCredits(inlineOptionIds(slot), courseMap) };
  }
  if (slot.course_id) {
    const course = courseMap[slot.course_id];
    return { credits: course?.credits ?? null, singleCourse: true };
  }
  return {};
}

// fill=choose_one_track: radio selector + one panel per track.
// First track is active; runtime.js will add switching behavior.
module.exports = function renderChooseOneTrack(group, courseMap, prefix) {
  const groupSafe = sanitizeId(group.id);
  const radioName = `sub-track-${groupSafe}`;

  const radios = (group.tracks || []).map((t, i) =>
    `<label><input type="radio" name="${radioName}" value="${esc(sanitizeId(t.id))}"${i === 0 ? ' checked' : ''}> ${esc(t.title)}</label>`
  ).join('\n    ');

  const panels = (group.tracks || []).map((t, i) => {
    const trackSafe = sanitizeId(t.id);
    const rows = (t.courses || []).map((slot, j) => {
      const rowId  = `${trackSafe}-${j}`;
      const rowOpts = slotRowOpts(slot, courseMap);
      return makeRow(rowId, prefix, slotCodeHTML(slot, courseMap), slotDescHTML(slot, courseMap), rowOpts);
    }).join('');

    return `<div class="track-sub-panel${i === 0 ? ' active' : ''}" id="sub-panel-${trackSafe}" data-sub-track="${trackSafe}">
  ${tableWrap(rows)}
</div>`;
  }).join('\n');

  return `<div class="track-sub-selector">
  <strong>Select track:</strong>
  ${radios}
</div>
${panels}`;
};
