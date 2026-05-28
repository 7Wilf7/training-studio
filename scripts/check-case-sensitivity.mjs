// One-off: scan src/ for import paths whose case doesn't match the
// on-disk file. Windows is case-insensitive so these "work" locally,
// but Linux (CI) silently fails to resolve them → tree-shaker drops
// the importer + everything it pulls in → bundle missing app code.
import fs from 'node:fs';
import path from 'node:path';

function walk(d) {
  const out = [];
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (/\.(jsx?|tsx?)$/.test(f.name)) out.push(p);
  }
  return out;
}

const files = walk('src');
let problems = 0;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const imps = [...content.matchAll(/from\s+["']([^"']+)["']/g)]
    .map(m => m[1])
    .filter(p => p.startsWith('.'));

  for (const imp of imps) {
    const baseDir = path.dirname(f);
    const resolved = path.resolve(baseDir, imp);
    const candidates = [
      resolved, resolved + '.js', resolved + '.jsx',
      resolved + '.ts', resolved + '.tsx',
      path.join(resolved, 'index.js'), path.join(resolved, 'index.jsx'),
    ];
    const found = candidates.find(c => {
      try { return fs.statSync(c).isFile(); } catch { return false; }
    });
    if (!found) continue;

    // Walk each path component and verify exact case match against the
    // actual entry in its parent directory.
    const rel = path.relative(process.cwd(), found);
    const parts = rel.split(path.sep);
    let curr = '.';
    for (const part of parts) {
      const real = fs.readdirSync(curr);
      if (!real.includes(part)) {
        const actual = real.find(x => x.toLowerCase() === part.toLowerCase());
        console.log(`CASE MISMATCH in ${f}\n  import: ${imp}\n  expected: ${part}\n  actual:   ${actual}\n  in dir:   ${curr}\n`);
        problems++;
        break;
      }
      curr = path.join(curr, part);
    }
  }
}

console.log(`Done. ${problems} problem(s).`);
