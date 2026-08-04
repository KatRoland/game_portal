const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../public/cards/uno');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configurable Card Rendering Parameters
const CONFIG = {
  // Corner indices position (top-left offset)
  cornerX: 28,
  cornerY: 46,

  // Font sizes for text indices in corners
  cornerNumberFontSize: 44, // Formerly 28 (bigger & clearer)
  cornerActionFontSize: 40, // Formerly 24 for +2 and +4

  // Scale for icon indices in corners (skip, reverse, wild)
  cornerIconScale: 0.75, // Formerly 0.45 - 0.55
};

const COLORS = {
  red: {
    bgStart: '#FF2A4B',
    bgEnd: '#B9001C',
    text: '#D3001E',
    shadow: '#66000E',
    border: '#FF8095'
  },
  green: {
    bgStart: '#10B981',
    bgEnd: '#047857',
    text: '#059669',
    shadow: '#024E38',
    border: '#6EE7B7'
  },
  blue: {
    bgStart: '#2563EB',
    bgEnd: '#1D4ED8',
    text: '#1D4ED8',
    shadow: '#0F2B80',
    border: '#93C5FD'
  },
  yellow: {
    bgStart: '#F59E0B',
    bgEnd: '#B45309',
    text: '#D97706',
    shadow: '#78350F',
    border: '#FDE68A'
  },
  wild: {
    bgStart: '#1F1934',
    bgEnd: '#0D0B18',
    text: '#FFFFFF',
    shadow: '#000000',
    border: '#A855F7'
  }
};

function getCommonDefs(cardId) {
  return `
    <defs>
      <linearGradient id="red-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF3B5C"/>
        <stop offset="100%" stop-color="#C4001E"/>
      </linearGradient>
      <linearGradient id="green-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#046C4E"/>
      </linearGradient>
      <linearGradient id="blue-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3B82F6"/>
        <stop offset="100%" stop-color="#1E40AF"/>
      </linearGradient>
      <linearGradient id="yellow-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
      <linearGradient id="wild-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2E2640"/>
        <stop offset="100%" stop-color="#110E1C"/>
      </linearGradient>
      <linearGradient id="oval-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#F3F4F6"/>
      </linearGradient>
      <linearGradient id="gold-grad-${cardId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFE259"/>
        <stop offset="100%" stop-color="#FFA751"/>
      </linearGradient>
      <filter id="card-shadow-${cardId}" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
      <filter id="oval-shadow-${cardId}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.25"/>
      </filter>
      <filter id="text-shadow-${cardId}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="2" flood-color="#000000" flood-opacity="0.2"/>
      </filter>
    </defs>
  `;
}

function renderCardFrame(colorName, cardId) {
  const gradId = `${colorName}-grad-${cardId}`;
  return `
    <!-- Outer Card Shadow & Base -->
    <rect x="6" y="6" width="228" height="348" rx="22" ry="22" fill="url(#${gradId})" stroke="#FFFFFF" stroke-width="5" filter="url(#card-shadow-${cardId})"/>
    <!-- Inner Border Line -->
    <rect x="14" y="14" width="212" height="332" rx="16" ry="16" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  `;
}

function renderWhiteOval(cardId, ovalColor = null) {
  const fill = ovalColor && COLORS[ovalColor] ? `url(#${ovalColor}-grad-${cardId})` : `url(#oval-grad-${cardId})`;
  return `
    <!-- Central Tilted White/Colored Oval -->
    <ellipse cx="120" cy="180" rx="76" ry="112" transform="rotate(-25 120 180)" fill="${fill}" stroke="#FFFFFF" stroke-width="3" filter="url(#oval-shadow-${cardId})"/>
  `;
}

function renderCornerIndices(contentTopLeft, contentBottomRight) {
  const tlX = CONFIG.cornerX;
  const tlY = CONFIG.cornerY;
  const brX = 240 - tlX;
  const brY = 360 - tlY;

  return `
    <!-- Top-Left Index -->
    <g transform="translate(${tlX}, ${tlY})">
      ${contentTopLeft}
    </g>
    <!-- Bottom-Right Index (Rotated 180) -->
    <g transform="translate(${brX}, ${brY}) rotate(180)">
      ${contentBottomRight || contentTopLeft}
    </g>
  `;
}

