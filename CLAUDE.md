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
4. **Catalog Scraper** — Biannual pipeline: scrape catalog → validate → diff → human review
   - API research complete: see `docs/coursedog-api.md` (CourseDog, no auth required, GE14-* attribute strategy confirmed)
   - Gen-ed attribute verification done for 3 of 7 programs: ACC (Financial Accounting), Art History, Physics Teacher Ed
   - **Open item:** MAT 121 in Accounting carries `GE14 - QR` (not `GE14 - MAT`) in CourseDog, but the JSON has it satisfying `isu.mathematics`. Needs human/catalog verification — MAT 121 may presuppose the math gen-ed requirement rather than satisfy it.
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
│   └── programs/              # One JSON file per program sequence
│       ├── acc-financial-bs.json
│       ├── art-history-ba.json
│       ├── ece-pedagogy-bs.json
│       ├── music-comp-theory-bm.json
│       ├── nursing-prelicensure-bsn.json
│       ├── nursing-rn-bsn.json
│       └── physics-teacher-ed-bs.json
├── renderer/
│   ├── build.js               # CLI: node renderer/build.js --all | --program <id>
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
├── output/                    # Generated HTML worksheets and PDFs (gitignored)
├── prototype/
│   └── degree-worksheet.html  # Working HTML prototype (single-file, hardcoded data)
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
- Catalog year format: `"2025-2026"`
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

## Building PDFs

```bash
node pdf/build-pdf.js --all                    # all programs
node pdf/build-pdf.js --program acc-financial-bs  # one program
```

Output goes to `output/<program-id>-<track>.pdf`.

## Running the Prototype

Open `prototype/degree-worksheet.html` directly in a browser — no build step or server required.

## Validating Program Data

```bash
npx ajv-cli validate -s schemas/program-schema.json -d "data/programs/*.json" --spec=draft2020 --strict=false
```

## Working Instructions

These apply to every session — follow them strictly.

1. **Always propose a plan before editing code.** For any non-trivial task, write out the approach and wait for explicit approval before touching files. One or two sentences per step is enough; the goal is alignment, not a novel.

2. **Chunk multi-step work.** Break implementation into named chunks (e.g., "Chunk 1: new module", "Chunk 2: template change", "Chunk 3: runtime update"). Complete one chunk, confirm the output looks right, then ask before proceeding. Never batch all chunks into a single turn.

3. **Never switch to Opus.** Always use Sonnet. Long uninterrupted tool-call sequences cause session resets, which trigger a model switch to Opus. Chunking prevents this. If the user has not explicitly asked for Opus, do not use it.

## Schema Test Programs (7 validated)

1. **Accounting (Financial Accounting), B.S.** — choice groups, exempt gen-ed, senior elective bucket
2. **Art (Art History), B.A.** — language sequence consistency, grouped electives, world-language graduation req
3. **Early Childhood Education (Pedagogy), B.S.** — elective tracks (course bundles), section variants, sibling sequences
4. **Music (Composition/Theory Emphasis), B.M.** — repeatable courses, zero-credit reqs, described pools, level progression
5. **Nursing (Traditional Prelicensure), B.S.N.** — co-requisites, multi-course substitution, phased structure, clinical components
6. **Nursing (RN to BSN), B.S.N.** — escrow credit, credential-gated admission, assumed gen-ed completion
7. **Physics (Teacher Education), B.S.** — college-level requirements, professional education block, compliance requirements
