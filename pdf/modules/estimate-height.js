'use strict';

/**
 * Predicts the vertical space renderGroup() will consume for a group.
 *
 * Accuracy matters twice over: it decides whether a group is page-broken before
 * its title (so tables aren't orphaned), and it drives the sub-column split. A
 * font-blind estimate produces lopsided columns, which is how a program whose
 * content comfortably fits two pages ends up spilling onto a third.
 *
 * Every branch below mirrors the corresponding render-*-pdf.js drawing sequence
 * and reuses that module's own height helper, so the two cannot drift.
 *
 * `env` carries what the row heights depend on:
 *   { widths, fonts, courseMap, gradFlagsMap, xrefCourseIds }
 * Without `widths`/`fonts` the function falls back to the old row-count
 * approximation — callers that have a rendering context should always pass env.
 */

const L = require('../layout');
const { rowHeight, totalWidth, formatOption, noReqWidths, noCourseWidths, wrapText } = require('./row-pdf');
const { groupTitleHeight, noteHeight }  = require('./table-pdf');
const { chooseNRowCount }               = require('./render-choose-n-pdf');
const { openRowCount }                  = require('./render-open-pdf');
const { subHeaderHeight }               = require('./render-choose-n-grouped-pdf');
const { trackHeaderHeight }             = require('./render-choose-one-track-pdf');

const FLAG_LABELS = { amali: 'AMALI', ideas: 'IDEAS', bs_smt: 'SMT', ba_wl: 'WL' };

// Minimum vertical space to reserve before starting a group:
// group title bar + table header row + at least three data rows.
const MIN_GROUP_SPACE = L.GROUP_TITLE_H + L.TABLE_HDR_H + 3 * L.ROW_H;

function estimateGroupHeight(group, env) {
  if (!group) return 0;
  if (!env || !env.widths || !env.fonts) return estimateRough(group);

  const { widths, fonts } = env;
  const colW = totalWidth(widths);

  // renderGroup draws an exempt group as title bar + one 14pt notice line.
  if (group.exempt) return groupTitleHeight(group.title, colW, fonts) + 14;

  // Escrow draws its own block; renderGroup skips the title bar for it.
  if (group.fill === 'escrow') return escrowHeight(group, env, colW);

  let h = groupTitleHeight(group.title, colW, fonts);
  if (group.note) h += noteHeight(group.note, colW, fonts);

  return h + bodyHeight(group, env, colW);
}

