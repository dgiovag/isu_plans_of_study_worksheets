'use strict';

const { PDFDocument, rgb } = require('pdf-lib');

const TRACKS = ['isu', 'iai', 'ad'];

// ISU red
const RED = rgb(0.808, 0.067, 0.149);

async function buildPDFs(program) {
  const result = {};
  for (const track of TRACKS) {
    result[track] = await buildOnePDF(program, track);
  }
  return result;
}

async function buildOnePDF(program, track) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${program.program.title} — ${program.program.degree} Plan of Study`);
  doc.setAuthor('Illinois State University');

  const page = doc.addPage([612, 792]); // letter portrait
  const { width, height } = page.getSize();

  // Placeholder content so we can verify the file opens
  page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: RED });

  page.drawText(
    `${program.program.title}${program.program.sequence ? ' — ' + program.program.sequence : ''}, ${program.program.degree}`,
    { x: 36, y: height - 28, size: 14, color: RED }
  );

  page.drawText(
    `Gen-Ed Track: ${track.toUpperCase()} | Catalog ${program.program.catalog_year}`,
    { x: 36, y: height - 46, size: 10 }
  );

  page.drawText('(stub — Chunk 2 will render full content)', { x: 36, y: height - 70, size: 9 });

  return await doc.save();
}

module.exports = { buildPDFs };
