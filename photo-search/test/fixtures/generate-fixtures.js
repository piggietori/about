// Creates minimal test JPEG files with EXIF data using sharp + raw pixel buffers.
// Run once: node test/fixtures/generate-fixtures.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'images');
fs.mkdirSync(OUT, { recursive: true });

const fixtures = [
  { name: 'beach.jpg',    color: [0, 120, 200],  label: 'beach' },
  { name: 'birthday.jpg', color: [220, 80, 80],   label: 'birthday' },
  { name: 'school.jpg',   color: [80, 160, 80],   label: 'school' },
  { name: 'nature.jpg',   color: [60, 140, 60],   label: 'nature' },
];

async function main() {
  for (const f of fixtures) {
    const outPath = path.join(OUT, f.name);
    await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: f.color[0], g: f.color[1], b: f.color[2] } }
    }).jpeg().toFile(outPath);
    console.log(`Created ${f.name}`);
  }
  console.log('Done. Fixtures written to', OUT);
}

main().catch(console.error);
