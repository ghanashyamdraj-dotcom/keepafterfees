/**
 * og-image.mjs — a minimal PNG encoder, and the one social card the site uses.
 *
 * Why this exists: every page declared <meta property="og:image"> pointing at
 * /og/<slug>.png, and the build never wrote /og/ at all. That was a 404 on
 * every link preview the site has ever produced — Slack, WhatsApp, X,
 * LinkedIn, Facebook and Discord all fetch that URL — and 36 broken references
 * in the built output.
 *
 * Why it is written by hand: the repo has zero dependencies and that is worth
 * keeping. Node's zlib is built in, and a PNG is a signature plus three chunks,
 * so an encoder is about sixty lines. No image pipeline, no install.
 *
 * Why there is no text on the card: drawing text needs font data, and
 * embedding a font to render one wordmark would cost more than it returns. The
 * card is the brand mark on the brand ground — the same mark as the favicon
 * and the header — which is what a preview thumbnail is actually read as at
 * the size these are displayed. Social platforms render the page title beside
 * the image from og:title, so the words are already there.
 */

import { deflateSync } from 'node:zlib';

const WIDTH = 1200;
const HEIGHT = 630;

/* --- PNG plumbing -------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** One PNG chunk: length, type, data, CRC over type+data. */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * Encode an RGB pixel buffer as a PNG.
 *
 * Filter byte 0 (None) on every scanline. Filtering exists to help the
 * compressor find patterns; this image is large flat areas of two colours,
 * which deflate already handles well, so the cleverer filters would add code
 * for no measurable gain.
 */
function encodePNG(rgb, width, height) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type 2 = truecolour RGB
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // adaptive filtering
  ihdr[12] = 0;  // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --- the card ------------------------------------------------------------ */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/**
 * Build the card.
 *
 * Geometry is the favicon's, scaled: three bars of descending prominence and a
 * baseline rule beneath them, centred on the obsidian ground. The opacity
 * steps in the SVG become pre-blended colours here, because alpha would mean
 * colour type 6 and a larger file for an image that is composited onto a known
 * solid background anyway.
 */
export function renderOgCard() {
  const GROUND = hex('#0B0F17');
  const MINT = hex('#00E599');

  const rgb = Buffer.alloc(WIDTH * HEIGHT * 3);
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    rgb[i * 3] = GROUND[0];
    rgb[i * 3 + 1] = GROUND[1];
    rgb[i * 3 + 2] = GROUND[2];
  }

  // Pre-blend mint onto the ground at a given opacity.
  const blend = (a) => [
    Math.round(GROUND[0] + (MINT[0] - GROUND[0]) * a),
    Math.round(GROUND[1] + (MINT[1] - GROUND[1]) * a),
    Math.round(GROUND[2] + (MINT[2] - GROUND[2]) * a),
  ];

  const fill = (x0, y0, w, h, colour) => {
    const x1 = Math.min(WIDTH, x0 + w);
    const y1 = Math.min(HEIGHT, y0 + h);
    for (let y = Math.max(0, y0); y < y1; y++) {
      for (let x = Math.max(0, x0); x < x1; x++) {
        const i = (y * WIDTH + x) * 3;
        rgb[i] = colour[0];
        rgb[i + 1] = colour[1];
        rgb[i + 2] = colour[2];
      }
    }
  };

  // The favicon viewBox is 32x32; scale it up and centre it. S=20 puts the
  // mark's 21.7-unit vertical extent at 434px of the 630px height — filling
  // the frame rather than floating in it, which is how this reads at the
  // thumbnail sizes social platforms actually render.
  const S = 20;
  const ox = Math.round((WIDTH - 32 * S) / 2);
  const oy = Math.round((HEIGHT - 32 * S) / 2);
  const at = (x, y, w, h, a) =>
    fill(ox + Math.round(x * S), oy + Math.round(y * S),
      Math.round(w * S), Math.round(h * S), blend(a));

  at(6, 17, 4.5, 8, 0.45);
  at(13.7, 7, 4.5, 18, 1);
  at(21.5, 13, 4.5, 12, 0.7);
  at(4, 26.5, 24, 2.2, 1);

  return encodePNG(rgb, WIDTH, HEIGHT);
}

export const OG_CARD_PATH = '/og-card.png';
