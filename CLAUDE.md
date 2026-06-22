# ISU Plans of Study Worksheets

Interactive advising worksheets for Illinois State University transfer students. Produces both web-based (HTML) and fillable PDF worksheets from a shared JSON data source.

## Project Context

- **Owner:** Center for Integrated Professional Development (CIPD), Illinois State University
- **Purpose:** Replace manual PDF/paper advising worksheets with generated, interactive ones
- **Users:** Academic advisors and transfer students from Illinois community colleges
- **Authoritative data source:** ISU undergraduate catalog (web pages, no API)

## Project Phases

1. **Schema** (complete) — JSON Schema v1.0 validated against 7 structurally different programs
2. **HTML Renderer** (in progress) — Generalize the existing prototype to consume any program JSON
3. **PDF Renderer** (substantially complete) — Fillable AcroForm PDFs (no PDF JavaScript), one per gen-ed track
4. **Catalog Scraper** (first-pass complete) — Biannual pipeline: scrape catalog → validate → diff → human review
   - Pipeline working end-to-end: `scraper/scrape.js` → `scraper/fetch.js` → `scraper/transform.js` + `scraper/gened-map.js`
   - Full catalog scraped: 300 active programs in `data/programs/`; 7 original hand-crafted test files in `data/programs/legacy/`
   - API docs: `docs/coursedog-api.md` (CourseDog, CORS-only auth, GE14-* attribute strategy)
   - CourseDog codes: ACCNTCYBS, ARTBA, TCHECEBS, MUSBM, NURBSN (prelicensure + RN-to-BSN), PHYBS
   - **Human annotation required** (not encodeable from API — see "Scraper Known Gaps" section below)
5. **CC Articulation (stretch)** — Per-community-college worksheets for all 48 Illinois CCs

## Architecture

```
Program JSON  ──→  HTML Renderer  ──→  Interactive worksheet (.html)
     │
     └──────────→  PDF Renderer   ──→  Fillable PDFs (3 per program, one per track)

Catalog Scraper  ──→  Program JSON (validated, human-reviewed)
```

The **schema is the contract** between the scraper and both renderers. All components can be developed independently once the schema is stable.

## Repository Structure

```
├── CLAUDE.md                  # This file
├── schemas/
│   ├── program-schema.json    # Formal JSON Schema (draft 2020-12)
│   └── SCHEMA-RATIONALE.md    # Design decisions and rejected alternatives
├── data/
│   └── programs/              # One JSON file per program sequence (300 active)
│       └── legacy/            # Original 7 hand-crafted test files (superseded)
├── renderer/
│   ├── build.js               # CLI: node renderer/build.js --all | --program <id>
│   ├── build-index.js         # CLI: node renderer/build-index.js → output/index.html
│   ├── template.js            # HTML document assembly
│   ├── runtime.js             # Client-side JS (inlined into every worksheet)
│   ├── css.js                 # Styles (inlined)
│   └── modules/               # One file per fill type + utilities
│       ├── build-xref-map.js  # Computes cross-reference row links at build time
│       └── ...
├── pdf/
│   ├── build-pdf.js           # CLI: node pdf/build-pdf.js --all | --program <id>
│   ├── layout.js              # All layout constants (dimensions, colors, fonts, column widths)
│   ├── template-pdf.js        # Document assembly, header, student info fields, panel placement
│   └── modules/
│       ├── row-pdf.js                    # Core row primitive, page-break logic, wrapText
│       ├── table-pdf.js                  # Section/group title bars, table headers, notes
│       ├── render-group-pdf.js           # Fill-type dispatch + whole-table page-break estimation
│       ├── render-fixed-pdf.js
│       ├── render-choose-one-pdf.js
│       ├── render-choose-n-pdf.js
│       ├── render-choose-n-grouped-pdf.js
│       ├── render-choose-one-track-pdf.js
│       ├── render-open-pdf.js
│       ├── render-open-constrained-pdf.js
│       ├── render-repeat-pdf.js
│       ├── render-escrow-pdf.js
│       ├── render-gened-pdf.js           # Left column: gen-ed track rendering + associates fields
│       ├── render-major-pdf.js           # Right column: major groups (handles phased programs)
│       ├── render-graduation-pdf.js      # Below gen-ed in left column: trackable checklist
│       ├── render-college-pdf.js         # Full-width: college-level requirements
│       └── render-compliance-pdf.js      # Full-width: compliance checklist grouped by category
├── scraper/
│   ├── scrape.js              # CLI: node scraper/scrape.js --program <CODE> [--sequence <name>] [--program-id <id>] [--dry-run] [--force]
│   ├── fetch.js               # CourseDog API wrapper (caches to scraper/raw/, batches ≤50 IDs per courses request)
│   ├── transform.js           # CourseDog program JSON → schema JSON
│   ├── gened-map.js           # CourseDog attribute strings → schema gen-ed group IDs
│   ├── inspect.js             # Dev tool: dump raw CourseDog data for one program
│   └── raw/                   # Cached API responses (gitignored)
├── output/                    # Generated artifacts (gitignored)
│   ├── index.html             # Navigation index (generated by build-index.js)
│   ├── html/                  # Generated HTML worksheets (one per program)
│   └── pdf/                   # Generated PDFs (three per program, one per track)
├── legacy/
│   └── prototype/
│       └── degree-worksheet.html  # Original single-file hardcoded prototype (archived)
└── docs/
    └── transfer-worksheet-brief2.docx  # Full project brief
```

