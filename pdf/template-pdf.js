'use strict';

const fs   = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const L = require('./layout');
const resolveCourses        = require('../renderer/modules/resolve-courses');
const { renderMajor }       = require('./modules/render-major-pdf');
const { wrapText }          = require('./modules/row-pdf');
const { renderGenEd }       = require('./modules/render-gened-pdf');
const { renderGraduation }  = require('./modules/render-graduation-pdf');
const { renderCollege }     = require('./modules/render-college-pdf');
const { renderCompliance }  = require('./modules/render-compliance-pdf');

const TRACKS = ['isu', 'iai', 'ad'];

const TRACK_LABELS = {
  isu: 'ISU General Education',
  iai: 'IAI Transferable Core',
  ad:  "Associate's Degree (IAI)",
};

async function buildPDFs(program) {
  const result = {};
  for (const track of TRACKS) {
    result[track] = await buildOnePDF(program, track);
  }
  return result;
}

async function buildOnePDF(program, track) {
  const doc = await PDFDocument.create();
  const prog = program.program;

  doc.setTitle(`${prog.title}${prog.sequence ? ' — ' + prog.sequence : ''}, ${prog.degree} — Plan of Study`);
  doc.setAuthor('Illinois State University');
  doc.setSubject(`Gen-Ed Track: ${TRACK_LABELS[track]}`);

  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { reg: fontReg, bold: fontBold };

  const wordmarkBytes = fs.readFileSync(path.join(__dirname, '../images/ISU-wordmark.png'));
  const wordmarkImage = await doc.embedPng(wordmarkBytes);

  const courseMap = resolveCourses(program);

  const page = doc.addPage([L.PAGE_WIDTH, L.PAGE_HEIGHT]);
  const form = doc.getForm();

  const afterHeader     = drawHeader(page, prog, track, fonts, wordmarkImage);
  const afterDisclaimer = drawDisclaimer(page, afterHeader, fonts);
  const bodyY           = drawStudentInfo(page, form, afterDisclaimer, fonts);

  // Course IDs that appear in any gen-ed auto_fulfilled_by — used by both
  // renderers to bold cross-counted rows on each side of the chart.
  const xrefCourseIds = buildXrefCourseIds(program);

  // courseId → graduation_flags array, for inline tag rendering.
  const gradFlagsMap = buildGradFlagsMap(program);

  // Two independent rendering contexts — same doc/form, separate page refs
  // so each column's page breaks don't interfere with each other.
  const leftCtx  = { doc, page, form, xrefCourseIds, gradFlagsMap };
  const rightCtx = { doc, page, form, xrefCourseIds, gradFlagsMap };

  const finalGenEdY = renderGenEd(leftCtx,  bodyY, program, track, courseMap, fonts);
  const finalMajorY = renderMajor(rightCtx, bodyY, program, courseMap, fonts);

  // Graduation goes in the left column below gen-ed (narrow, no note column).
  const leftX        = L.MARGIN.left;
  const gradLeftY    = renderGraduation(leftCtx, leftX, finalGenEdY, L.COL_LEFT_WIDTH, program, fonts);

  // College and compliance are full-width panels below both columns.
  // Only render them if either is present for this program.
  const hasCollegeReq    = !!program.college_requirements;
  const hasComplianceReq = !!(program.compliance_requirements && program.compliance_requirements.length);

  if (hasCollegeReq || hasComplianceReq) {
    let gradPage, gradY;
    if (leftCtx.page === rightCtx.page) {
      gradPage = leftCtx.page;
      gradY    = Math.min(gradLeftY, finalMajorY) - 8;
    } else {
      // Left column ended before right — use the right column's last page
      // so compliance stays on page 2 rather than forcing a new page 3.
      gradPage = rightCtx.page;
      gradY    = finalMajorY - 8;
    }

    const gradCtx = { doc, page: gradPage, form };
    let panelY = renderCollege(gradCtx, gradY, program, courseMap, fonts);
    renderCompliance(gradCtx, panelY, program, fonts);
  }

  return doc.save();
}

