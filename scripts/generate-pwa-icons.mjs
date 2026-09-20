import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const outputDir = resolve("public/icons");

const icons = [
  { fileName: "icon-192.png", maskable: false, size: 192 },
  { fileName: "icon-512.png", maskable: false, size: 512 },
  { fileName: "maskable-192.png", maskable: true, size: 192 },
  { fileName: "maskable-512.png", maskable: true, size: 512 },
  { fileName: "apple-touch-icon.png", maskable: false, size: 180 },
];

const colors = {
  cream: [251, 247, 242, 255],
  graphite: [51, 38, 31, 255],
  red: [156, 58, 30, 255],
  redDark: [110, 36, 17, 255],
  white: [255, 253, 249, 255],
};

const glyphs = {
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
};

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCanvas(size, background) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(pixels, size, x, y, background);
    }
  }

  return pixels;
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) {
    return;
  }

  const index = (y * size + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function fillRect(pixels, size, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setPixel(pixels, size, column, row, color);
    }
  }
}

function fillCircle(pixels, size, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius;

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSquared) {
        setPixel(pixels, size, x, y, color);
      }
    }
  }
}

function fillDiagonalBand(pixels, size, color) {
  const band = Math.floor(size * 0.28);
  const offset = Math.floor(size * 0.18);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x - y > -offset && x - y < band) {
        setPixel(pixels, size, x, y, color);
      }
    }
  }
}

function drawText(pixels, size, text, x, y, scale, color) {
  let cursorX = x;

  for (const char of text) {
    const glyph = glyphs[char];
    if (!glyph) {
      cursorX += scale * 4;
      continue;
    }

    for (let row = 0; row < glyph.length; row += 1) {
      const line = glyph[row];
      for (let column = 0; column < line.length; column += 1) {
        if (line[column] === "1") {
          fillRect(pixels, size, cursorX + column * scale, y + row * scale, scale, scale, color);
        }
      }
    }

    cursorX += (glyph[0].length + 1) * scale;
  }
}

function encodePng(size, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rawOffset = y * (size * 4 + 1);
    raw[rawOffset] = 0;
    pixels.copy(raw, rawOffset + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    signature,
    makeChunk("IHDR", header),
    makeChunk("IDAT", deflateSync(raw)),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIcon({ maskable, size }) {
  const pixels = createCanvas(size, maskable ? colors.red : colors.cream);
  const safeInset = maskable ? Math.floor(size * 0.12) : Math.floor(size * 0.06);

  fillDiagonalBand(pixels, size, colors.redDark);
  fillCircle(
    pixels,
    size,
    Math.floor(size * 0.5),
    Math.floor(size * 0.47),
    Math.floor(size * 0.34),
    colors.red,
  );
  fillCircle(
    pixels,
    size,
    Math.floor(size * 0.5),
    Math.floor(size * 0.47),
    Math.floor(size * 0.23),
    colors.graphite,
  );

  const scale = Math.max(3, Math.floor(size / 38));
  const label = size >= 192 ? "SIPEG" : "S";
  const textWidth =
    label
      .split("")
      .reduce((width, char) => width + ((glyphs[char]?.[0].length ?? 3) + 1) * scale, 0) - scale;
  drawText(
    pixels,
    size,
    label,
    Math.floor((size - textWidth) / 2),
    Math.floor(size * 0.44),
    scale,
    colors.white,
  );

  fillRect(
    pixels,
    size,
    safeInset,
    safeInset,
    Math.floor(size * 0.11),
    Math.floor(size * 0.11),
    colors.white,
  );
  return pixels;
}

mkdirSync(outputDir, { recursive: true });

for (const icon of icons) {
  const pixels = createIcon(icon);
  const destination = resolve(outputDir, icon.fileName);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, encodePng(icon.size, pixels));
}

console.log(`Generated ${icons.length} PWA icons in ${outputDir}`);