## Key Domain Concepts

- **Three gen-ed tracks:** ISU Gen Ed, IAI Transferable Core, completed Associate's degree
- **Cross-references:** A single course can fill slots in both major and gen-ed (e.g., ECO 101 fills major requirement AND IAI Social Sciences)
- **Graduation requirements:** Universal (120 hrs, 40 senior hrs, AMALI, IDEAS) + conditional (B.S. → SMT, B.A. → world language)
- **Fill types (10):** `fixed`, `choose_one`, `choose_n`, `choose_n_grouped`, `choose_one_track`, `open`, `open_constrained`, `repeat`, `escrow`
- **Exempt slots:** Some gen-ed categories are waived by the major's disciplinary expertise
- **Phases:** Programs with temporal gates (e.g., Nursing: pre-nursing → nursing sequence)
- **Constraints:** Cross-group rules (e.g., language sequence must be same language)

## Conventions

- Program JSON files are named `<program-id>.json` (e.g., `acc-financial-bs.json`)
- PDF naming: `<program>-<track>.pdf` (e.g., `acc-financial-bs-iai.pdf`)
- Catalog year format: `"2026-2027"`
- Course codes use space separator: `"ACC 131"`, IDs omit the space and are uppercase: `"ACC131"`
- Group IDs use dot notation: `"major.required"`, `"iai.social_sciences"`, `"isu.mathematics"`
- Schema version: `"1.0"` (set in `$schema_version` field of each program JSON)

## Design Constraints

- No server-side storage or authentication — static artifacts only
- PDF must use AcroForm fields only (no PDF JavaScript — unreliable outside Acrobat)
- HTML version prints cleanly to letter-size paper (landscape, 1-2 pages)
- Schema must support multiple active catalog years simultaneously
- Every requirement slot needs a stable ID for Phase 5 articulation references

## Phase 2 HTML Renderer — Completed Features

- Two-column layout (gen-ed / major), track toggle, per-row fields, live progress totals
- All 10 fill types rendered
- Cross-reference propagation: checking a row that satisfies both major and gen-ed automatically checks the linked row in the other column (`build-xref-map.js` + `propagateXref()` in runtime)
- `auto_fulfilled_by` rows show a visual indicator but are NOT pre-checked — only `exempt` rows start checked

## Phase 3 PDF Renderer — Completed Features

- Portrait letter (8.5"×11"), 0.5" margins, two-column layout (gen-ed left / major right)
- All 10 fill types rendered with AcroForm checkboxes + text fields (no PDF JavaScript)
- Three gen-ed tracks per program: `isu`, `iai`, `ad` (AD track shows IAI groups + associates credential fields)
- Page breaks: independent pagination per column (`leftCtx`/`rightCtx` share doc/form, separate page refs); whole-table break estimation prevents headers from being orphaned at page bottom
- `open` / `open_constrained` groups collapse the Requirement column (no label needed)
- Graduation requirements panel: in left column below gen-ed, narrow mode (no note column)
- College requirements panel: full-width, only rendered when program has `college_requirements`
- Compliance requirements panel: full-width, grouped by category, only when present
- Tested against all 7 schema programs — 21 PDFs (3 per program) build without errors

## Building Worksheets

```bash
# Navigation index
node renderer/build-index.js                      # → output/index.html

# HTML
node renderer/build.js --all                                      # all programs → output/html/
node renderer/build.js --program accntcybs-financial-accounting   # one program

# PDF
node pdf/build-pdf.js --all                                       # all programs → output/pdf/
node pdf/build-pdf.js --program accntcybs-financial-accounting    # one program
```

Both scripts accept `--out <dir>` to override the default output directory.

## Running the Prototype

The original single-file prototype is archived at `legacy/prototype/degree-worksheet.html` and can be opened directly in a browser for reference.

## Validating Program Data

