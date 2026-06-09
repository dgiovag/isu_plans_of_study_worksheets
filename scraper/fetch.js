'use strict';

const fs = require('fs');
const path = require('path');

const INSTANCE_ID = 'illinoisstate_peoplesoft_direct';
const CATALOG_ID  = 'TTT3UHqqRwgSw6a5YcUW';
const API_BASE    = 'https://app.coursedog.com/api/v1';

const HEADERS = {
  'Content-Type': 'application/json',
  'Origin':       'https://catalog.illinoisstate.edu',
  'Referer':      'https://catalog.illinoisstate.edu/',
  'User-Agent':   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

const RAW_DIR = path.join(__dirname, 'raw');

function ensureRawDir() {
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
}

function rawPath(name) {
  return path.join(RAW_DIR, `${name}.json`);
}

function readCache(name) {
  const p = rawPath(name);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return null;
}

function writeCache(name, data) {
  ensureRawDir();
  fs.writeFileSync(rawPath(name), JSON.stringify(data, null, 2));
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}\n${body}`);
  }
  return res.json();
}

// POST /programs/search — returns all programs with full requisitesSimple.
// Pass codes (array of Coursedog program codes) to filter, or omit for all programs.
// Results cached to raw/programs-all.json or raw/programs-<codes>.json.
async function fetchPrograms(codes) {
  const cacheKey = codes && codes.length ? `programs-${codes.join('_')}` : 'programs-all';
  const cached = readCache(cacheKey);
  if (cached) {
    console.error(`[fetch] cache hit: ${cacheKey}`);
    return cached;
  }

  const url = `${API_BASE}/cm/${INSTANCE_ID}/programs/search/$filters?catalogId=${CATALOG_ID}&limit=600`;
  const body = codes && codes.length ? { code: { $in: codes } } : {};

  console.error(`[fetch] GET programs (${codes ? codes.join(', ') : 'all'})…`);
  const data = await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
  writeCache(cacheKey, data);
  return data;
}

// POST /courses/search — resolves courseGroupIds to course objects.
// groupIds: array of numeric string IDs (e.g. ["0072861", "0072871"]).
// Results cached to raw/courses-<hash>.json.
async function fetchCourses(groupIds) {
  if (!groupIds || groupIds.length === 0) return [];

  // Sort for stable cache key
  const sorted = [...new Set(groupIds)].sort();
  const cacheKey = `courses-${sorted.slice(0, 6).join('_')}${sorted.length > 6 ? `_and${sorted.length - 6}more` : ''}`;
  const cached = readCache(cacheKey);
  if (cached) {
    console.error(`[fetch] cache hit: ${cacheKey}`);
    return cached;
  }

  const url = [
    `${API_BASE}/cm/${INSTANCE_ID}/courses/search/$filters`,
    `?catalogId=${CATALOG_ID}`,
    `&columns=name,code,subjectCode,courseNumber,credits,attributes,customFields`,
  ].join('');

  console.error(`[fetch] GET courses (${sorted.length} group IDs)…`);
  const data = await apiFetch(url, { method: 'POST', body: JSON.stringify({ courseGroupIds: sorted }) });
  writeCache(cacheKey, data);
  return data;
}

// GET /requisite-sets — resolves university-wide requisite set IDs to their rule structures.
// ids: array of set IDs (e.g. ["c4ZyM1RZfb", "fXb5ZCd3fo"]).
// Results cached to raw/requisite-sets.json.
async function fetchRequisiteSets(ids) {
  if (!ids || ids.length === 0) return {};

  const cacheKey = 'requisite-sets';
  const cached = readCache(cacheKey);
  if (cached) {
    console.error(`[fetch] cache hit: ${cacheKey}`);
    return cached;
  }

  const today = new Date().toISOString().slice(0, 10);
  const url = [
    `${API_BASE}/${INSTANCE_ID}/requisite-sets/`,
    `?list=${ids.join(',')}`,
    `&effectiveDatesRange=${today},${today}`,
  ].join('');

  console.error(`[fetch] GET requisite-sets (${ids.join(', ')})…`);
  const data = await apiFetch(url, { method: 'GET' });
  writeCache(cacheKey, data);
  return data;
}

// University-wide requisite set IDs (stable across catalog years)
const UNIVERSITY_REQ_SETS = {
  AMALI:  'c4ZyM1RZfb',
  IDEAS:  'fXb5ZCd3fo',
  BS_SMT: 'KTBcPIYznf',
  GENED:  'ljV7qrjtoq',
};

module.exports = { fetchPrograms, fetchCourses, fetchRequisiteSets, UNIVERSITY_REQ_SETS };