function bodyHeight(group, env, colW) {
  const { widths, fonts, courseMap } = env;
  const HDR = L.TABLE_HDR_H;

  switch (group.fill) {
    // renderFixed: noCourseWidths, headers, one row per slot
    case 'fixed': {
      const w = noCourseWidths(widths);
      return HDR + slotsHeight(group.slots || [], w, env);
    }

    // renderChooseOne: headers, then ONE row whose label is every option
    // joined by " or " — not one row per option, as the old estimate assumed.
    case 'choose_one':
    case 'choose_one_set': {
      const label = (group.options || []).map(o => formatOption(o, courseMap)).join(' or ');
      return HDR + rowHeight(label, widths, fonts);
    }

    // renderChooseN: an unconditional "Choose N from: <all options>" note
    // (missed entirely by the old estimate), headers, then N blank rows.
    case 'choose_n': {
      const n = chooseNRowCount(group);
      let h = 0;
      if (group.options && group.options.length > 0) {
        const optList = group.options.map(o => formatOption(o, courseMap)).join(', ');
        h += noteHeight(`Choose ${n} from: ${optList}`, colW, fonts);
      }
      h += HDR;
      for (let i = 0; i < n; i++) h += rowHeight(`Elective #${i + 1}`, widths, fonts);
      return h;
    }

    // renderChooseNGrouped iterates `sub_groups`; the old estimate read
    // `groups`, so it always predicted zero rows.
    case 'choose_n_grouped': {
      const n = group.n || 1;
      let h = HDR, rowNum = 0;
      for (const sub of (group.sub_groups || [])) {
        const subTitle = `${sub.title}${sub.minimum_picks ? ` — choose at least ${sub.minimum_picks}` : ''}`;
        h += subHeaderHeight(subTitle, colW, fonts);
        if (sub.options && sub.options.length > 0) {
          const optList = sub.options.map(o => formatOption(o, courseMap)).join(', ');
          h += noteHeight(`Options: ${optList}`, colW, fonts);
        }
        const picks = sub.minimum_picks || 1;
        for (let i = 0; i < picks; i++) {
          h += rowHeight(`${sub.title} #${i + 1}`, widths, fonts);
          rowNum++;
        }
      }
      while (rowNum < n) {
        h += rowHeight(`Additional Elective #${rowNum + 1}`, widths, fonts);
        rowNum++;
      }
      return h;
    }

    // renderChooseOneTrack reads `track.courses`; the old estimate read
    // `t.slots`, so it also predicted zero rows.
    case 'choose_one_track': {
      const tracks = group.tracks || [];
      let h = noteHeight(`Choose one track (${tracks.map(t => t.title).join(' / ')})`, colW, fonts);
      for (const track of tracks) {
        h += trackHeaderHeight(track.title, colW, fonts);
        h += HDR;
        h += slotsHeight(track.courses || [], widths, env);
        h += 2; // inter-track gap
      }
      return h;
    }

    case 'open':             return HDR + openHeight(group, env);
    case 'open_constrained': {
      const w = noReqWidths(widths);
      let h = group.constraint
        ? noteHeight(`Constraint: ${group.constraint}`, colW, fonts) : 0;
      h += HDR;
      const count = openRowCount(group);
      for (let i = 0; i < count; i++) h += rowHeight('', w, fonts);
      return h;
    }

    // renderRepeat: credit/level-progression note, noCourseWidths, one row
    // per semester.
    case 'repeat': {
      const semesters = group.semesters || 1;
      const course    = courseMap ? courseMap[group.course_id] : null;
      const code      = course ? course.code : (group.course_id || 'Course');
      const w         = noCourseWidths(widths);

      const noteParts = [];
      if (group.credits_per_semester) noteParts.push(`${group.credits_per_semester} credits/semester`);
      if (group.total_credits)        noteParts.push(`${group.total_credits} total credits`);
      for (const lp of group.level_progression || []) if (lp.note) noteParts.push(lp.note);

      let h = noteParts.length ? noteHeight(noteParts.join(' · '), colW, fonts) : 0;
      h += HDR;
      for (let i = 0; i < semesters; i++) h += rowHeight(`${code} (Sem ${i + 1})`, w, fonts);
      return h;
    }

    default: return MIN_GROUP_SPACE;
  }
}

// Mirrors renderOpen's three branches: whole-group auto-fulfilled, specific
// auto-fulfilling courses, or plain blank slots with the label column collapsed.
function openHeight(group, env) {
  const { widths, fonts, courseMap } = env;
  const count = openRowCount(group);
  const ids   = group.auto_fulfilled_by || [];
  const groupRefs  = ids.filter(id => id.includes('.'));
  const courseRefs = ids.filter(id => !id.includes('.'));

  if (groupRefs.length) {
    let h = 0;
    for (let i = 0; i < count; i++) {
      const label = count === 1 ? group.title : `${group.title} #${i + 1}`;
      h += rowHeight(label, widths, fonts, { bold: true });
    }
    return h;
  }

  if (courseRefs.length) {
    const codeOf = id => { const c = courseMap && courseMap[id]; return c ? c.code : id; };
    let h = 0;
    for (let i = 0; i < count; i++) {
      let label;
      if (courseRefs.length > count)    label = courseRefs.map(codeOf).join(' / ');
      else if (i < courseRefs.length)   label = codeOf(courseRefs[i]);
      else                              label = group.title;
      h += rowHeight(label, widths, fonts, { bold: true });
    }
    return h;
  }

  const w = noReqWidths(widths);
  let h = 0;
  for (let i = 0; i < count; i++) h += rowHeight('', w, fonts);
  return h;
}

