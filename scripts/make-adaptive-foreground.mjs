// Generate ic_launcher_foreground.png in every mipmap-* density from
// resources/icon-only.png. @capacitor/assets v3 doesn't touch these — it only
// regenerates the legacy ic_launcher.png — so on Android 8+ launchers the
// adaptive icon foreground would otherwise stay as the default Capacitor robot.
//
// Foreground canvas sizes are FIXED by Android (108dp logical, scaled per
// density). The icon content sits in the inner 66% "safe zone" — outer ~17%
// may be cropped or used for parallax depending on launcher mask.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'resources/icon-only.png';

// canvas px = 108 * density_multiplier; icon content fills ~66% of canvas
const DENSITIES = [
  { name: 'mdpi',    canvas: 108 },
  { name: 'hdpi',    canvas: 162 },
  { name: 'xhdpi',   canvas: 216 },
  { name: 'xxhdpi',  canvas: 324 },
  { name: 'xxxhdpi', canvas: 432 },
];

const SAFE_ZONE_RATIO = 0.66;

for (const { name, canvas } of DENSITIES) {
  const dir = `android/app/src/main/res/mipmap-${name}`;
  await mkdir(dir, { recursive: true });

  const iconSize = Math.round(canvas * SAFE_ZONE_RATIO);
  const iconBuf = await sharp(SRC)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: iconBuf, gravity: 'center' }])
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);

  console.log(`✓ ${dir}/ic_launcher_foreground.png  ${canvas}x${canvas} (icon ${iconSize}x${iconSize})`);
}
