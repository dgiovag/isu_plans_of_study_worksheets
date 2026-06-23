'use strict';

const { rgb } = require('pdf-lib');

// Landscape letter: 11" × 8.5" at 72pt/inch
const PAGE_WIDTH  = 792;
const PAGE_HEIGHT = 612;

const MARGIN = { top: 36, bottom: 36, left: 36, right: 36 };
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right; // 720

// Two halves: gen-ed (left) + major (right)
const HALF_GAP   = 16;
const HALF_WIDTH = Math.floor((CONTENT_WIDTH - HALF_GAP) / 2); // 352

// Two sub-columns within each half (used in Chunks 2/3)
const SUB_GAP      = 8;
const SUB_COL_WIDTH = Math.floor((HALF_WIDTH - SUB_GAP) / 2); // 172

// Colors
const RED         = rgb(0.808, 0.067, 0.149); // ISU #CE1126
const BLACK       = rgb(0, 0, 0);
const WHITE       = rgb(1, 1, 1);
const GRAY_BORDER = rgb(0.75, 0.75, 0.75);
const GRAY_BG     = rgb(0.93, 0.93, 0.93);
const GRAY_TEXT   = rgb(0.4, 0.4, 0.4);
const YELLOW_BG   = rgb(1.0, 0.97, 0.80); // escrow blocks

// Font sizes (pt)
const FONT = {
  programTitle:  13,
  institution:    9,
  sectionTitle:   9,
  groupTitle:     8,
  tableHeader:    7,
  tableBody:      7.5,
  label:          7,
  footnote:       6.5,
};

// Row heights (pt)
const ROW_H         = 15;
const SECTION_HDR_H = 18;
const GROUP_TITLE_H = 14;
const TABLE_HDR_H   = 12;

// Column widths: check + req + course + hours + grade + term
// req is the label/code area; hours is the new credit-hours field.
// Stopgap single-column half widths (used until Chunks 2/3 split into sub-cols).
const COL_WIDTHS = {
  left: {
    check: 8, req: 55, course: 175, hours: 24, grade: 45, term: 45,
    // total: 352 = HALF_WIDTH
  },
  right: {
    check: 8, req: 65, course: 165, hours: 24, grade: 45, term: 45,
    // total: 352 = HALF_WIDTH
  },
  // Sub-column widths for 2-sub-col layout (Chunks 2/3)
  sub: {
    check: 8, req: 40, course: 68, hours: 18, grade: 20, term: 18,
    // total: 172 = SUB_COL_WIDTH
  },
};

// Full-content-width columns for graduation/college/compliance panels
const FULL_WIDTHS = {
  check: 10, req: 80, course: 370, hours: 60, grade: 100, term: 100,
  // total: 720 = CONTENT_WIDTH
};

// Kept for panels that reference the old column-edge names
const COL_LEFT_WIDTH  = HALF_WIDTH;  // 352
const COL_RIGHT_WIDTH = HALF_WIDTH;  // 352
const COL_GAP         = HALF_GAP;    // 16

module.exports = {
  PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
  HALF_GAP, HALF_WIDTH, SUB_GAP, SUB_COL_WIDTH,
  COL_GAP, COL_LEFT_WIDTH, COL_RIGHT_WIDTH,
  RED, BLACK, WHITE, GRAY_BORDER, GRAY_BG, GRAY_TEXT, YELLOW_BG,
  FONT, ROW_H, SECTION_HDR_H, GROUP_TITLE_H, TABLE_HDR_H,
  COL_WIDTHS, FULL_WIDTHS,
};
