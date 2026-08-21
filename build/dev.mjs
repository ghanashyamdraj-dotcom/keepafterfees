/**
 * dev.mjs — build, serve, and rebuild on change.
 *
 * Uses only node: builtins. The project has zero npm dependencies by design,
 * and `npm run serve` shelling out to `npx serve` quietly breaks that (it
 * downloads a package on first run and needs a network). This does the same
 * job with the standard library, so a clean checkout with no network still
 * gets a preview.
 *
 * Not a hot-reload server: it rebuilds the static site and you refresh. For a
 * site whose whole point is that it ships complete HTML, that is the honest
 * loop — you are looking at exactly the bytes a crawler would get.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
};

let building = false;
let queued = false;
/** Wall-clock time the last build finished. See IGNORE_WINDOW_MS below. */
let lastBuildEndedAt = 0;

/**
 * Paths the watcher must ignore because the BUILD ITSELF writes them.
 *
 * gen-rates.mjs compiles src/data/**.json into src/lib/rates.generated.js —
 * a build output that happens to live in the source tree so the browser can
 * import it. Watching it means: build writes it, watcher fires, build runs,
 * writes it again, forever. That loop also races anything else touching dist/,
 * which surfaces as ENOTEMPTY on rmdir or ENOENT in the parity tests.
 */
const IGNORED = [/rates\.generated\.js$/];

/**
 * Ignore filesystem events for a moment after a build finishes. fs.watch on
 * Windows reports writes slightly after the fact, so a generated file can
 * still land here after lastBuildEndedAt is set. Belt and braces with IGNORED.
 */
const IGNORE_WINDOW_MS = 400;

async function build() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    // Cache-bust the module graph so edited source is actually re-read.
    const mod = await import(`./build.mjs?t=${Date.now()}`);
    const run = mod.build ?? mod.default;
    if (typeof run !== 'function') {
      throw new Error('build.mjs exports no build() function to call');
    }
    await run();
  } catch (err) {
    console.error(`\n  build failed: ${err.message}\n`);
  } finally {
    building = false;
    lastBuildEndedAt = Date.now();
    if (queued) {
      queued = false;
      await build();
    }
  }
}

/** Resolve a URL path to a file inside dist/, refusing to escape it. */
async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = normalize(join(dist, clean));
  if (!candidate.startsWith(dist)) return null; // path traversal

  try {
    const s = await stat(candidate);
    if (s.isDirectory()) {
      const index = join(candidate, 'index.html');
      await stat(index);
      return index;
    }
    return candidate;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/');

  if (!file) {
    try {
      const body = await readFile(join(dist, '404.html'));
      res.writeHead(404, { 'content-type': MIME['.html'] });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': MIME['.txt'] });
      res.end('404');
    }
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store', // always see the latest build
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': MIME['.txt'] });
    res.end(`500 ${err.message}`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use — most likely a dev server`);
    console.error(`  from an earlier session that is still running.\n`);
    console.error(`  Free it:`);
    console.error(`    Get-NetTCPConnection -LocalPort ${PORT} -State Listen |`);
    console.error(`      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
    console.error(`  Or use a different port:  $env:PORT=4322; npm run dev\n`);
    process.exit(1);
  }
  throw err;
});

await build();

server.listen(PORT, () => {
  console.log(`\n  AfterFees dev server`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  watching src/ — edit a file, then refresh the page`);
  console.log(`  ctrl+c to stop\n`);
});

let timer = null;
for (const dir of ['src', 'build']) {
  watch(join(root, dir), { recursive: true }, (_event, filename) => {
    if (!filename || filename.endsWith('~')) return;
    if (IGNORED.some((re) => re.test(filename))) return;
    if (building || Date.now() - lastBuildEndedAt < IGNORE_WINDOW_MS) return;

    clearTimeout(timer);
    timer = setTimeout(async () => {
      console.log(`  changed: ${filename}`);
      await build();
      console.log(`  rebuilt — refresh to see it\n`);
    }, 120); // debounce: editors fire several events per save
  });
}