// Draws the top header block; returns the y-coordinate immediately below it.
function drawHeader(page, prog, track, fonts, wordmarkImage) {
  const W  = L.PAGE_WIDTH;
  const H  = L.PAGE_HEIGHT;
  const T  = H - L.MARGIN.top; // top of printable area

  // Wordmark image — left-aligned, flush with top margin, 36pt tall
  const IMG_H = 36;
  const IMG_W = Math.round(IMG_H * (wordmarkImage.width / wordmarkImage.height));
  page.drawImage(wordmarkImage, {
    x: L.MARGIN.left, y: T - IMG_H,
    width: IMG_W, height: IMG_H,
  });

  // Program title + degree — to the right of wordmark
  const textX = L.MARGIN.left + IMG_W + 12;
  const titleText = prog.sequence
    ? `${prog.title} — ${prog.sequence}, ${prog.degree}`
    : `${prog.title}, ${prog.degree}`;
  page.drawText(titleText, {
    x: textX, y: T - 14,
    size: L.FONT.programTitle, font: fonts.bold, color: L.BLACK,
  });

  // Track + catalog year
  page.drawText(`Gen-Ed Track: ${TRACK_LABELS[track]}   ·   Catalog Year: ${prog.catalog_year}`, {
    x: textX, y: T - 28,
    size: 8, font: fonts.reg, color: L.BLACK,
  });

  // Horizontal rule
  const ruleY = T - 44;
  drawRule(page, ruleY);

  return ruleY - 4;
}

// Draws the planning disclaimer below the header rule; returns y below the block.
function drawDisclaimer(page, topY, fonts) {
  const SIZE   = L.FONT.footnote; // 6.5pt
  const LINE_H = 9;
  const PAD    = 4;

  const text =
    'This worksheet is for planning purposes only and is not an authoritative document. ' +
    'If you have questions about your degree progress, please consult with your advisor. ' +
    'For accurate, current degree requirements, consult the University Catalog.';

  const lines = wrapText(fonts.reg, text, SIZE, L.CONTENT_WIDTH);

  let y = topY - PAD - SIZE;
  for (const line of lines) {
    page.drawText(line, { x: L.MARGIN.left, y, size: SIZE, font: fonts.reg, color: L.GRAY_TEXT });
    y -= LINE_H;
  }

  return y - PAD;
}

// Draws student info labels + AcroForm text fields; returns body start y.
function drawStudentInfo(page, form, topY, fonts) {
  const FIELDS = [
    { name: 'student.name',    label: 'Student Name', x: L.MARGIN.left,       width: 178 },
    { name: 'student.id',      label: 'Student ID',   x: L.MARGIN.left + 188, width: 100 },
    { name: 'student.advisor', label: 'Advisor',      x: L.MARGIN.left + 298, width: 148 },
    { name: 'student.date',    label: 'Date',         x: L.MARGIN.left + 456, width:  84 },
  ];

  const FIELD_H   = 16;
  const labelY    = topY - 9;
  const fieldY    = labelY - FIELD_H - 1; // bottom of field widget

  for (const f of FIELDS) {
    page.drawText(f.label, {
      x: f.x, y: labelY,
      size: L.FONT.label, font: fonts.reg, color: L.BLACK,
    });

    const tf = form.createTextField(f.name);
    tf.addToPage(page, {
      x: f.x, y: fieldY,
      width: f.width, height: FIELD_H,
      borderWidth: 0.5,
      borderColor: L.GRAY_BORDER,
      backgroundColor: L.WHITE,
    });
  }

  const ruleY = fieldY - 5;
  drawRule(page, ruleY);

  return ruleY - 5;
}

function buildGradFlagsMap(program) {
  // Only show a flag if this program's degree actually requires it.
  const trackable = new Set((program.graduation_requirements?.trackable || []).map(r => r.id));
  const applicable = new Set([
    'amali', 'ideas',
    ...(trackable.has('bs_smt')            ? ['bs_smt'] : []),
    ...(trackable.has('ba_world_language') ? ['ba_wl']  : []),
  ]);

  const map = new Map();
  for (const c of (program.courses || [])) {
    if (!c.graduation_flags?.length) continue;
    const relevant = c.graduation_flags.filter(f => applicable.has(f));
    if (relevant.length) map.set(c.id, relevant);
  }
  return map;
}

function buildXrefCourseIds(program) {
  const ids = new Set();
  for (const track of (program.general_education?.tracks || [])) {
    for (const group of (track.groups || [])) {
      for (const ref of (group.auto_fulfilled_by || [])) {
        if (!ref.includes('.')) ids.add(ref);
      }
    }
  }
  return ids;
}

function drawRule(page, y) {
  page.drawLine({
    start: { x: L.MARGIN.left, y },
    end:   { x: L.PAGE_WIDTH - L.MARGIN.right, y },
    thickness: 0.5,
    color: L.GRAY_BORDER,
  });
}

module.exports = { buildPDFs, drawRule, TRACK_LABELS };
