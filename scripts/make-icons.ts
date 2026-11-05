// Draws the app icon (a simple stroke glyph "口" on the dark theme) as PNG files, no dependencies.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { path } from './lib/io.ts';

const BG = [0x13, 0x18, 0x20], CARD = [0x1c, 0x24, 0x30], ACCENT = [0xe3, 0xa8, 0x3b];

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function icon(size: number, maskable: boolean): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const inset = maskable ? 0.2 : 0.08;         // maskable icons keep content in the safe zone
  const r = size * 0.18;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // rounded card
      const lo = inset, hi = 1 - inset;
      const cx = Math.min(Math.max(x, lo * size + r), hi * size - r), cy = Math.min(Math.max(y, lo * size + r), hi * size - r);
      const inCard = u >= lo && u <= hi && v >= lo && v <= hi && Math.hypot(x - cx, y - cy) <= r;
      // glyph 口: square outline
      const g0 = 0.33, g1 = 0.67, w = 0.055;
      const inBox = u >= g0 && u <= g1 && v >= g0 && v <= g1 + 0.02;
      const inner = u >= g0 + w && u <= g1 - w && v >= g0 + w && v <= g1 + 0.02 - w;
      const col = inBox && !inner ? ACCENT : inCard ? CARD : BG;
      raw.set(col, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(path('public/icons'), { recursive: true });
for (const [name, size, mask] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]] as const)
  writeFileSync(path(`public/icons/${name}`), icon(size, mask));
console.log('icons written to public/icons');
