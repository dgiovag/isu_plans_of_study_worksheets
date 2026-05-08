'use strict';
const { esc, sanitizeId, makeRow, tableWrap } = require('./utils');
const renderFixed          = require('./render-fixed');
const renderChooseOne      = require('./render-choose-one');
const renderChooseN        = require('./render-choose-n');
const renderOpen           = require('./render-open');
const renderOpenConstrained = require('./render-open-constrained');
const renderChooseNGrouped  = require('./render-choose-n-grouped');
const renderChooseOneTrack  = require('./render-choose-one-track');
const renderRepeat          = require('./render-repeat');
const renderEscrow          = require('./render-escrow');

// Build a human-readable note for the group label.
function groupNote(group) {
  const explicit = group.note || '';
  switch (group.fill) {
    case 'fixed': {
      const n = (group.slots || []).length;
      return explicit || (n > 1 ? `${n} courses` : '');
    }
    case 'choose_one':
      return explicit || 'Take 1';
    case 'choose_n': {
      const hrs = group.minimum_hours ? ` (${group.minimum_hours} hrs)` : '';
      return `Take ${group.n}${hrs}${explicit ? ` · ${explicit}` : ''}`;
    }
    case 'open': {
      const cnt = group.count === 1 ? '1 course' : `${group.count} courses`;
      const parts = [cnt];
      if (group.constraint) parts.push(group.constraint);
      if (explicit) parts.push(explicit);
      return parts.join(' · ');
    }
    case 'open_constrained':
      return explicit || (group.count === 1 ? '1 course' : `${group.count} courses`);
    case 'repeat':
      return explicit || (group.semesters === 1 ? '1 semester' : `${group.semesters} semesters`);
    case 'choose_n_grouped':
      return `Take ${group.n}${explicit ? ` · ${explicit}` : ''}`;
    default:
      return explicit;
  }
}

// Resolve auto-fulfillment opts to pass to fill-type renderers.
// auto_fulfilled_by entries containing '.' are group refs (whole group fulfilled).
// entries without '.' are course IDs (specific courses fill specific slots).
function autoFulfilledOpts(group) {
  const ids = group.auto_fulfilled_by || [];
  if (!ids.length) return {};
  const groupRefs  = ids.filter(id => id.includes('.'));
  const courseRefs = ids.filter(id => !id.includes('.'));
  const o = {};
  if (groupRefs.length)  { o.autoFulfilled = true; o.preChecked = true; }
  if (courseRefs.length) { o.autoFulfilledCourses = courseRefs; }
  return o;
}

function dispatchFill(group, courseMap, prefix, opts) {
  switch (group.fill) {
    case 'fixed':            return renderFixed(group, courseMap, prefix, opts);
    case 'choose_one':       return renderChooseOne(group, courseMap, prefix, opts);
    case 'choose_n':         return renderChooseN(group, courseMap, prefix, opts);
    case 'open':             return renderOpen(group, courseMap, prefix, opts);
    case 'open_constrained': return renderOpenConstrained(group, courseMap, prefix, opts);
    case 'choose_n_grouped': return renderChooseNGrouped(group, courseMap, prefix, opts);
    case 'choose_one_track': return renderChooseOneTrack(group, courseMap, prefix, opts);
    case 'repeat':           return renderRepeat(group, courseMap, prefix, opts);
    case 'escrow':           return renderEscrow(group, courseMap, prefix, opts);
    default:
      return `<p style="color:red;font-size:0.85em">Unknown fill type: ${esc(group.fill)}</p>`;
  }
}

module.exports = function renderGroup(group, courseMap, prefix) {
  const note    = groupNote(group);
  const noteSpan = note ? ` <span class="group-note">— ${esc(note)}</span>` : '';
  const label   = `<div class="group-label">${esc(group.title)}${noteSpan}</div>`;

  // Exempt group: single pre-waived row regardless of fill type.
  if (group.exempt) {
    const rowId    = `${sanitizeId(group.id)}-0`;
    const desc     = group.exempt_reason || 'Exempt';
    const row      = makeRow(rowId, prefix, esc(group.title), esc(desc),
                             { exempt: true, preChecked: true, preWaived: true });
    return `<div class="group">${label}${tableWrap(row)}</div>`;
  }

  const opts = autoFulfilledOpts(group);

  // Escrow and choose_one_track return their own block-level HTML (not a table).
  const content = dispatchFill(group, courseMap, prefix, opts);
  return `<div class="group">${label}${content}</div>`;
};
