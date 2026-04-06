/**
 * Generates 6 SVG placeholder images (600×400 px) in server/uploads/
 * Run once: node db/generate-placeholders.js
 */
const fs   = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const placeholders = [
  {
    file:     'case-1.svg',
    bg:       '#FEE2E2',   // red-100
    accent:   '#DC2626',   // red-600
    label:    'Medical',
    emoji:    '❤️',
    title:    'Medical Treatment for Aziza',
  },
  {
    file:     'case-2.svg',
    bg:       '#DBEAFE',   // blue-100
    accent:   '#2563EB',   // blue-600
    label:    'Education',
    emoji:    '📚',
    title:    'School Supplies for Karakalpakstan',
  },
  {
    file:     'case-3.svg',
    bg:       '#FED7AA',   // orange-100
    accent:   '#EA580C',   // orange-600
    label:    'Emergency Relief',
    emoji:    '🏠',
    title:    'Rebuilding After Bukhara Floods',
  },
  {
    file:     'case-4.svg',
    bg:       '#E9D5FF',   // purple-100
    accent:   '#7C3AED',   // purple-600
    label:    'Community',
    emoji:    '📖',
    title:    'Community Library in Fergana',
  },
  {
    file:     'case-5.svg',
    bg:       '#DBEAFE',   // blue-100
    accent:   '#2563EB',   // blue-600
    label:    'Education',
    emoji:    '♿',
    title:    'Wheelchair Access for Navoi School',
  },
  {
    file:     'case-6.svg',
    bg:       '#D1FAE5',   // green-100
    accent:   '#059669',   // green-600
    label:    'Housing',
    emoji:    '🏡',
    title:    'Winter Heating for Elderly in Tashkent',
  },
];

for (const p of placeholders) {
  // Wrap title at ~28 chars per line
  const words = p.title.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > 28) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current);

  const titleY   = 270;
  const lineH    = 22;
  const titleSvg = lines
    .map((line, i) =>
      `<text x="300" y="${titleY + i * lineH}" text-anchor="middle"
         font-family="system-ui,sans-serif" font-size="16"
         font-weight="600" fill="${p.accent}">${line}</text>`
    )
    .join('\n  ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <!-- Background -->
  <rect width="600" height="400" fill="${p.bg}"/>

  <!-- Soft circle backdrop -->
  <circle cx="300" cy="185" r="90" fill="${p.accent}" fill-opacity="0.12"/>

  <!-- Emoji (rendered as foreign object for reliability) -->
  <text x="300" y="210" text-anchor="middle" font-size="72" dominant-baseline="middle"
        font-family="Segoe UI Emoji,Apple Color Emoji,sans-serif">${p.emoji}</text>

  <!-- Category label -->
  <rect x="220" y="240" width="160" height="28" rx="14" fill="${p.accent}" fill-opacity="0.15"/>
  <text x="300" y="259" text-anchor="middle"
        font-family="system-ui,sans-serif" font-size="13"
        font-weight="700" letter-spacing="1" fill="${p.accent}"
        text-transform="uppercase">${p.label.toUpperCase()}</text>

  <!-- Title lines -->
  ${titleSvg}

  <!-- Branding strip -->
  <rect y="370" width="600" height="30" fill="${p.accent}" fill-opacity="0.18"/>
  <text x="300" y="390" text-anchor="middle"
        font-family="system-ui,sans-serif" font-size="13"
        font-weight="600" fill="${p.accent}">Yaxshilik.uz</text>
</svg>`;

  const dest = path.join(uploadsDir, p.file);
  fs.writeFileSync(dest, svg, 'utf8');
  console.log(`  ✓ ${p.file}`);
}

console.log(`\n6 placeholder SVGs written to ${uploadsDir}`);
