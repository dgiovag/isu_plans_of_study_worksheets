'use strict';

// Maps CourseDog course attribute strings to schema gen-ed group IDs.
//
// Attribute format: "<PREFIX> - <CODE> (<Description>)"
// Examples:
//   "GE14 - MAT (Mathematics MAT)"
//   "GE27 - QL (Quantitative Literacy)"
//   "IAI - IS27 (S3 902 Princ of Microeconomics)"
//   "MIAI - BUS903-IAI (BUS903-IAI Financial Accountin)"
//   "BSMT - BS-SMT (BS-SMT Degree Requirement)"

// GE14-* codes → ISU gen-ed group IDs.
// GE14 is the ISU General Education program in effect for the 2014-2015 catalog and later.
const GE14 = {
  'CC':          'isu.communication_composition',
  'MAT':         'isu.mathematics',
  'QR':          'isu.quantitative_reasoning',
  'QR-B.A.DEG':  'isu.quantitative_reasoning',  // B.A. degree variant (seen on language courses)
  'SS':          'isu.social_sciences',
  'FA':          'isu.fine_arts',
  'HUM':         'isu.humanities',
  'LH':          'isu.language_humanities',
  'UST':         'isu.us_traditions',
  'ICL':         'isu.individuals_civic_life',
  'NSB':         'isu.natural_science',
  'NSAC':        'isu.natural_science',           // Alternate NS: Chemistry
  'NSAP':        'isu.natural_science',           // Alternate NS: Physics
  'SCMT':        'isu.science_math_technology',
};

// GE27-* codes → ISU gen-ed group IDs.
// GE27 appears to be a newer gen-ed structure (2027 catalog year or later).
// Only QL confirmed so far; mapped by parallel structure to GE14 equivalents.
const GE27 = {
  'QL':  'isu.quantitative_reasoning',  // Seen on PSY 138 alongside GE14-QR; treat as equivalent
};

// IAI attribute prefix (first letter(s) after "IAI - I") → schema IAI group ID.
// Attribute code format: "I<category><sequence>" e.g. "IC2", "IM1", "IS27"
const IAI_PREFIX = {
  'C':  'iai.communication',
  'M':  'iai.mathematics',
  'S':  'iai.social_sciences',
  'L':  'iai.physical_life_sciences',   // Life sciences
  'P':  'iai.physical_life_sciences',   // Physical sciences
  'H':  'iai.humanities_fine_arts',     // Humanities
  'F':  'iai.humanities_fine_arts',     // Fine Arts
};

// Parses the code portion from a CourseDog attribute string.
// "GE14 - MAT (Mathematics MAT)" → { prefix: "GE14", code: "MAT" }
// "IAI - IS27 (S3 902 ...)"      → { prefix: "IAI",  code: "IS27" }
// Returns null if the format is unrecognised.
function parseAttr(attr) {
  const m = attr.match(/^([A-Z0-9]+)\s+-\s+([^\s(]+)/);
  if (!m) return null;
  return { prefix: m[1], code: m[2] };
}

// Returns the schema gen-ed group ID(s) for a CourseDog attribute string,
// or an empty array if the attribute doesn't map to any schema gen-ed category.
//
// Most attributes map to exactly one group ID, but the function returns an array
// so callers can flat-map without special-casing.
function attributeToGenedIds(attr) {
  const parsed = parseAttr(attr);
  if (!parsed) return [];

  const { prefix, code } = parsed;

  if (prefix === 'GE14') {
    const id = GE14[code];
    return id ? [id] : [];
  }

  if (prefix === 'GE27') {
    const id = GE27[code];
    return id ? [id] : [];
  }

  if (prefix === 'IAI') {
    // code is like "IC2", "IM1", "IS27" — category is first letter after the leading "I"
    if (code.startsWith('I') && code.length >= 2) {
      const categoryLetter = code[1];
      const id = IAI_PREFIX[categoryLetter];
      return id ? [id] : [];
    }
    return [];
  }

  // MIAI and BSMT are handled separately — not gen-ed group IDs
  return [];
}

// Returns true if the attribute is a program-specific IAI equivalency (MIAI-*).
// These indicate a required major course satisfies a program-specific IAI block
// and need special handling in the transformer (not a standard gen-ed group).
function isMiaiAttr(attr) {
  return attr.startsWith('MIAI - ');
}

// Returns true if the attribute indicates the course satisfies the BS-SMT
// graduation requirement.
function isBsmtAttr(attr) {
  return attr.startsWith('BSMT - ');
}

// Returns all unknown attribute prefixes found in a set of attribute strings,
// for use during scraper development to surface unmapped codes.
function unknownAttrs(attrs) {
  const known = new Set(['GE14', 'GE27', 'IAI', 'MIAI', 'BSMT']);
  return attrs.filter(a => {
    const parsed = parseAttr(a);
    if (!parsed) return true;
    if (!known.has(parsed.prefix)) return true;
    // Known prefix but code not in map
    if (parsed.prefix === 'GE14' && !GE14[parsed.code]) return true;
    if (parsed.prefix === 'GE27' && !GE27[parsed.code]) return true;
    return false;
  });
}

module.exports = { attributeToGenedIds, isMiaiAttr, isBsmtAttr, unknownAttrs, parseAttr };