// Generate Card: Number
function generateNumberCard(color, num) {
  const cardId = `${color}_${num}`;
  const colorData = COLORS[color];
  const isUnderlined = num === 6 || num === 9;
  const fontSize = CONFIG.cornerNumberFontSize;
  const underlineY = Math.round(fontSize * 0.45);

  const cornerContent = `
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="900" font-family="'Arial Black', sans-serif" fill="#FFFFFF" filter="url(#text-shadow-${cardId})">${num}</text>
    ${isUnderlined ? `<line x1="-12" y1="${underlineY}" x2="12" y2="${underlineY}" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>` : ''}
  `;

  const centerContent = `
    <g transform="translate(120, 180) rotate(-10)">
      <text x="0" y="10" text-anchor="middle" dominant-baseline="central" font-size="110" font-weight="900" font-family="'Arial Black', sans-serif" fill="${colorData.text}" filter="url(#text-shadow-${cardId})">${num}</text>
      ${isUnderlined ? `<line x1="-35" y1="62" x2="35" y2="62" stroke="${colorData.text}" stroke-width="10" stroke-linecap="round"/>` : ''}
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  ${renderCardFrame(color, cardId)}
  ${renderWhiteOval(cardId)}
  ${centerContent}
  ${renderCornerIndices(cornerContent)}
</svg>`;
}

// Generate Card: Skip
function generateSkipCard(color) {
  const cardId = `${color}_skip`;
  const colorData = COLORS[color];

  const cornerContent = `
    <g transform="scale(${CONFIG.cornerIconScale})">
      <circle cx="0" cy="0" r="20" fill="none" stroke="#FFFFFF" stroke-width="7"/>
      <line x1="-14" y1="14" x2="14" y2="-14" stroke="#FFFFFF" stroke-width="7"/>
    </g>
  `;

  const centerContent = `
    <g transform="translate(120, 180) rotate(-10)">
      <circle cx="0" cy="0" r="45" fill="none" stroke="${colorData.text}" stroke-width="15" filter="url(#text-shadow-${cardId})"/>
      <line x1="-32" y1="32" x2="32" y2="-32" stroke="${colorData.text}" stroke-width="15" stroke-linecap="round" filter="url(#text-shadow-${cardId})"/>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  ${renderCardFrame(color, cardId)}
  ${renderWhiteOval(cardId)}
  ${centerContent}
  ${renderCornerIndices(cornerContent)}
</svg>`;
}

// Generate Card: Reverse
function generateReverseCard(color) {
  const cardId = `${color}_reverse`;
  const colorData = COLORS[color];

  const cornerContent = `
    <g transform="scale(${CONFIG.cornerIconScale})">
      <path d="M -18 -10 A 18 18 0 0 1 18 -10 L 10 -22 M 18 -10 L 10 2" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M 18 10 A 18 18 0 0 1 -18 10 L -10 22 M -18 10 L -10 -2" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
  `;

  const centerContent = `
    <g transform="translate(120, 180) rotate(-10)">
      <g filter="url(#text-shadow-${cardId})">
        <path d="M -36 -20 A 36 36 0 0 1 36 -20 L 20 -42 M 36 -20 L 20 2" stroke="${colorData.text}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M 36 20 A 36 36 0 0 1 -36 20 L -20 42 M -36 20 L -20 -2" stroke="${colorData.text}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  ${renderCardFrame(color, cardId)}
  ${renderWhiteOval(cardId)}
  ${centerContent}
  ${renderCornerIndices(cornerContent)}
</svg>`;
}

// Generate Card: Draw 2
function generateDraw2Card(color) {
  const cardId = `${color}_draw2`;
  const colorData = COLORS[color];
  const fontSize = CONFIG.cornerActionFontSize;

  const cornerContent = `
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="900" font-family="'Arial Black', sans-serif" fill="#FFFFFF" filter="url(#text-shadow-${cardId})">+2</text>
  `;

  const centerContent = `
    <g transform="translate(120, 180) rotate(-10)">
      <!-- Overlapping mini cards -->
      <rect x="-35" y="-45" width="36" height="54" rx="5" ry="5" fill="url(#${color}-grad-${cardId})" stroke="#FFFFFF" stroke-width="3" filter="url(#oval-shadow-${cardId})"/>
      <rect x="-12" y="-25" width="36" height="54" rx="5" ry="5" fill="url(#${color}-grad-${cardId})" stroke="#FFFFFF" stroke-width="3" filter="url(#oval-shadow-${cardId})"/>
      <text x="5" y="38" text-anchor="middle" dominant-baseline="central" font-size="52" font-weight="900" font-family="'Arial Black', sans-serif" fill="${colorData.text}" filter="url(#text-shadow-${cardId})">+2</text>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  ${renderCardFrame(color, cardId)}
  ${renderWhiteOval(cardId)}
  ${centerContent}
  ${renderCornerIndices(cornerContent)}
</svg>`;
}

