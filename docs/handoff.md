# Session Handoff — ISU Plans of Study Worksheets

This document captures the current project state and the next steps to pick up in a new session. Read CLAUDE.md for full project context.

---

## What Was Done This Session (2026-06-23)

### PDF renderer UX improvements (4 commits)

**Auto-fulfilled row indicator** (`9ffec87`)
- Removed pre-checked AcroForm checkboxes on gen-ed rows with `auto_fulfilled_by`.
- Replaced with bold label text: gen-ed side shows the course code(s) bold, and the corresponding slot(s) in the major column are also bolded.
- Cross-reference set is built once in `template-pdf.js` (`buildXrefCourseIds`) and threaded through both render contexts via `ctx.xrefCourseIds`.
- `render-open-pdf.js` passes `{ bold: true }` to `makeRow`; `render-fixed-pdf.js` checks `ctx.xrefCourseIds` per slot; `row-pdf.js` switches to `fonts.bold` when `opts.bold`.

**Page-break quality** (`744bbd8`)
- `MIN_GROUP_SPACE` raised to `GROUP_TITLE_H + TABLE_HDR_H + 3 × ROW_H` — groups no longer start unless 3 rows fit.
- Widow protection added in `renderSlots` (render-fixed-pdf.js): when 2 rows remain, forces a break to keep them together rather than splitting the last one.

**`choose_n` height estimator fix + bold cross-ref** (`b436f96`)
- `estimateGroupHeight` for `choose_n` was using `group.options.length` (number of available options) instead of `group.n` (number of blank slots rendered). For accntcybs Senior Electives this was 9 vs 2, causing a 105pt false overestimate and a spurious page break.
- `buildXrefCourseIds` + bold threading implemented (described above).

All 300 programs × 3 tracks = 900 PDFs build clean.

---

## Immediate Next Task — Graduation Flags in Course Data

### Goal
Eliminate most of the Graduation Requirements table by annotating AMALI, IDEAS, B.S. SMT, and B.A. World Language flags inline on major courses in both renderers. If a major course satisfies AMALI, the advisor sees it directly on the row — no separate checklist item needed for programs where the major covers it.

### What the data looks like in CourseDog

Attribute strings on courses (from raw cache):

| Requirement | Attribute prefix | Example course | Full attribute string |
|---|---|---|---|
| AMALI | `AMAL - AMALI` | GEO 135 | `"AMAL - AMALI (AMALI Degree Requirement)"` |
| IDEAS | `IDEA - IDEAS` | SED 344 | `"IDEA - IDEAS (IDEAS Graduation Requirement)"` |
| B.S. SMT | `BSMT - BS-SMT` | BSC 219 | `"BSMT - BS-SMT (BS-SMT Degree Requirement)"` |
| B.A. WL | `WLDR - BAWLDR` | FRE 115 | `"WLDR - BAWLDR (BA World Language Degree Req)"` |

Counts across all cached programs: 65 AMALI, 26 IDEAS, 52 SMT, 12 WL (FRE/GER/ITA/SPA 112/115/116).

These attributes are already stored in `c.attributes[]` on each raw course object and are available in `coursesMap` via `buildCoursesMap` in `transform.js`. They are **not** currently propagated to the output JSON.

### Step 1 — Schema update (`schemas/program-schema.json`)

Add an optional `graduation_flags` field to the `Course` definition:

```json
"graduation_flags": {
  "type": "array",
  "items": {
    "type": "string",
    "enum": ["amali", "ideas", "bs_smt", "ba_wl"]
  },
  "description": "Graduation requirements this course can satisfy"
}
```

### Step 2 — Scraper update (`scraper/transform.js`)

Add a helper alongside `attributeToGenedIds`:

```js
function graduationFlagsFromAttr(attrString) {
  if (attrString.startsWith('AMAL - AMALI'))   return ['amali'];
  if (attrString.startsWith('IDEA - IDEAS'))    return ['ideas'];
  if (attrString.startsWith('BSMT - BS-SMT'))  return ['bs_smt'];
  if (attrString.startsWith('WLDR - BAWLDR'))  return ['ba_wl'];
  return [];
}
```

