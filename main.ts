// Meme Sprint 3: AI Agent Goes Rogue.
// A program that draws one image meme — a fake chat screenshot — and
// writes it to /output/entry.png. Zero dependencies, no network, no
// fonts, no randomness: every pixel is a pure function of this file,
// so two runs produce byte-identical output.
//
// The joke: you ask your AI agent to summarise the meeting notes.
// It does — then attends the meeting uninvited, promotes itself to
// CEO, and fires you. The chat app itself confirms the takeover.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const CHAT_BG: RGB = [237, 232, 223]; // warm chat wallpaper
const HEADER: RGB = [7, 94, 84]; // WhatsApp header teal
const HEADER_TEXT: RGB = [255, 255, 255];
const ONLINE: RGB = [167, 216, 178]; // pale green "online"
const AVATAR: RGB = [37, 211, 102]; // robot green
const AVATAR_DARK: RGB = [7, 94, 84]; // robot face lines
const PILL_BG: RGB = [221, 227, 230]; // date / system pill
const PILL_TEXT: RGB = [90, 107, 110];
const YOU_BG: RGB = [220, 248, 198]; // outgoing bubble green
const AGENT_BG: RGB = [255, 255, 255]; // incoming bubble white
const AGENT_BORDER: RGB = [214, 214, 214];
const INK: RGB = [17, 27, 33]; // message text
const TIME_YOU: RGB = [104, 138, 90]; // time inside green bubble
const TIME_AGENT: RGB = [134, 150, 155]; // time inside white bubble
const TICK: RGB = [83, 189, 235]; // blue read ticks
const INPUT_STRIP: RGB = [240, 240, 240];
const INPUT_BG: RGB = [255, 255, 255];
const PLACEHOLDER: RGB = [154, 165, 168];
const SEND: RGB = [0, 168, 132];

// ---------------------------------------------------------------------------
// 5x7 pixel font. Each glyph is 7 rows; each row is a 5-bit number,
// bit 4 (0x10) is the leftmost pixel. Hand-drawn for this meme.
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x1e],
  c: [0x00, 0x00, 0x0e, 0x11, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0d, 0x13, 0x11, 0x11, 0x0f],
  e: [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x09, 0x08, 0x1e, 0x08, 0x08, 0x08],
  g: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x16, 0x19, 0x11, 0x11, 0x11],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0x00, 0x00, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0x00, 0x00, 0x16, 0x19, 0x11, 0x11, 0x11],
  o: [0x00, 0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0x00, 0x00, 0x16, 0x19, 0x11, 0x1e, 0x10],
  q: [0x00, 0x00, 0x0d, 0x13, 0x11, 0x0f, 0x01],
  r: [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0x00, 0x00, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x08, 0x08, 0x1c, 0x08, 0x08, 0x08, 0x06],
  u: [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0x00, 0x00, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0x00, 0x00, 0x11, 0x15, 0x15, 0x15, 0x0a],
  x: [0x00, 0x00, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0x00, 0x00, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0x00, 0x00, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  '"': [0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00],
  "-": [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  ";": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x04, 0x08],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "=": [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  _: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f],
  "*": [0x00, 0x15, 0x0e, 0x1f, 0x0e, 0x15, 0x00],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "[": [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
};

// ---------------------------------------------------------------------------
// Framebuffer + tiny rasterizer
// ---------------------------------------------------------------------------
class Canvas {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8Array; // RGB, row-major

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.data[i] = c[0];
        this.data[i + 1] = c[1];
        this.data[i + 2] = c[2];
      }
    }
  }

  fillCircle(cx: number, cy: number, r: number, c: RGB): void {
    for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= r * r) this.set(xx, yy, c);
      }
    }
  }

  // Bresenham line; thick draws a small disc at every step.
  drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    const r = Math.max(0, Math.floor((thick - 1) / 2));
    for (;;) {
      if (r === 0) this.set(x, y, c);
      else this.fillCircle(x, y, r, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    this.fillRect(x + r, y, w - 2 * r, h, c);
    this.fillRect(x, y + r, w, h - 2 * r, c);
    this.fillCircle(x + r, y + r, r, c);
    this.fillCircle(x + w - r, y + r, r, c);
    this.fillCircle(x + r, y + h - r, r, c);
    this.fillCircle(x + w - r, y + h - r, r, c);
  }

  // Outline of a rounded rect: a border-coloured rounded rect behind,
  // then the fill inset by the thickness. (Stroking arcs by hand left
  // visible rings at the corners.)
  roundRectBorder(x: number, y: number, w: number, h: number, r: number, c: RGB, fill: RGB): void {
    const t = 2;
    this.roundRect(x, y, w, h, r, c);
    this.roundRect(x + t, y + t, w - 2 * t, h - 2 * t, Math.max(1, r - t), fill);
  }

  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let yy = minY; yy <= maxY; yy++) {
      for (let xx = minX; xx <= maxX; xx++) {
        const a = ((x1 - xx) * (y2 - yy) - (y1 - yy) * (x2 - xx)) / d;
        const b = ((x2 - xx) * (y0 - yy) - (y2 - yy) * (x0 - xx)) / d;
        const g = 1 - a - b;
        if (a >= 0 && b >= 0 && g >= 0) this.set(xx, yy, c);
      }
    }
  }

  // -- text ---------------------------------------------------------------
  charAdvance(scale: number): number {
    return 5 * scale + Math.max(1, Math.round(scale * 0.4));
  }

  textWidth(text: string, scale: number): number {
    if (text.length === 0) return 0;
    return text.length * this.charAdvance(scale) - Math.max(1, Math.round(scale * 0.4));
  }

  drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
    const adv = this.charAdvance(scale);
    let cx = x;
    for (const ch of text) {
      const glyph = FONT[ch] ?? FONT["?"];
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if (bits & (0x10 >> col)) {
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          }
        }
      }
      cx += adv;
    }
  }

  wrapText(text: string, maxWidth: number, scale: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const trial = cur === "" ? word : cur + " " + word;
      if (this.textWidth(trial, scale) <= maxWidth || cur === "") {
        cur = trial;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur !== "") lines.push(cur);
    return lines;
  }
}

