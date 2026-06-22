'use strict';

// Fetches the ISU gen-ed exemption table from the undergraduate catalog and
// writes scraper/raw/gened-exemptions.json for use by apply-gened-fixes.js.
//
// Usage:
//   node scraper/scrape-gened-exemptions.js
//   node scraper/scrape-gened-exemptions.js --no-cache   (re-fetch HTML)

const fs   = require('fs');
const path = require('path');

const PAGE_URL  = 'https://catalog.illinoisstate.edu/university/requirements/illinois-state-general-education-program';
const RAW_DIR   = path.join(__dirname, 'raw');
const HTML_CACHE = path.join(RAW_DIR, 'gened-exemptions-raw.html');
const JSON_OUT  = path.join(RAW_DIR, 'gened-exemptions.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':     'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Origin':     'https://catalog.illinoisstate.edu',
  'Referer':    'https://catalog.illinoisstate.edu/',
};

// Maps catalog page H3 text → program.college values used in our JSON files
const COLLEGE_MAP = {
  'College of Applied Science and Technology': 'Applied Science and Technology',
  'College of Arts and Sciences':              'College of Arts and Sciences',
  'Wonsook Kim College of Fine Arts':          'Wonsook Kim Coll of Fine Arts',
  'Wonsook Kim Coll of Fine Arts':             'Wonsook Kim Coll of Fine Arts',
  'College of Fine Arts':                      'Wonsook Kim Coll of Fine Arts',
  'College of Business':                       'College of Business',
  'College of Education':                      'College of Education',
  'Mennonite College of Nursing':              'Mennonite College of Nursing',
  'College of Engineering':                    'College of Engineering',
};

// Valid ISU gen-ed exemption codes
const VALID_CODES = new Set(['QR', 'SS', 'SMT', 'LH', 'UST', 'ICL', 'FA', 'NS', 'M', 'H', 'COM']);

// --- Parsing helpers ---------------------------------------------------------

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCodes(str) {
  if (!str || str.trim().toLowerCase() === 'none') return [];
  return str.split(/[\s,/]+/).map(c => c.trim()).filter(c => VALID_CODES.has(c));
}

function isCodeSegment(str) {
  const s = str.trim().toLowerCase();
  if (s === 'none') return true;
  const parts = str.split(/[\s,/]+/).map(c => c.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(c => VALID_CODES.has(c));
}

// Returns the content between the first <ul>...</ul> pair, handling nesting.
function extractFirstUlContent(html) {
  const match = html.match(/<ul[^>]*>/i);
  if (!match) return null;
  const contentStart = html.indexOf(match[0]) + match[0].length;
  let depth = 1;
  let pos   = contentStart;
  while (pos < html.length && depth > 0) {
    const nextOpen  = html.indexOf('<ul',  pos);
    const nextClose = html.indexOf('</ul>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 3;
    } else {
      depth--;
      if (depth === 0) return html.slice(contentStart, nextClose);
      pos = nextClose + 5;
    }
  }
  return null;
}

// Extracts direct-child <li> elements from UL content (skips nested-UL LIs).
function getTopLevelLis(ulContent) {
  const items = [];
  let pos     = 0;
  let liStart = -1;
  let ulDepth = 0;

  while (pos < ulContent.length) {
    const tagStart = ulContent.indexOf('<', pos);
    if (tagStart === -1) break;
    const tagEnd = ulContent.indexOf('>', tagStart);
    if (tagEnd === -1) break;
    const tag = ulContent.slice(tagStart, tagEnd + 1);

    if (/^<li[\s>]/i.test(tag)) {
      if (ulDepth === 0) liStart = tagStart;
    } else if (/^<\/li\s*>/i.test(tag)) {
      if (ulDepth === 0 && liStart !== -1) {
        items.push(ulContent.slice(liStart, tagEnd + 1));
        liStart = -1;
      }
    } else if (/^<ul[\s>]/i.test(tag)) {
      ulDepth++;
    } else if (/^<\/ul\s*>/i.test(tag)) {
      if (ulDepth > 0) ulDepth--;
    }
    pos = tagEnd + 1;
  }
  return items;
}

// Parse "Title - [sequence -] CODES" leaf text.
// Returns { title, sequence, exempt_codes } or null if the last segment is not codes.
function parseLeafText(text) {
  const parts = text.split(' - ').map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1];
  if (!isCodeSegment(last)) return null;

  // Strip "all sequences" suffix (e.g. "French all sequences" → "French")
  let title = parts[0].replace(/\s+all sequences\s*$/i, '').trim();

  const exempt_codes = parseCodes(last);
  let   sequence     = 'All';

  if (parts.length >= 3) {
    const mid = parts.slice(1, -1).join(' - ');
    if (mid.toLowerCase().includes('all major')) {
      // Preserve any parenthetical qualifier (e.g. "one course only")
      const qualifier = mid.match(/\(([^)]+)\)/);
      sequence = qualifier ? `All (${qualifier[1]})` : 'All';
    } else {
      sequence = mid;
    }
  }

  return { title, sequence, exempt_codes };
}

