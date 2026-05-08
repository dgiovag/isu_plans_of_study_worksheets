'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');

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
    const noteText = slot.note || (course && course.note) || '';
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

// fill=choose_one_track: radio selector + one panel per track.
// First track is active; runtime.js (Step 5) will add switching behavior.
module.exports = function renderChooseOneTrack(group, courseMap, prefix) {
  const groupSafe = sanitizeId(group.id);
  const radioName = `sub-track-${groupSafe}`;

  const radios = (group.tracks || []).map((t, i) =>
    `<label><input type="radio" name="${radioName}" value="${esc(sanitizeId(t.id))}"${i === 0 ? ' checked' : ''}> ${esc(t.title)}</label>`
  ).join('\n    ');

  const panels = (group.tracks || []).map((t, i) => {
    const trackSafe = sanitizeId(t.id);
    const rows = (t.courses || []).map((slot, j) => {
      const rowId = `${trackSafe}-${j}`;
      return makeRow(rowId, prefix, slotCodeHTML(slot, courseMap), slotDescHTML(slot, courseMap), {});
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