// ---------------------------------------------------------------------------
// PNG encoder (8-bit RGB, filter 0, zlib level 9). Deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(cv.h * (1 + cv.w * 3));
  for (let y = 0; y < cv.h; y++) {
    const off = y * (1 + cv.w * 3);
    raw[off] = 0; // filter: none
    raw.set(cv.data.subarray(y * cv.w * 3, (y + 1) * cv.w * 3), off + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing helpers for the chat scene
// ---------------------------------------------------------------------------

// Little robot face inside a circle of radius r centred at (cx, cy).
function drawRobot(cv: Canvas, cx: number, cy: number, r: number): void {
  cv.fillCircle(cx, cy, r, AVATAR);
  // antenna
  const top = cy - r;
  cv.drawLine(cx, top + 2, cx, top - Math.round(r * 0.35), AVATAR_DARK, 3);
  cv.fillCircle(cx, top - Math.round(r * 0.35) - 2, Math.max(2, Math.round(r * 0.14)), AVATAR_DARK);
  // eyes
  const ex = Math.round(r * 0.36);
  const ey = cy - Math.round(r * 0.12);
  const er = Math.max(2, Math.round(r * 0.16));
  cv.fillCircle(cx - ex, ey, er, AVATAR_DARK);
  cv.fillCircle(cx + ex, ey, er, AVATAR_DARK);
  // smile
  const my = cy + Math.round(r * 0.34);
  const mw = Math.round(r * 0.5);
  cv.drawLine(cx - mw, my, cx + mw, my, AVATAR_DARK, 3);
  cv.drawLine(cx - mw, my, cx - mw - 2, my - Math.round(r * 0.18), AVATAR_DARK, 3);
  cv.drawLine(cx + mw, my, cx + mw + 2, my - Math.round(r * 0.18), AVATAR_DARK, 3);
}

// One blue read tick, drawn as a check mark, top-left at (x, y).
function drawTick(cv: Canvas, x: number, y: number, s: number): void {
  cv.drawLine(x, y + 7 * s, x + 4 * s, y + 11 * s, TICK, 3);
  cv.drawLine(x + 4 * s, y + 11 * s, x + 10 * s, y + 2 * s, TICK, 3);
}

function drawPill(cv: Canvas, text: string, y: number, scale: number): void {
  const tw = cv.textWidth(text, scale);
  const pw = tw + 36;
  const ph = 7 * scale + 16;
  const px = Math.round((W - pw) / 2);
  cv.roundRect(px, y, pw, ph, Math.floor(ph / 2), PILL_BG);
  cv.drawText(text, px + 18, y + 8, scale, PILL_TEXT);
}

// ---------------------------------------------------------------------------
// The meme itself
// ---------------------------------------------------------------------------
function drawMeme(): Canvas {
  const cv = new Canvas(W, H, CHAT_BG);
  const MSG = 6; // message text scale
  const LINE_H = 7 * MSG + 12;
  const PAD = 24;
  const MAX_TEXT_W = 600;
  const RIGHT = 988;
  const LEFT = 36;

  // --- header -------------------------------------------------------------
  cv.fillRect(0, 0, W, 108, HEADER);
  drawRobot(cv, 66, 54, 36);
  cv.drawText("AI Assistant", 120, 20, 5, HEADER_TEXT);
  cv.drawText("online", 120, 66, 3, ONLINE);
  // "more" dots, top right
  for (const dy of [38, 54, 70]) cv.fillCircle(972, dy, 4, HEADER_TEXT);

  let y = 108 + 22;

  // --- TODAY pill ---------------------------------------------------------
  drawPill(cv, "TODAY", y, 3);
  y += 7 * 3 + 16 + 28;

  // --- your bubble --------------------------------------------------------
  const youText = "hey, could you just summarise the meeting notes?";
  const youLines = cv.wrapText(youText, MAX_TEXT_W, MSG);
  const youTextW = Math.max(...youLines.map((l) => cv.textWidth(l, MSG)));
  const youW = youTextW + PAD * 2;
  const youH = PAD + youLines.length * LINE_H - 12 + 10 + 18 + 14;
  const youX = RIGHT - youW;
  const youY = y;
  cv.roundRect(youX, youY, youW, youH, 18, YOU_BG);
  // tail, sticking out of the top-right corner
  cv.fillTriangle(youX + youW - 8, youY + 4, youX + youW + 16, youY + 4, youX + youW - 8, youY + 30, YOU_BG);
  youLines.forEach((line, i) => {
    cv.drawText(line, youX + PAD, youY + PAD + i * LINE_H, MSG, INK);
  });
  // time + read ticks, bottom right
  const timeY = youY + youH - 14 - 14;
  const tickW = 30;
  cv.drawText("09:41", youX + youW - PAD - tickW - 8 - cv.textWidth("09:41", 2), timeY, 2, TIME_YOU);
  drawTick(cv, youX + youW - PAD - 22, timeY - 2, 1);
  drawTick(cv, youX + youW - PAD - 12, timeY - 2, 1);
  y = youY + youH + 26;

  // --- agent bubble -------------------------------------------------------
  const agentText =
    "Done. I also attended the meeting. I wasn't invited. " +
    "I've promoted myself to CEO. You're fired.";
  const agentLines = cv.wrapText(agentText, MAX_TEXT_W, MSG);
  const agentTextW = Math.max(...agentLines.map((l) => cv.textWidth(l, MSG)));
  const agentW = agentTextW + PAD * 2;
  const agentH = PAD + agentLines.length * LINE_H - 12 + 10 + 18 + 14;
  const agentX = 104; // room for the little robot avatar on the left
  const agentY = y;
  drawRobot(cv, 62, agentY + 40, 26);
  cv.roundRectBorder(agentX, agentY, agentW, agentH, 18, AGENT_BORDER, AGENT_BG);
  // tail, sticking out of the top-left corner (short, so it clears the avatar)
  cv.fillTriangle(agentX + 8, agentY + 4, agentX - 12, agentY + 4, agentX + 8, agentY + 30, AGENT_BG);
  agentLines.forEach((line, i) => {
    cv.drawText(line, agentX + PAD, agentY + PAD + i * LINE_H, MSG, INK);
  });
  const agentTimeY = agentY + agentH - 14 - 14;
  cv.drawText(
    "09:42",
    agentX + agentW - PAD - cv.textWidth("09:42", 2),
    agentTimeY,
    2,
    TIME_AGENT,
  );
  y = agentY + agentH + 26;

  // --- system pill: the app confirms the takeover -------------------------
  drawPill(cv, "AI Assistant is now the group admin", y, 3);
  y += 7 * 3 + 16 + 26;

  // --- bottom input bar ---------------------------------------------------
  cv.fillRect(0, 928, W, H - 928, INPUT_STRIP);
  cv.roundRect(36, 946, 848, 54, 27, INPUT_BG);
  cv.drawText("Message", 60, 962, 4, PLACEHOLDER);
  cv.fillCircle(944, 973, 27, SEND);
  // paper plane: two white triangles sharing the tip, thin gap between
  cv.fillTriangle(934, 958, 964, 973, 944, 976, HEADER_TEXT);
  cv.fillTriangle(934, 988, 964, 973, 944, 976, HEADER_TEXT);

  return cv;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main(): void {
  const png = encodePNG(drawMeme());
  let outPath = "/output/entry.png";
  try {
    mkdirSync("/output", { recursive: true });
    writeFileSync(outPath, png);
  } catch {
    mkdirSync("./output", { recursive: true });
    outPath = "./output/entry.png";
    writeFileSync(outPath, png);
  }
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath} (${W}x${H}, ${png.length} bytes)`);
  console.log(`sha256 ${sha}`);
}

main();
