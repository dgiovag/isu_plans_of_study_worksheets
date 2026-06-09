#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildPDFs } = require('./template-pdf');

const DATA_DIR   = path.join(__dirname, '..', 'data', 'programs');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

function argVal(args, flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

function loadProgram(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function buildOne(programFile, outputDir) {
  const program = loadProgram(programFile);
  const id = program.program.id;
  console.log(`Building PDFs for: ${id}`);

  const pdfs = await buildPDFs(program);

  fs.mkdirSync(outputDir, { recursive: true });
  for (const [track, bytes] of Object.entries(pdfs)) {
    const outPath = path.join(outputDir, `${id}-${track}.pdf`);
    fs.writeFileSync(outPath, bytes);
    console.log(`  → ${path.relative(process.cwd(), outPath)}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dirArg = argVal(args, '--dir');
  const outArg = argVal(args, '--out');
  const dataDir   = dirArg ? path.resolve(dirArg) : DATA_DIR;
  const outputDir = outArg ? path.resolve(outArg)  : OUTPUT_DIR;

  if (args[0] === '--all' || dirArg) {
    const files = fs.readdirSync(dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(dataDir, f));
    const failed = [];
    for (const f of files) {
      try { await buildOne(f, outputDir); }
      catch (err) { console.error(`  ERROR: ${path.basename(f)}: ${err.message}`); failed.push(f); }
    }
    if (failed.length) {
      console.error(`\n${failed.length} program(s) failed:`);
      failed.forEach(f => console.error(`  ${path.basename(f)}`));
      process.exit(1);
    }

  } else if (args[0] === '--program' && args[1]) {
    const filePath = path.join(dataDir, `${args[1]}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`Program not found: ${args[1]}`);
      process.exit(1);
    }
    await buildOne(filePath, outputDir);

  } else {
    console.error('Usage: node pdf/build-pdf.js --all | --program <id> | --dir <path> [--out <path>]');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
