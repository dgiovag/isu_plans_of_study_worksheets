#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildHTML } = require('./template');

const PROGRAMS_DIR = path.join(__dirname, '..', 'data', 'programs');
const OUTPUT_DIR  = path.join(__dirname, '..', 'output');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { all: false, programId: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') result.all = true;
    if (args[i] === '--program' && args[i + 1]) result.programId = args[++i];
  }
  return result;
}

function buildOne(jsonPath) {
  const program = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const html = buildHTML(program);
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${program.program.id}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`  wrote ${path.relative(process.cwd(), outPath)}`);
}

const { all, programId } = parseArgs();

if (all) {
  const files = fs.readdirSync(PROGRAMS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Building ${files.length} programs...`);
  for (const f of files) buildOne(path.join(PROGRAMS_DIR, f));
  console.log('Done.');
} else if (programId) {
  const jsonPath = path.join(PROGRAMS_DIR, `${programId}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`Program not found: ${programId}`);
    process.exit(1);
  }
  buildOne(jsonPath);
} else {
  console.error('Usage: node renderer/build.js --all | --program <id>');
  process.exit(1);
}
