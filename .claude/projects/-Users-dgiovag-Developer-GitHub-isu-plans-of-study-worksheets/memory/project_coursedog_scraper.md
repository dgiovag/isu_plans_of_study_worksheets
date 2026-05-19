---
name: project-coursedog-scraper
description: Catalog scraper (Phase 4) — Coursedog API discovered and documented, ready to build
metadata:
  type: project
---

Phase 4 catalog scraper research is complete. Full findings are in `docs/coursedog-api.md`.

**Platform:** Coursedog (`illinoisstate_peoplesoft_direct`, catalog ID `TTT3UHqqRwgSw6a5YcUW`)

**Auth:** No token needed — just `Origin: https://catalog.illinoisstate.edu` header on every request.

**Key insight:** The single bulk programs endpoint returns ALL 567 programs with full requirement data in one call. No per-program fetches required.

**Gen-ed exemptions:** Encoded in course attributes (`GE14 - SS`, `GE14 - QR`, etc.) on required major courses — NOT in the program-level gen-ed rules. The `courseSets` endpoint (gen-ed eligibility lists) is not publicly accessible, but not needed for exemption detection.

**Scraper is sanctioned by the Registrar** — this project was commissioned by them.

**Why:** The catalog was recently migrated to Coursedog from a prior system, making the old data source obsolete. The scraper replaces manual data entry for the JSON program files.

**How to apply:** When building the scraper, start from `docs/coursedog-api.md` which has the full endpoint reference, data model, field mappings, and open questions.