// Generate Card: Wild
function generateWildCard(selectedColor = null) {
  const cardId = selectedColor ? `wild_${selectedColor}` : 'wild';

  const cornerContent = `
    <g transform="scale(${CONFIG.cornerIconScale})">
      <path d="M 0 0 L -20 0 A 20 20 0 0 1 0 -20 Z" fill="#FF3B5C"/>
      <path d="M 0 0 L 0 -20 A 20 20 0 0 1 20 0 Z" fill="#3B82F6"/>
      <path d="M 0 0 L 20 0 A 20 20 0 0 1 0 20 Z" fill="#FBBF24"/>
      <path d="M 0 0 L 0 20 A 20 20 0 0 1 -20 0 Z" fill="#10B981"/>
    </g>
  `;

  const centerContent = `
    <g transform="translate(120, 180) rotate(-10)">
      <!-- 4 Color Wheel Ellipse -->
      <g filter="url(#oval-shadow-${cardId})">
        <path d="M 0 0 L -55 0 A 55 75 0 0 1 0 -75 Z" fill="#FF3B5C"/>
        <path d="M 0 0 L 0 -75 A 55 75 0 0 1 55 0 Z" fill="#3B82F6"/>
        <path d="M 0 0 L 55 0 A 55 75 0 0 1 0 75 Z" fill="#FBBF24"/>
        <path d="M 0 0 L 0 75 A 55 75 0 0 1 -55 0 Z" fill="#10B981"/>
      </g>
      <ellipse cx="0" cy="0" rx="55" ry="75" fill="none" stroke="#FFFFFF" stroke-width="4"/>
      <text x="0" y="6" text-anchor="middle" dominant-baseline="central" font-size="34" font-weight="900" font-family="'Arial Black', sans-serif" fill="#FFFFFF" stroke="#000000" stroke-width="3" paint-order="stroke fill" filter="url(#text-shadow-${cardId})">WILD</text>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  ${renderCardFrame('wild', cardId)}
  ${renderWhiteOval(cardId, selectedColor)}
  ${centerContent}
  ${renderCornerIndices(cornerContent)}
</svg>`;
}

// Generate Card: Wild Draw 4
function generateWildDraw4Card(selectedColor = null) {
  const cardId = selectedColor ? `wild_draw4_${selectedColor}` : 'wild_draw4';
  const fontSize = CONFIG.cornerActionFontSize;

  const cornerContent = `
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="900" font-family="'Arial Black', sans-serif" fill="#FFFFFF" filter="url(#text-shadow-${cardId})">+4</text>
  `;

  const centerContent = `
    <g transform="translate(120, 180) rotate(-10)">
      <!-- 4 Mini colored cards -->
      <g filter="url(#oval-shadow-${cardId})">
        <rect x="-42" y="-45" width="30" height="46" rx="4" ry="4" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2" transform="rotate(-15 -27 -22)"/>
        <rect x="-24" y="-52" width="30" height="46" rx="4" ry="4" fill="#FF3B5C" stroke="#FFFFFF" stroke-width="2" transform="rotate(-5 -9 -29)"/>
        <rect x="-6" y="-55" width="30" height="46" rx="4" ry="4" fill="#10B981" stroke="#FFFFFF" stroke-width="2" transform="rotate(8 9 -32)"/>
        <rect x="12" y="-48" width="30" height="46" rx="4" ry="4" fill="#FBBF24" stroke="#FFFFFF" stroke-width="2" transform="rotate(20 27 -25)"/>
      </g>
      <text x="0" y="28" text-anchor="middle" dominant-baseline="central" font-size="56" font-weight="900" font-family="'Arial Black', sans-serif" fill="#FFFFFF" stroke="#000000" stroke-width="4" paint-order="stroke fill" filter="url(#text-shadow-${cardId})">+4</text>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  ${renderCardFrame('wild', cardId)}
  ${renderWhiteOval(cardId, selectedColor)}
  ${centerContent}
  ${renderCornerIndices(cornerContent)}
</svg>`;
}

