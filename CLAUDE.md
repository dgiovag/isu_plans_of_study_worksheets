# ISU Plans of Study Worksheets

Interactive advising worksheets for Illinois State University transfer students. Produces both web-based (HTML) and fillable PDF worksheets from a shared JSON data source.

## Project Context

- **Owner:** Center for Integrated Professional Development (CIPD), Illinois State University
- **Purpose:** Replace manual PDF/paper advising worksheets with generated, interactive ones
- **Users:** Academic advisors and transfer students from Illinois community colleges
- **Authoritative data source:** ISU undergraduate catalog (web pages, no API)

## Project Phases

1. **Schema** (complete) — JSON Schema v1.0 validated against 6 structurally different programs
2. **HTML Renderer** — Generalize the existing prototype to consume any program JSON
3. **PDF Renderer** — Fillable AcroForm PDFs (no PDF JavaScript), one per gen-ed track
4. **Catalog Scraper** — Biannual pipeline: scrape catalog → validate → diff → human review
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

## Running the Prototype

Open `prototype/degree-worksheet.html` directly in a browser — no build step or server required.

## Validating Program Data

```bash
npx ajv-cli validate -s schemas/program-schema.json -d "data/programs/*.json" --spec=draft2020 --strict=false
```

## Schema Test Programs (6 validated)

1. **Accounting (Financial Accounting), B.S.** — choice groups, exempt gen-ed, senior elective bucket
2. **Art (Art History), B.A.** — language sequence consistency, grouped electives, world-language graduation req
3. **Early Childhood Education (Pedagogy), B.S.** — elective tracks (course bundles), section variants, sibling sequences
4. **Music (Composition/Theory Emphasis), B.M.** — repeatable courses, zero-credit reqs, described pools, level progression
5. **Nursing (Traditional Prelicensure), B.S.N.** — co-requisites, multi-course substitution, phased structure, clinical components
6. **Nursing (RN to BSN), B.S.N.** — escrow credit, credential-gated admission, assumed gen-ed completion
7. **Physics (Teacher Education), B.S.** — college-level requirements, professional education block, compliance requirements