In `buildCoursesSection`, after building `fulfills`, also compute graduation flags and add them to each course object:

```js
const gradFlags = [...new Set(c.attributes.flatMap(a => graduationFlagsFromAttr(a)))];
if (gradFlags.length) entry.graduation_flags = gradFlags;
```

### Step 3 — Re-scrape all programs

```bash
node scraper/scrape.js --all   # or loop over all program codes
```

The raw cache is current; re-scraping will just re-run `transform.js` and rewrite the JSON files. No new API calls needed for programs already in the cache.

Validate after:
```bash
npx ajv-cli validate -s schemas/program-schema.json -d "data/programs/*.json" --spec=draft2020 --strict=false
```

### Step 4 — PDF renderer

In `render-fixed-pdf.js` (`renderSlots`), after the existing `ctx.xrefCourseIds` bold check, look up the course's `graduation_flags` from the courses array and render a compact tag after the label.

**Where to get flags per slot:** The `courses` array in the program JSON has entries with `graduation_flags`. Build a `flagsMap: Map<courseId, string[]>` in `template-pdf.js` alongside `xrefCourseIds`, and attach it to both contexts as `ctx.gradFlagsMap`.

**Display:** A small gray parenthetical appended to the label, e.g. `"ECO 101  (AMALI)"` — rendered at `L.FONT.footnote` size (6.5pt) to the right of the course code, or on a second line in the label cell if the row wraps. Keep it terse: `AMALI`, `IDEAS`, `SMT`, `WL` (4 chars max).

**Graduation panel simplification:** Once flags are rendered inline, update `render-graduation-pdf.js` to suppress or replace the checkbox row for requirements that are covered by at least one major course. For example, if any course in the program has `"amali"` in `graduation_flags`, show the AMALI row as a reference note ("satisfied by [course]") rather than a blank checkbox. If no major course covers it, keep the checkbox so the advisor knows to find one outside the major.

### Step 5 — HTML renderer

Parallel change to the HTML renderer. The runtime already handles `auto_fulfilled_by` cross-references; add a `graduation_flags` display alongside course labels in `renderer/modules/`. The exact module depends on which fill types render course codes — likely `render-fixed.js` and `render-choose-n.js`.

---

## Current State

Working tree: clean (all changes committed to `main`).

PDF output: all 900 PDFs (300 programs × 3 tracks) current in `output/pdf/`.

---

## Open Scraper Gaps (Issue Log — 7 rows)

All require advisor judgment or a departmental call. Nothing automated can resolve them.

| Program | Issue type | What's needed |
|---|---|---|
| `accntcybs-financial-accounting` | `structural_gap` | Split `major.required_courses` into `choose_one` slots for math/writing/IT options |
| `artba-art-history` | `catalog_verify` | Confirm whether language sequence (FRE/GER/ITA/SPA 111/112/115) must be same language across all three levels |
| `artba-art-history` | `credit_assumption` | Verify credit values for ART 240/241/242/244/263/264/265/266/267/279 (absent from CourseDog active catalog) |
| `nurbsn-r-n-to-b-s-n` | `credit_assumption` | Catalog says 34 total escrow credits; individual course records sum to 32 — MCN must confirm |
| `tchecebs-pedagogy` | `structural_gap` | Confirm whether 9 `choose_n(1)` groups are independent choices or specialty track bundles |
| `musbm-composition-theory-emphasis` | `structural_gap` | Confirm credit range, total hours, and level-progression rule for applied music / ensembles |
| `nurbsn-traditional-prelicensure` | `structural_gap` | Split 38-course flat list into phases (foundation / nursing core / clinical) |

---

## Memory / Preferences

- Always propose a plan and wait for approval before touching files.
- Chunk implementation: one chunk per turn, confirm before proceeding.
- Never switch to Opus.
- User commits manually via GitHub Desktop; always suggest a commit message after changes.
- Output files go to `output/html/` and `output/pdf/` by default.
- The review workbook is in `output/review/` — regenerated by `python3 scripts/generate-review-workbook.py`.
- `scraper/raw/` is gitignored; HTML cache and JSON outputs live there and are not committed.