// Parse the HTML block following a college <h3> and return exemption entries.
function parseCollegeBlock(html, collegeName) {
  const results = [];

  // Some colleges list exemptions in a <p> tag rather than a <ul> (e.g. College of Business,
  // Mennonite College of Nursing).  If the first <p> appears before the first <ul>, use
  // the <p> approach so we don't accidentally pick up a navigation <ul> later in the page.
  const firstUlPos = html.search(/<ul[\s>]/i);
  const firstPPos  = html.search(/<p[\s>]/i);
  const usePTags   = firstPPos !== -1 && (firstUlPos === -1 || firstPPos < firstUlPos);

  if (usePTags) {
    // Only consider <p> tags before the first <ul> (or article/section boundary)
    const boundary  = firstUlPos === -1 ? html.length : firstUlPos;
    const pMatches  = [...html.slice(0, boundary).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    for (const m of pMatches) {
      const text   = stripHtml(m[1]).trim();
      const parsed = parseLeafText(text);
      if (parsed) results.push({ college: collegeName, ...parsed });
    }
    if (!results.length) console.warn(`  [warn] No <p> entries parsed for: ${collegeName}`);
    return results;
  }

  const ulContent = extractFirstUlContent(html);
  if (!ulContent) {
    console.warn(`  [warn] No UL or <p> found for: ${collegeName}`);
    return results;
  }

  for (const liHtml of getTopLevelLis(ulContent)) {
    const hasNested = /<ul[\s>]/i.test(liHtml);

    if (hasNested) {
      // LI is a department container with a nested UL of sub-program entries.
      const nestedContent = extractFirstUlContent(liHtml);
      if (!nestedContent) continue;

      for (const subLi of getTopLevelLis(nestedContent)) {
        const text   = stripHtml(subLi).trim();
        const parsed = parseLeafText(text);
        if (parsed) {
          results.push({ college: collegeName, ...parsed });
        } else {
          console.warn(`  [warn] Skipping sub-LI: "${text}"`);
        }
      }

      // Rare case: parent LI also carries its own exemption code before the nested UL
      const textBeforeUl = stripHtml(liHtml.replace(/<ul[\s\S]*/, '')).trim();
      const parentParsed = parseLeafText(textBeforeUl);
      if (parentParsed) {
        console.log(`  [info] Parent LI with codes: "${textBeforeUl}"`);
        results.push({ college: collegeName, ...parentParsed });
      }
    } else {
      const text   = stripHtml(liHtml).trim();
      const parsed = parseLeafText(text);
      if (parsed) {
        results.push({ college: collegeName, ...parsed });
      } else {
        console.warn(`  [warn] Skipping LI: "${text}"`);
      }
    }
  }

  return results;
}

// --- I/O ---------------------------------------------------------------------

async function fetchPage(noCache) {
  if (!noCache && fs.existsSync(HTML_CACHE)) {
    console.log('[cache] Using cached HTML');
    return fs.readFileSync(HTML_CACHE, 'utf8');
  }
  console.log(`[fetch] ${PAGE_URL}`);
  const res = await fetch(PAGE_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${PAGE_URL}`);
  const html = await res.text();
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(HTML_CACHE, html);
  console.log(`[cache] Saved to ${HTML_CACHE}`);
  return html;
}

async function main() {
  const noCache = process.argv.includes('--no-cache');
  const html    = await fetchPage(noCache);
  const results = [];

  // The catalog page uses <h3> headings for each college in the exemption table.
  // Split on every <h3> opening tag; each resulting block starts with the heading text.
  const blocks = html.split(/<h3[^>]*>/i);
  for (const block of blocks.slice(1)) {
    const h3End = block.indexOf('</h3>');
    if (h3End === -1) continue;

    const h3Text    = stripHtml(block.slice(0, h3End)).trim();
    const collegeName = COLLEGE_MAP[h3Text];
    if (!collegeName) continue;

    console.log(`[parse] ${h3Text} → ${collegeName}`);
    const items = parseCollegeBlock(block.slice(h3End + 5), collegeName);
    console.log(`        ${items.length} entries`);
    results.push(...items);
  }

  fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
  console.log(`\n[done] ${results.length} total entries → ${JSON_OUT}`);
}

main().catch(err => { console.error(err); process.exit(1); });
