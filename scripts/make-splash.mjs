// One-off generator for resources/splash.png.
// Re-run whenever you replace resources/icon-only.png or change the splash
// background color. Output feeds @capacitor/assets, which then fans it out
// into all the per-density splash PNGs under android/app/src/main/res.
import sharp from 'sharp';

const ICON_SRC = 'resources/icon-only.png';
const OUT = 'resources/splash.png';
const SIZE = 2732;        // capacitor-assets expects 2732x2732 splash source
const ICON_SIZE = 720;    // ~26% — fits comfortably inside the safe zone
                          // (Android crops splash edges aggressively on narrow phones)
const BG = '#f2f1ec';     // matches PWA manifest theme/background color

const iconBuf = await sharp(ICON_SRC)
  .resize(ICON_SIZE, ICON_SIZE, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: BG },
})
  .composite([{ input: iconBuf, gravity: 'center' }])
  .png()
  .toFile(OUT);

console.log(`✓ ${OUT}  ${SIZE}x${SIZE}, icon ${ICON_SIZE}x${ICON_SIZE} centered on ${BG}`);
