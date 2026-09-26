// Shared risograph-style palette. Every scene uses ONLY these colours,
// which is what makes scenes by different people feel like one film.

export const pal = {
  paper:  '#f1ebdd', // warm off-white background
  ink:    '#1d2a6b', // deep blue, the "thread" dot and outlines
  blue:   '#3b5bdb', // riso medium blue
  violet: '#5b3fa8', // night skies
  pink:   '#ff4f9a', // fluorescent pink
  orange: '#ff7a3d', // riso orange
  yellow: '#ffd23f', // riso yellow
  teal:   '#2a9d8f', // water, leaves
  night:  '#141a4a', // darkest sky
};

// Parse '#rrggbb' -> 'rgba(r,g,b,a)'
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Linear blend of two hex colours, t in [0, 1].
export function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
