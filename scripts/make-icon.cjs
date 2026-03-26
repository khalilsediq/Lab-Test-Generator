/**
 * Creates a proper Windows ICO file from a PNG source.
 * ICO format: 6-byte header + N*16-byte directory entries + image data.
 * Modern ICO files can embed PNG data directly (Vista+), which rcedit supports.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/assets/images/Logo.png');
const outputIco = path.join(__dirname, '../public/icon.ico');

const SIZES = [256, 128, 64, 32, 16];

async function buildIco() {
  const pngBuffers = await Promise.all(
    SIZES.map((size) =>
      sharp(inputPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );

  const numImages = pngBuffers.length;
  // ICO header: 6 bytes (reserved=0, type=1, count=numImages)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);          // Reserved
  header.writeUInt16LE(1, 2);          // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4);  // Number of images

  // Directory: 16 bytes per image
  const dirSize = numImages * 16;
  const directory = Buffer.alloc(dirSize);

  let dataOffset = 6 + dirSize;
  const imageDataBuffers = [];

  for (let i = 0; i < numImages; i++) {
    const size = SIZES[i];
    const imgBuf = pngBuffers[i];
    const imgSize = imgBuf.length;
    const dirBase = i * 16;

    // Width/Height: 0 means 256 for 256px images (per spec)
    directory.writeUInt8(size === 256 ? 0 : size, dirBase + 0);  // Width
    directory.writeUInt8(size === 256 ? 0 : size, dirBase + 1);  // Height
    directory.writeUInt8(0, dirBase + 2);    // Color count (0 = no palette)
    directory.writeUInt8(0, dirBase + 3);    // Reserved
    directory.writeUInt16LE(0, dirBase + 4); // Color planes
    directory.writeUInt16LE(32, dirBase + 6); // Bits per pixel
    directory.writeUInt32LE(imgSize, dirBase + 8);    // Size of image data
    directory.writeUInt32LE(dataOffset, dirBase + 12); // Offset of image data

    dataOffset += imgSize;
    imageDataBuffers.push(imgBuf);
  }

  const icoFile = Buffer.concat([header, directory, ...imageDataBuffers]);
  fs.writeFileSync(outputIco, icoFile);
  console.log(`✅ public/icon.ico created — proper ICO format with ${numImages} sizes: ${SIZES.join(', ')}px`);
}

buildIco().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
