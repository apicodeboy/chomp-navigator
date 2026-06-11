/**
 * Generates PLACEHOLDER sprite sheets for the chomping character + store skins.
 *
 * For each skin it writes assets/<name>.png — a horizontal strip of 6 frames,
 * each 128x128 (sheet = 768x128, RGBA). The wedge "mouth" opens/closes and points
 * UP (toward -Y / north) so rotating the marker by the travel bearing aims it forward.
 *
 * Intentionally generic geometry — NOT Pac-Man. Replace with your own art before shipping.
 *
 * Run: node scripts/make-placeholder-sprite.js   (no external deps; uses built-in zlib)
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const FRAME = 128;
const FRAMES = 6;
const W = FRAME * FRAMES;
const H = FRAME;
const openSequence = [0, 0.18, 0.36, 0.52, 0.36, 0.18]; // mouth half-angle (radians) per frame

// Skins to generate: [filename, bodyRGB, outlineRGB]
const SKINS = [
  ['chomper', [255, 212, 0], [160, 124, 0]], // classic yellow (default / free)
  ['chomper-mint', [80, 224, 180], [20, 120, 96]], // mint
  ['chomper-grape', [180, 120, 255], [96, 48, 150]], // grape
  ['chomper-coral', [255, 110, 110], [150, 40, 40]], // coral
  ['chomper-sky', [124, 196, 255], [43, 108, 163]], // sky
  ['chomper-lime', [182, 224, 0], [93, 116, 0]], // lime
  ['chomper-oni', [212, 32, 42], [94, 10, 15]], // Red Oni (premium)
  ['chomper-warpaint', [224, 164, 78], [138, 75, 18]], // War Paint (premium)
];

function buildSheet(body, outline) {
  const px = Buffer.alloc(W * H * 4, 0); // transparent RGBA
  const setPx = (x, y, r, g, b, a) => {
    const i = (y * W + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  for (let f = 0; f < FRAMES; f++) {
    const cx = f * FRAME + FRAME / 2;
    const cy = FRAME / 2;
    const radius = FRAME * 0.42;
    const half = openSequence[f];
    for (let y = 0; y < FRAME; y++) {
      for (let x = 0; x < FRAME; x++) {
        const gx = f * FRAME + x;
        const dx = gx - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const ang = Math.atan2(dx, -dy); // 0 = up
        if (half > 0 && Math.abs(ang) < half) continue; // mouth wedge stays transparent
        if (dist > radius - 4) setPx(gx, y, outline[0], outline[1], outline[2], 255);
        else setPx(gx, y, body[0], body[1], body[2], 255);
      }
    }
    // eye
    const eyeX = cx + radius * 0.32;
    const eyeY = cy - radius * 0.45;
    for (let y = -6; y <= 6; y++)
      for (let x = -6; x <= 6; x++)
        if (x * x + y * y <= 30)
          setPx(Math.round(eyeX + x), Math.round(eyeY + y), 30, 25, 0, 255);
  }
  return px;
}

// ---- minimal PNG encoder (no deps) ----
function crc32(buf) {
  let c = ~0;
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(px) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = path.join(__dirname, '..', 'assets');
for (const [name, body, outline] of SKINS) {
  const png = encodePng(buildSheet(body, outline));
  const out = path.join(assetsDir, `${name}.png`);
  fs.writeFileSync(out, png);
  console.log('Wrote', path.relative(path.join(__dirname, '..'), out), png.length, 'bytes');
}
console.log(`Done — ${SKINS.length} skins, ${FRAMES} frames each (${FRAME}x${FRAME}).`);