// Generate Card: Back
function generateCardBack() {
  const cardId = 'back';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 360" width="240" height="360">
  ${getCommonDefs(cardId)}
  <!-- Outer Card Frame (Dark Premium Finish) -->
  <rect x="6" y="6" width="228" height="348" rx="22" ry="22" fill="url(#wild-grad-${cardId})" stroke="#FFFFFF" stroke-width="5" filter="url(#card-shadow-${cardId})"/>
  <rect x="14" y="14" width="212" height="332" rx="16" ry="16" fill="none" stroke="url(#gold-grad-${cardId})" stroke-width="2.5"/>

  <!-- Geometric Back Pattern -->
  <g opacity="0.15">
    <circle cx="120" cy="180" r="130" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-dasharray="8 8"/>
    <circle cx="120" cy="180" r="100" fill="none" stroke="#FFFFFF" stroke-width="6"/>
  </g>

  <!-- Central Red Oval with Gold Outer Trim -->
  <g filter="url(#oval-shadow-${cardId})">
    <ellipse cx="120" cy="180" rx="80" ry="118" transform="rotate(-25 120 180)" fill="url(#gold-grad-${cardId})"/>
    <ellipse cx="120" cy="180" rx="74" ry="110" transform="rotate(-25 120 180)" fill="url(#red-grad-${cardId})"/>
  </g>

  <!-- Bold Angled UNO Logo Text -->
  <g transform="translate(120, 180) rotate(-25)">
    <!-- 3D Shadow for Text -->
    <text x="4" y="18" text-anchor="middle" dominant-baseline="central" font-size="76" font-weight="900" font-family="'Arial Black', sans-serif" fill="#7A000E" opacity="0.8">UNO</text>
    <!-- Main Yellow Text with Black/Gold Outline -->
    <text x="0" y="14" text-anchor="middle" dominant-baseline="central" font-size="76" font-weight="900" font-family="'Arial Black', sans-serif" fill="url(#gold-grad-${cardId})" stroke="#000000" stroke-width="6" paint-order="stroke fill" filter="url(#text-shadow-${cardId})">UNO</text>
  </g>

  <!-- Small corner accents -->
  <g transform="translate(26, 36)">
    <ellipse cx="0" cy="0" rx="8" ry="12" transform="rotate(-25)" fill="url(#red-grad-${cardId})" stroke="url(#gold-grad-${cardId})" stroke-width="1.5"/>
  </g>
  <g transform="translate(214, 324)">
    <ellipse cx="0" cy="0" rx="8" ry="12" transform="rotate(-25)" fill="url(#red-grad-${cardId})" stroke="url(#gold-grad-${cardId})" stroke-width="1.5"/>
  </g>
</svg>`;
}

// Generate all cards
let count = 0;

['red', 'green', 'blue', 'yellow'].forEach((color) => {
  // Numbers 0 to 9
  for (let i = 0; i <= 9; i++) {
    const filename = `${color}_${i}.svg`;
    fs.writeFileSync(path.join(outputDir, filename), generateNumberCard(color, i));
    count++;
  }

  // Action cards
  fs.writeFileSync(path.join(outputDir, `${color}_skip.svg`), generateSkipCard(color));
  fs.writeFileSync(path.join(outputDir, `${color}_reverse.svg`), generateReverseCard(color));
  fs.writeFileSync(path.join(outputDir, `${color}_draw2.svg`), generateDraw2Card(color));
  count += 3;
});

// Wild cards
fs.writeFileSync(path.join(outputDir, 'wild.svg'), generateWildCard());
fs.writeFileSync(path.join(outputDir, 'wild_wild.svg'), generateWildCard()); // Alias
fs.writeFileSync(path.join(outputDir, 'wild_draw4.svg'), generateWildDraw4Card());
fs.writeFileSync(path.join(outputDir, 'draw4.svg'), generateWildDraw4Card()); // Alias
count += 4;

// Wild colored variants (after color selection, center oval is colored instead of white)
['red', 'green', 'blue', 'yellow'].forEach((c) => {
  const wildSvg = generateWildCard(c);
  const wildDraw4Svg = generateWildDraw4Card(c);

  fs.writeFileSync(path.join(outputDir, `wild_${c}.svg`), wildSvg);
  fs.writeFileSync(path.join(outputDir, `${c}_wild.svg`), wildSvg);

  fs.writeFileSync(path.join(outputDir, `wild_draw4_${c}.svg`), wildDraw4Svg);
  fs.writeFileSync(path.join(outputDir, `${c}_wild_draw4.svg`), wildDraw4Svg);
  fs.writeFileSync(path.join(outputDir, `${c}_draw4.svg`), wildDraw4Svg);
  fs.writeFileSync(path.join(outputDir, `draw4_${c}.svg`), wildDraw4Svg);

  count += 6;
});

// Card Back
const backSvg = generateCardBack();
fs.writeFileSync(path.join(outputDir, 'back.svg'), backSvg);
fs.writeFileSync(path.join(outputDir, 'card_back.svg'), backSvg); // Alias
count += 2;

console.log(`Successfully generated ${count} SVG card images in ${outputDir} with config:`, CONFIG);
