// Run with: node scripts/generate-icons.mjs
// Requires: npm install sharp
import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Drizzle Reader logo — a warm parchment background with a raindrop/book motif
const SOURCE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f4ef"/>
      <stop offset="100%" stop-color="#ebe5d9"/>
    </linearGradient>
    <linearGradient id="drop" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#8B9DB4"/>
      <stop offset="100%" stop-color="#5a7a9c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <!-- Stylized raindrop -->
  <path d="M256 100 C256 100, 340 220, 340 290 C340 340, 302 380, 256 380 C210 380, 172 340, 172 290 C172 220, 256 100, 256 100 Z" fill="url(#drop)" opacity="0.85"/>
  <!-- Open book lines inside the drop -->
  <line x1="220" y1="260" x2="248" y2="260" stroke="#f7f4ef" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  <line x1="264" y1="260" x2="292" y2="260" stroke="#f7f4ef" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  <line x1="224" y1="280" x2="248" y2="280" stroke="#f7f4ef" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
  <line x1="264" y1="280" x2="288" y2="280" stroke="#f7f4ef" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
  <line x1="228" y1="300" x2="248" y2="300" stroke="#f7f4ef" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
  <line x1="264" y1="300" x2="284" y2="300" stroke="#f7f4ef" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
  <!-- Center spine -->
  <line x1="256" y1="240" x2="256" y2="340" stroke="#f7f4ef" stroke-width="3" stroke-linecap="round" opacity="0.4"/>
</svg>`;

const svgBuffer = Buffer.from(SOURCE_SVG);

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

console.log('\nAll icons generated successfully!');
