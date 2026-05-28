// Regenerate ALL Android launcher icon rasters from the full-bleed favicon.jpg.
//
// Why favicon.jpg (not icon-only.png): favicon.jpg is the same artwork the PWA
// uses — a FULL-BLEED 512×512 square whose edges are the design's own dark
// (#1A1A1A). icon-only.png, by contrast, is a rounded tile floating on
// transparent padding. Feeding the rounded-tile-on-transparent into the
// adaptive foreground (shrunk to the 66% safe zone) on a flat #1A1A1A
// background produced a visible "ring": textured tile in the middle, flat
// color around it.
//
// The fix: full-bleed the favicon into the foreground so the artwork reaches
// the canvas edge. Because the favicon's own border pixels ARE #1A1A1A — the
// same as the adaptive <background> color — there's no seam no matter how the
// launcher masks/parallaxes it. The white mountain mark sits centered (~60%
// wide), so it survives the launcher's inner-66% crop with margin. Net result
// matches the PWA icon: edge-to-edge artwork, no ring.
//
// @capacitor/assets is NOT run in CI (the release workflow only does
// `cap sync`), so the committed PNGs here are authoritative — this script
// writes them directly.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'public/favicon.jpg';
const BG = { r: 0x1a, g: 0x1a, b: 0x1a, alpha: 1 };   // matches ic_launcher_background.xml

// Adaptive foreground layers (Android 8+). 108dp logical canvas scaled per
// density. We fill the WHOLE canvas (full bleed) — the launcher applies the
// mask + safe-zone crop itself.
const FOREGROUND = [
  { name: 'mdpi',    px: 108 },
  { name: 'hdpi',    px: 162 },
  { name: 'xhdpi',   px: 216 },
  { name: 'xxhdpi',  px: 324 },
  { name: 'xxxhdpi', px: 432 },
];

// Legacy square + round launcher icons (Android <8). Full bleed; the round
// variant gets a circular alpha mask.
const LEGACY = [
  { name: 'ldpi',    px: 36 },
  { name: 'mdpi',    px: 48 },
  { name: 'hdpi',    px: 72 },
  { name: 'xhdpi',   px: 96 },
  { name: 'xxhdpi',  px: 144 },
  { name: 'xxxhdpi', px: 192 },
];

async function squarePng(px) {
  return sharp(SRC)
    .resize(px, px, { fit: 'cover' })
    .flatten({ background: BG })
    .png()
    .toBuffer();
}

function circleMaskSvg(px) {
  const r = px / 2;
  return Buffer.from(
    `<svg width="${px}" height="${px}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  );
}

for (const { name, px } of FOREGROUND) {
  const dir = `android/app/src/main/res/mipmap-${name}`;
  await mkdir(dir, { recursive: true });
  const buf = await squarePng(px);
  await sharp(buf).toFile(`${dir}/ic_launcher_foreground.png`);
  console.log(`✓ ${dir}/ic_launcher_foreground.png  ${px}x${px} (full-bleed)`);
}

for (const { name, px } of LEGACY) {
  const dir = `android/app/src/main/res/mipmap-${name}`;
  await mkdir(dir, { recursive: true });

  const sq = await squarePng(px);
  await sharp(sq).toFile(`${dir}/ic_launcher.png`);
  console.log(`✓ ${dir}/ic_launcher.png  ${px}x${px}`);

  const round = await sharp(sq)
    .composite([{ input: circleMaskSvg(px), blend: 'dest-in' }])
    .png()
    .toBuffer();
  await sharp(round).toFile(`${dir}/ic_launcher_round.png`);
  console.log(`✓ ${dir}/ic_launcher_round.png  ${px}x${px} (circle)`);
}

console.log('Done. Adaptive <background> stays #1A1A1A (matches favicon edges).');
