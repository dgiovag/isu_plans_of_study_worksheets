'use strict';

const L = require('../layout');
const { drawSectionTitle, drawNote } = require('./table-pdf');
const { renderGroup }               = require('./render-group-pdf');
const { wrapText }                  = require('./row-pdf');

// Maps PDF track key → data track id to look up in general_education.tracks
const DATA_TRACK = { isu: 'isu', iai: 'iai', ad: 'iai' };

const SECTION_TITLES = {
  isu: 'ISU General Education',
  iai: 'IAI Transferable Core',
  ad:  "Associate's Degree (IAI)",
};

/**
 * Renders the full gen-ed column (left column) for the given track.
 * Uses a separate ctx from the major column so page breaks are independent.
 */
function renderGenEd(ctx, y, program, track, courseMap, fonts) {
  const x      = L.MARGIN.left;
  const widths = L.COL_WIDTHS.left;
  const ge     = program.general_education || { tracks: [] };

  y = drawSectionTitle(ctx.page, x, y, SECTION_TITLES[track], L.COL_LEFT_WIDTH, fonts);

  // Completion programs: gen-ed satisfied by admission requirement
  if (ge.assumed_complete && track !== 'ad') {
    return renderAssumedComplete(ctx.page, x, y, ge, fonts);
  }

  // Associate's degree track: credential fields first, then IAI groups
  if (track === 'ad') {
    const assocTrack = (ge.tracks || []).find(t => t.id === 'associates');
    if (assocTrack && assocTrack.fields && assocTrack.fields.length > 0) {
      y = renderAssociatesFields(ctx, x, y, assocTrack, fonts);
      y -= 4;
    }
  }

  // Find the course-based track data
  const dataTrackId = DATA_TRACK[track];
  const dataTrack   = (ge.tracks || []).find(t => t.id === dataTrackId);

  if (!dataTrack || !dataTrack.groups || dataTrack.groups.length === 0) {
    ctx.page.drawText('No course-based general education requirements for this track.', {
      x: x + 4, y: y - 10,
      size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT,
    });
    return y - 14;
  }

  for (const group of dataTrack.groups) {
    y = renderGroup(ctx, x, y, widths, group, courseMap, fonts);
    y -= 3;
  }

  return y;
}

// Gray info block for programs where gen-ed is assumed satisfied on admission.
function renderAssumedComplete(page, x, y, ge, fonts) {
  const noteText = ge.assumed_via === 'admission_requirement'
    ? "General Education requirements are satisfied by the Associate's Degree required for program admission."
    : 'General Education requirements are assumed complete.';

  const lines  = wrapText(fonts.reg, noteText, L.FONT.footnote, L.COL_LEFT_WIDTH - 8);
  const blockH = lines.length * 8 + 10;

  page.drawRectangle({ x, y: y - blockH, width: L.COL_LEFT_WIDTH, height: blockH, color: L.GRAY_BG });
  let ty = y - 8;
  for (const line of lines) {
    page.drawText(line, { x: x + 4, y: ty, size: L.FONT.footnote, font: fonts.reg, color: L.GRAY_TEXT });
    ty -= 8;
  }
  return y - blockH - 4;
}

// AcroForm text fields for Associate's degree credential metadata.
function renderAssociatesFields(ctx, x, y, assocTrack, fonts) {
  const { page, form } = ctx;
  const fields  = assocTrack.fields || [];
  const colW    = L.COL_LEFT_WIDTH;
  const FIELD_H = 14;
  const ROW_H   = FIELD_H + 11; // field + label + gap

  // Pair fields into rows of two
  const rows = [];
  for (let i = 0; i < fields.length; i += 2) rows.push(fields.slice(i, i + 2));

  const blockH = rows.length * ROW_H + 6;

  page.drawRectangle({ x, y: y - blockH, width: colW, height: blockH, color: L.GRAY_BG });

  let rowTop = y - 4;
  for (const row of rows) {
    const fw = row.length === 2 ? Math.floor((colW - 6) / 2) : colW - 4;
    for (let i = 0; i < row.length; i++) {
      const f  = row[i];
      const fx = x + 2 + i * (fw + 2);

      page.drawText(f.label, {
        x: fx, y: rowTop - L.FONT.label,
        size: L.FONT.label, font: fonts.reg, color: L.BLACK,
      });

      const tf = form.createTextField(`assoc_${f.id}`);
      tf.addToPage(page, {
        x: fx, y: rowTop - L.FONT.label - FIELD_H - 1,
        width: fw, height: FIELD_H,
        borderWidth: 0.3, borderColor: L.GRAY_BORDER, backgroundColor: L.WHITE,
      });
    }
    rowTop -= ROW_H;
  }

  return y - blockH;
}

module.exports = { renderGenEd };
