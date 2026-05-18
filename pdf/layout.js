'use strict';

const { rgb } = require('pdf-lib');

// Letter portrait: 8.5" × 11" at 72pt/inch
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

const MARGIN = { top: 36, bottom: 36, left: 36, right: 36 };
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right; // 540

// Two-column split (left = gen-ed, right = major)
const COL_GAP = 12;
const COL_LEFT_WIDTH = 252;
const COL_RIGHT_WIDTH = CONTENT_WIDTH - COL_LEFT_WIDTH - COL_GAP; // 276

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
const ROW_H          = 15;
const SECTION_HDR_H  = 18;
const GROUP_TITLE_H  = 14;
const TABLE_HDR_H    = 12;

// Column header row (code | course | grade | term)
const COL_WIDTHS = {
  left: {
    check:  10,
    req:    60,
    course: 118,
    grade:  28,
    term:   36,
    // total: 252
  },
  right: {
    check:  10,
    req:    65,
    course: 135,
    grade:  30,
    term:   36,
    // total: 276
  },
};

// Full-content-width column for graduation/college/compliance panels
const FULL_WIDTHS = { check: 10, req: 80, course: 294, grade: 78, term: 78 };
// check+req+course+grade+term = 10+80+294+78+78 = 540 = CONTENT_WIDTH

module.exports = {
  PAGE_WIDTH, PAGE_HEIGHT, MARGIN, CONTENT_WIDTH,
  COL_GAP, COL_LEFT_WIDTH, COL_RIGHT_WIDTH,
  RED, BLACK, WHITE, GRAY_BORDER, GRAY_BG, GRAY_TEXT, YELLOW_BG,
  FONT, ROW_H, SECTION_HDR_H, GROUP_TITLE_H, TABLE_HDR_H,
  COL_WIDTHS, FULL_WIDTHS,
};
