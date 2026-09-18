const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcVal]);
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // Scanlines with 0 filter byte
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  let rgbaOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines.writeUInt8(0, offset++); // filter type 0
    for (let x = 0; x < width; x++) {
      scanlines[offset++] = rgbaBuffer[rgbaOffset++];
      scanlines[offset++] = rgbaBuffer[rgbaOffset++];
      scanlines[offset++] = rgbaBuffer[rgbaOffset++];
      scanlines[offset++] = rgbaBuffer[rgbaOffset++];
    }
  }
  
  const idatData = zlib.deflateSync(scanlines);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icon graphic for Arthemah PAE
function renderIcon(size, isMaskable) {
  const buffer = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * (isMaskable ? 0.48 : 0.44);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Background: Deep Navy gradient (#0F3863 to #0A2342)
      let t = y / size;
      let bgR = Math.round(15 + (10 - 15) * t);
      let bgG = Math.round(56 + (35 - 56) * t);
      let bgB = Math.round(99 + (66 - 99) * t);
      
      if (!isMaskable && dist > r) {
        // Transparent outside rounded squircle
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > size * 0.48) {
          buffer[idx] = 0;
          buffer[idx + 1] = 0;
          buffer[idx + 2] = 0;
          buffer[idx + 3] = 0;
          continue;
        }
      }
      
      // Default navy background
      let pr = bgR;
      let pg = bgG;
      let pb = bgB;
      let pa = 255;
      
      // Inner card / shield (white)
      const cardW = size * 0.54;
      const cardH = size * 0.62;
      const cardX = cx - cardW / 2;
      const cardY = cy - cardH / 2 + size * 0.04;
      
      if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) {
        // White clipboard
        pr = 255;
        pg = 255;
        pb = 255;
        
        // Header clip on clipboard
        if (y < cardY + size * 0.08 && x > cx - size * 0.16 && x < cx + size * 0.16) {
          pr = 15;
          pg = 56;
          pb = 99;
        }
        
        // Food bowl icon (Teal #0D9488) in center
        const bowlY = cy + size * 0.08;
        const bdx = (x - cx);
        const bdy = (y - bowlY);
        if (bdy >= 0 && (bdx * bdx) / ((size * 0.18) ** 2) + (bdy * bdy) / ((size * 0.12) ** 2) <= 1) {
          pr = 13;
          pg = 148;
          pb = 136;
        }
        
        // Steam line in bowl
        if (y < bowlY && y > bowlY - size * 0.12 && Math.abs(bdx) < size * 0.03) {
          pr = 245;
          pg = 158;
          pb = 11;
        }
        
        // Checkmark badge in bottom right of card
        const badgeX = cardX + cardW - size * 0.08;
        const badgeY = cardY + cardH - size * 0.08;
        const bdist = Math.sqrt((x - badgeX) ** 2 + (y - badgeY) ** 2);
        if (bdist <= size * 0.1) {
          pr = 22;
          pg = 163;
          pb = 74; // SuccessGreen #16A34A
        }
      }
      
      buffer[idx] = pr;
      buffer[idx + 1] = pg;
      buffer[idx + 2] = pb;
      buffer[idx + 3] = pa;
    }
  }
  return encodePNG(size, size, buffer);
}

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), renderIcon(64, false));

console.log('PNG Icons successfully generated in /public!');