```bash
npx ajv-cli validate -s schemas/program-schema.json -d "data/programs/*.json" --spec=draft2020 --strict=false
# Note: does not recurse into data/programs/legacy/ by default
```

## Running the Scraper

```bash
# List all active undergrad programs with their CourseDog codes
node scraper/scrape.js --list

# Scrape one program (--dry-run to preview without writing)
node scraper/scrape.js --program ACCNTCYBS --sequence "Financial Accounting"
node scraper/scrape.js --program ARTBA     --sequence "Art History"
node scraper/scrape.js --program TCHECEBS  --sequence "Pedagogy"
node scraper/scrape.js --program MUSBM     --sequence "Composition/Theory"
node scraper/scrape.js --program NURBSN    --sequence "Traditional Prelicensure"
node scraper/scrape.js --program NURBSN    --sequence "R.N. to B.S.N."
node scraper/scrape.js --program PHYBS     --sequence "Physics Teacher Education"

# --force overwrites existing files; --out <dir> redirects output (default: data/programs/)
```

Raw API responses are cached in `scraper/raw/` and reused on subsequent runs. To re-fetch, delete the relevant cache files.

## Scraper Known Gaps (require human annotation)

These structural features cannot be derived from CourseDog and must be added manually after scraping:

| Program (new ID) | Gap | What to add |
|---|---|---|
| accntcybs-financial-accounting | Inline choose_ones in the required block | Split `major.required_courses` into separate `choose_one` slots for math/writing/IT options |
| artba-art-history | Language sequence consistency constraint | Inline choose_ones for FRE/GER/ITA/SPA 111/112/115 already encoded by scraper; elective group restructured to `choose_n`. Remaining: advisor must confirm whether same-language constraint applies across all three levels before encoding in `major.constraints` |
| tchecebs-pedagogy | Elective track | Replace generic `choose_n` groups with `choose_one_track` and proper slot labels |
| musbm-composition-theory-emphasis | Applied music & ensembles | Change `open` groups to `repeat` with credit ranges; add course options from catalog |
| nurbsn-traditional-prelicensure | Phase structure | Split flat `major.required_courses` into `phases: [{foundation}, {nursing_core}, {clinical}]` |
| ALL | exempt vs auto_fulfilled_by | Every `auto_fulfilled_by` warning needs catalog verification — some should become `exempt: true` |
| ACC MAT 121 | Math gen-ed | MAT 121 carries `GE14-QR` (not `GE14-MAT`) in CourseDog — verify whether it satisfies or presupposes the math requirement |
| nurbsn-r-n-to-b-s-n | Escrow credit total | Escrow group added; individual course credits from legacy data sum to 32, catalog note says 34 — Mennonite College of Nursing must confirm |

## Working Instructions

These apply to every session — follow them strictly.

1. **Always propose a plan before editing code.** For any non-trivial task, write out the approach and wait for explicit approval before touching files. One or two sentences per step is enough; the goal is alignment, not a novel.

2. **Chunk multi-step work.** Break implementation into named chunks (e.g., "Chunk 1: new module", "Chunk 2: template change", "Chunk 3: runtime update"). Complete one chunk, confirm the output looks right, then ask before proceeding. Never batch all chunks into a single turn.

3. **Never switch to Opus.** Always use Sonnet. Long uninterrupted tool-call sequences cause session resets, which trigger a model switch to Opus. Chunking prevents this. If the user has not explicitly asked for Opus, do not use it.

## Schema Test Programs (7 validated)

The original hand-crafted versions are in `data/programs/legacy/`. The canonical active versions are the scraped files below.

1. **Accounting (Financial Accounting), B.S.** (`accntcybs-financial-accounting`) — choice groups, exempt gen-ed, senior elective bucket
2. **Art (Art History), B.A.** (`artba-art-history`) — language sequence consistency, grouped electives, world-language graduation req
3. **Early Childhood Education (Pedagogy), B.S.** (`tchecebs-pedagogy`) — elective tracks (course bundles), section variants, sibling sequences
4. **Music (Composition/Theory Emphasis), B.M.** (`musbm-composition-theory-emphasis`) — repeatable courses, zero-credit reqs, described pools, level progression
5. **Nursing (Traditional Prelicensure), B.S.N.** (`nurbsn-traditional-prelicensure`) — co-requisites, multi-course substitution, phased structure, clinical components
6. **Nursing (RN to BSN), B.S.N.** (`nurbsn-r-n-to-b-s-n`) — escrow credit, credential-gated admission, assumed gen-ed completion
7. **Physics (Teacher Education), B.S.** (`phybs-physics-teacher-education`) — college-level requirements, professional education block, compliance requirements
