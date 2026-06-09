#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildHTML } = require('./template');

const DEFAULT_PROGRAMS_DIR = path.join(__dirname, '..', 'data', 'programs');
const DEFAULT_OUTPUT_DIR   = path.join(__dirname, '..', 'output');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { all: false, programId: null, dir: null, out: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all') result.all = true;
    if (args[i] === '--program' && args[i + 1]) result.programId = args[++i];
    if (args[i] === '--dir'     && args[i + 1]) result.dir       = path.resolve(args[++i]);
    if (args[i] === '--out'     && args[i + 1]) result.out       = path.resolve(args[++i]);
  }
  return result;
}

function buildOne(jsonPath, outputDir) {
  const program = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const html = buildHTML(program);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${program.program.id}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`  wrote ${path.relative(process.cwd(), outPath)}`);
}

const { all, programId, dir, out } = parseArgs();
const programsDir = dir || DEFAULT_PROGRAMS_DIR;
const outputDir   = out || DEFAULT_OUTPUT_DIR;

if (all) {
  const files = fs.readdirSync(programsDir).filter(f => f.endsWith('.json'));
  console.log(`Building ${files.length} programs from ${path.relative(process.cwd(), programsDir)}...`);
  let ok = 0;
  const errors = [];
  for (const f of files) {
    try {
      buildOne(path.join(programsDir, f), outputDir);
      ok++;
    } catch (err) {
      console.error(`  ERROR ${f}: ${err.message}`);
      errors.push(f);
    }
  }
  console.log(`Done. ${ok} built${errors.length ? `, ${errors.length} failed` : ''}.`);
} else if (programId) {
  const jsonPath = path.join(programsDir, `${programId}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`Program not found: ${programId}`);
    process.exit(1);
  }
  buildOne(jsonPath, outputDir);
} else {
  console.error('Usage: node renderer/build.js --all | --program <id> [--dir <input>] [--out <output>]');
  process.exit(1);
}
