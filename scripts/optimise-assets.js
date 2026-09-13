// Shrinks the bundled images to what a phone screen can actually show.
//
//   npm run optimise-assets           (report only - shows what would change)
//   npm run optimise-assets -- --write
//
// The photos in "Opening Heros" come straight off a camera at ~4000px and 3MB each; the
// archive pictures and the logo lockups are similarly oversized. None of it is visible at
// phone resolution, but all of it ships inside the app.
//
// Originals are copied to a folder OUTSIDE the project (so Metro never crawls or bundles
// them) before anything is overwritten, and every run re-optimises FROM that backup rather
// than from an already-compressed file. That makes the script safe to run repeatedly -
// no generation loss - and makes it trivial to restore.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PROJECT = path.join(__dirname, '..');
// Deliberately a sibling of the project, not a folder inside it.
const BACKUP = path.join(PROJECT, '..', 'Ithrive30-original-assets');

const WRITE = process.argv.includes('--write');

/**
 * App icons and splash assets are consumed by the native build at fixed sizes - resizing
 * them breaks the icon pipeline. Never touch these.
 */
const PROTECTED = new Set([
  'icon.png',
  'splash-icon.png',
  'favicon.png',
  'android-icon-background.png',
  'android-icon-foreground.png',
  'android-icon-monochrome.png',
]);

const TARGETS = [
  // Full-screen backgrounds behind the daily welcome.
  { dir: 'assets/Opening Heros', maxEdge: 1600, kind: 'jpeg', quality: 80 },
  // Square quote cards - shown in a 3-up grid and a full-screen viewer.
  { dir: 'assets/archive/Quote.Tiles', maxEdge: 1200, kind: 'jpeg', quality: 80 },
  { dir: 'assets/archive/growth-environment', maxEdge: 1600, kind: 'jpeg', quality: 80 },
  { dir: 'assets/archive/gallery', maxEdge: 1600, kind: 'jpeg', quality: 80 },
  { dir: 'assets/archive/success-on-purpose', maxEdge: 1600, kind: 'jpeg', quality: 80 },
  // The logo lockups. Rendered at 240px at the very largest, stored at 2000px.
  { dir: 'assets/images', maxEdge: 1000, kind: 'png', match: /^(iTHRIVE|BOndi)/i },
];

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

async function optimiseFile(absPath, relPath, target) {
  const backupPath = path.join(BACKUP, relPath);

  // Always work from the pristine original so repeated runs don't re-compress a
  // re-compressed file.
  let sourcePath = absPath;
  if (fs.existsSync(backupPath)) {
    sourcePath = backupPath;
  } else if (WRITE) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    sourcePath = backupPath;
  }

  const before = fs.statSync(absPath).size;
  const image = sharp(sourcePath, { failOn: 'none' });
  const meta = await image.metadata();

  let pipeline = image.rotate(); // honour EXIF orientation before we strip it
  if (Math.max(meta.width || 0, meta.height || 0) > target.maxEdge) {
    pipeline = pipeline.resize({
      width: target.maxEdge,
      height: target.maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  pipeline =
    target.kind === 'png'
      ? pipeline.png({ compressionLevel: 9, palette: true, quality: 90 })
      : pipeline.jpeg({ quality: target.quality, mozjpeg: true, chromaSubsampling: '4:2:0' });

  const output = await pipeline.toBuffer();

  // Never make a file bigger than it already is.
  if (output.length >= before) return { before, after: before, skipped: true, meta };
  if (WRITE) fs.writeFileSync(absPath, output);
  return { before, after: output.length, skipped: false, meta };
}

(async () => {
  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;

  for (const target of TARGETS) {
    const dir = path.join(PROJECT, target.dir);
    if (!fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name)
      .filter((name) => /\.(jpe?g|png)$/i.test(name))
      .filter((name) => !PROTECTED.has(name))
      .filter((name) => (target.match ? target.match.test(name) : true));

    if (files.length === 0) continue;

    let dirBefore = 0;
    let dirAfter = 0;
    for (const name of files) {
      const abs = path.join(dir, name);
      const rel = path.join(target.dir, name);
      try {
        const result = await optimiseFile(abs, rel, target);
        dirBefore += result.before;
        dirAfter += result.after;
        if (!result.skipped) changed += 1;
      } catch (err) {
        console.warn(`  ! ${name}: ${err.message}`);
      }
    }

    totalBefore += dirBefore;
    totalAfter += dirAfter;
    const saved = dirBefore > 0 ? Math.round((1 - dirAfter / dirBefore) * 100) : 0;
    console.log(
      `${target.dir.padEnd(34)} ${String(files.length).padStart(3)} files   ` +
        `${mb(dirBefore).padStart(6)}MB -> ${mb(dirAfter).padStart(6)}MB  (-${saved}%)`
    );
  }

  console.log('-'.repeat(78));
  const savedPct = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0;
  console.log(
    `${'TOTAL'.padEnd(34)}              ${mb(totalBefore).padStart(6)}MB -> ${mb(totalAfter).padStart(6)}MB  (-${savedPct}%)`
  );

  if (WRITE) {
    console.log(`\n${changed} file(s) rewritten. Originals kept in:\n  ${path.resolve(BACKUP)}`);
    console.log('\nRestart Metro with a cleared cache so the new files are picked up:\n  npx expo start -c');
  } else {
    console.log('\nDry run - nothing was written. Re-run with --write to apply:');
    console.log('  npm run optimise-assets -- --write');
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
