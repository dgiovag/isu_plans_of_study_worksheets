#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildPDFs } = require('./template-pdf');

const DATA_DIR = path.join(__dirname, '..', 'data', 'programs');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

function loadProgram(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function buildOne(programFile) {
  const program = loadProgram(programFile);
  const id = program.program.id;
  console.log(`Building PDFs for: ${id}`);

  const pdfs = await buildPDFs(program);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const [track, bytes] of Object.entries(pdfs)) {
    const outPath = path.join(OUTPUT_DIR, `${id}-${track}.pdf`);
    fs.writeFileSync(outPath, bytes);
    console.log(`  → ${path.relative(process.cwd(), outPath)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--all') {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(DATA_DIR, f));
    for (const f of files) await buildOne(f);

  } else if (args[0] === '--program' && args[1]) {
    const filePath = path.join(DATA_DIR, `${args[1]}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`Program not found: ${args[1]}`);
      process.exit(1);
    }
    await buildOne(filePath);

  } else {
    console.error('Usage: node pdf/build-pdf.js --all | --program <id>');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