// Mirrors renderSlots: a course row, or an inline choose_one row whose label
// is every option joined by " or ".
function slotsHeight(slots, widths, env) {
  const { fonts, courseMap, gradFlagsMap, xrefCourseIds } = env;
  let h = 0;
  for (const slot of slots) {
    if (slot.course_id) {
      const c     = courseMap ? courseMap[slot.course_id] : null;
      const flags = gradFlagsMap && gradFlagsMap.get(slot.course_id);
      const opts  = {};
      if (xrefCourseIds && xrefCourseIds.has(slot.course_id)) opts.bold = true;
      if (flags && flags.length) opts.flagTag = flags.map(f => FLAG_LABELS[f]).join(' · ');
      h += rowHeight(c ? c.code : slot.course_id, widths, fonts, opts);
    } else if (slot.fill === 'choose_one' || slot.fill === 'choose_one_set') {
      const label = (slot.options || []).map(o => formatOption(o, courseMap)).join(' or ');
      h += rowHeight(label, widths, fonts);
    }
  }
  return h;
}

// Mirrors renderEscrow's blockH formula exactly (plus its 2pt tail).
function escrowHeight(group, env, colW) {
  const { fonts, courseMap } = env;
  const codeOf = id => { const c = courseMap && courseMap[id]; return c ? c.code : id; };

  const triggerCodes = (group.trigger_courses || []).map(codeOf);
  const grantedCodes = (group.granted_courses || []).map(codeOf);
  const crText   = group.total_credits ? ` (${group.total_credits} cr)` : '';
  const bodyText = `Completing ${triggerCodes.join(' or ')} grants credit for ${grantedCodes.join(', ')}${crText}.`;

  const bodyLines = wrapText(fonts.reg, bodyText, L.FONT.footnote, colW - 10);
  const noteLines = group.note ? wrapText(fonts.reg, group.note, L.FONT.footnote, colW - 10) : [];
  const checkRowH = 14;

  return 8 + bodyLines.length * 8
       + (noteLines.length ? noteLines.length * 8 + 3 : 0)
       + checkRowH + 6 + 2;
}

// Font-blind fallback, kept for callers with no rendering context.
// Deliberately generous where the real height is unknown.
function estimateRough(group) {
  if (group.exempt) return L.GROUP_TITLE_H + 14;
  if (group.fill === 'escrow') return L.ROW_H * 4;

  const base  = L.GROUP_TITLE_H + L.TABLE_HDR_H;
  const noteH = group.note ? 20 : 0;
  switch (group.fill) {
    case 'repeat':           return base + noteH + (group.semesters || 1) * L.ROW_H;
    case 'open':             return base + noteH + openRowCount(group) * L.ROW_H;
    case 'open_constrained': return base + noteH + openRowCount(group) * L.ROW_H + 10;
    case 'choose_one':
    case 'choose_one_set':   return base + noteH + (group.options || []).length * L.ROW_H;
    case 'choose_n':         return base + noteH + chooseNRowCount(group) * L.ROW_H;
    case 'fixed':            return base + noteH + (group.slots || []).length * L.ROW_H;
    case 'choose_n_grouped': {
      let rows = 0;
      for (const sg of group.sub_groups || []) rows += 1 + (sg.options || []).length;
      return base + noteH + rows * L.ROW_H;
    }
    case 'choose_one_track': {
      let rows = 0;
      for (const t of group.tracks || []) rows += 1 + (t.courses || []).length;
      return base + noteH + rows * L.ROW_H;
    }
    default: return MIN_GROUP_SPACE;
  }
}

module.exports = { estimateGroupHeight, MIN_GROUP_SPACE };
