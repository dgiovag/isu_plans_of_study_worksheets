'use strict';

const { PDFDocument, StandardFonts } = require('pdf-lib');
const L = require('./layout');
const resolveCourses = require('../renderer/modules/resolve-courses');
const { renderMajor } = require('./modules/render-major-pdf');

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

  const courseMap = resolveCourses(program);

  const page = doc.addPage([L.PAGE_WIDTH, L.PAGE_HEIGHT]);
  const form = doc.getForm();
  const ctx  = { doc, page, form };

  const afterHeader = drawHeader(ctx.page, prog, track, fonts);
  const bodyY = drawStudentInfo(ctx.page, form, afterHeader, fonts);

  // Gen-ed column stub (Chunk 5)
  ctx.page.drawText('[ gen-ed column ]', {
    x: L.MARGIN.left, y: bodyY - 16,
    size: 8, font: fontReg, color: L.GRAY_TEXT,
  });

  // Major column
  renderMajor(ctx, bodyY, program, courseMap, fonts);

  return doc.save();
}

// Draws the top header block; returns the y-coordinate immediately below it.
function drawHeader(page, prog, track, fonts) {
  const W = L.PAGE_WIDTH;
  const H = L.PAGE_HEIGHT;

  // Red bar
  page.drawRectangle({ x: 0, y: H - 5, width: W, height: 5, color: L.RED });

  // Institution label
  page.drawText('Illinois State University', {
    x: L.MARGIN.left, y: H - 17,
    size: L.FONT.institution, font: fonts.reg, color: L.RED,
  });

  // Program title + degree
  const titleText = prog.sequence
    ? `${prog.title} — ${prog.sequence}, ${prog.degree}`
    : `${prog.title}, ${prog.degree}`;
  page.drawText(titleText, {
    x: L.MARGIN.left, y: H - 31,
    size: L.FONT.programTitle, font: fonts.bold, color: L.BLACK,
  });

  // Track + catalog year
  page.drawText(`Gen-Ed Track: ${TRACK_LABELS[track]}   ·   Catalog Year: ${prog.catalog_year}`, {
    x: L.MARGIN.left, y: H - 44,
    size: 8, font: fonts.reg, color: L.BLACK,
  });

  // Horizontal rule
  const ruleY = H - 53;
  drawRule(page, ruleY);

  return ruleY - 4;
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

function drawRule(page, y) {
  page.drawLine({
    start: { x: L.MARGIN.left, y },
    end:   { x: L.PAGE_WIDTH - L.MARGIN.right, y },
    thickness: 0.5,
    color: L.GRAY_BORDER,
  });
}

module.exports = { buildPDFs, drawRule, TRACK_LABELS };
