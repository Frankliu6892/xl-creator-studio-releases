/**
 * Node.js 1080x1920 SVG + FFmpeg Vector Illustration Video Renderer
 * Renders TikTok Creator Academy-style 2D flat-vector animated diagrams
 * with dark pill badges and word-by-word yellow-highlighted karaoke captions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {}

let ffmpegBin = 'ffmpeg';
try {
  const ffStatic = require('ffmpeg-static');
  if (ffStatic && fs.existsSync(ffStatic)) ffmpegBin = ffStatic;
} catch (e) {}
if (ffmpegBin === 'ffmpeg') {
  const localFf = path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(localFf)) ffmpegBin = localFf;
}

const { EPISODES, buildKaraokePhrases } = require('./illustration_episodes.js');

const appDataRoot = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const ARTIFACT_DIR = process.env.XL_STUDIO_DATA_DIR || path.join(appDataRoot, 'XL Creator Studio');
const SCRATCH_DIR = path.join(ARTIFACT_DIR, 'workspace');
const FONTS_DIR = path.join(SCRATCH_DIR, 'fonts');
const BUNDLED_FONTS_DIR = path.join(__dirname, 'assets', 'fonts');

fs.mkdirSync(FONTS_DIR, { recursive: true });

// Ensure bundled fonts are copied to FONTS_DIR for FFmpeg libass on any PC
try {
  if (fs.existsSync(BUNDLED_FONTS_DIR)) {
    for (const f of fs.readdirSync(BUNDLED_FONTS_DIR)) {
      if (/\.(ttf|otf)$/i.test(f)) {
        const dest = path.join(FONTS_DIR, f);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(BUNDLED_FONTS_DIR, f), dest);
        }
      }
    }
  }
} catch (e) {}

async function renderSvgBufferToPngFile(svgStr, pngPath) {
  if (typeof sharp === 'function') {
    await sharp(Buffer.from(svgStr)).png().toFile(pngPath);
    return;
  }
  try {
    const { BrowserWindow } = require('electron');
    const win = new BrowserWindow({
      width: 1080,
      height: 1920,
      show: false,
      frame: false,
      enableLargerThanScreen: true,
      webPreferences: { offscreen: true, contextIsolation: true }
    });
    win.setContentSize(1080, 1920);
    const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svgStr, 'utf8').toString('base64');
    await win.loadURL(dataUrl);
    await new Promise((r) => setTimeout(r, 120));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(pngPath, img.toPNG());
    win.destroy();
    return;
  } catch (e) {
    execFileSync(ffmpegBin, ['-y', '-f', 'lavfi', '-i', 'color=c=0x0b0e14:s=1080x1920:d=0.04', '-frames:v', '1', pngPath], { stdio: 'ignore' });
  }
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a 1080x1920 SVG string for a given episode beat and animation phase (0..1)
 */
function buildSceneSvg(episode, beatIndex, rayPhase = 1.0, captionPreview = null) {
  const safeIdx = Math.max(0, Math.min((episode.lines || []).length - 1, beatIndex));
  const lineObj = episode.lines[safeIdx] || episode.lines[0];
  const pillTitle = escapeXml(String(lineObj.beatTitle || 'FILL LIGHT').toUpperCase());
  const pillW = Math.max(360, pillTitle.length * 31 + 86);
  const pillX = Math.round((1080 - pillW) / 2);
  const pillY = 1126;

  let diagramSvg = '';

  if (episode.diagramType === 'monetization') {
    const cards = [
      { y: 455, active: safeIdx === 0 || safeIdx === 1, left: 'OPEN LINK: 8% CUT', right: 'TARGET LINK: 22% CUT ✓', sub: 'Same SKU • Request Partner Target Invitation' },
      { y: 635, active: safeIdx === 0 || safeIdx === 2, left: 'TRAP: 20% AGENCY SPLIT', right: '90-DAY AUTO-LOCK ✕', sub: 'Verify 0% Retainer & Explicit Unbind Button' },
      { y: 815, active: safeIdx === 3 || safeIdx === 4, left: 'COMMERCIAL MUSIC ✓', right: '365-DAY SPARK CODE ✓', sub: 'Brands Fund Paid Ad Spend -> You Keep Organic + Ad GMV' }
    ];
    diagramSvg = `
      <rect x="200" y="400" width="680" height="650" rx="28" fill="#FFFFFF" stroke="#0F1418" stroke-width="5" />
      ${cards
        .map(
          (c) => `
        <rect x="235" y="${c.y}" width="610" height="145" rx="20" fill="${c.active ? '#0F1418' : '#ECFDF5'}" stroke="${c.active ? '#DF1B38' : '#0F1418'}" stroke-width="${c.active ? '5' : '3.5'}" />
        <rect x="255" y="${c.y + 18}" width="275" height="54" rx="12" fill="${c.active ? '#2B080C' : '#E2E8F0'}" />
        <text x="392" y="${c.y + 53}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="22" fill="${c.active ? '#FF4D6A' : '#334155'}" text-anchor="middle">${escapeXml(c.left)}</text>
        <rect x="545" y="${c.y + 18}" width="280" height="54" rx="12" fill="${c.active ? '#DF1B38' : '#0F1418'}" />
        <text x="685" y="${c.y + 53}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="22" fill="${c.active ? '#FFE600' : '#9CEAE2'}" text-anchor="middle">${escapeXml(c.right)}</text>
        <text x="540" y="${c.y + 114}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="22" fill="${c.active ? '#FFFFFF' : '#0F1418'}" text-anchor="middle">${escapeXml(c.sub)}</text>
      `
        )
        .join('')}
    `;
  } else if (episode.diagramType === 'accelerator') {
    const rows = [
      { y: 495, active: safeIdx === 0 || safeIdx === 1, badge: 'STOCK >= 20', title: 'SAFETY STOCK & ATTRIBUTES', metric: '0 Missing Certs • <20 Units Kills Algo Push' },
      { y: 635, active: safeIdx === 2, badge: 'CTR >= 4.0%', title: 'FIRST 35-CHAR SEARCH TITLE', metric: 'Front-Load Buyer Pain + Spec Before Truncation' },
      { y: 775, active: safeIdx === 3, badge: 'CTOR >= 8.0%', title: '9:16 HEADER VIDEO + 5 CARDS', metric: 'Comparison Table + Dimension Graphic + Certs' },
      { y: 915, active: safeIdx === 4, badge: '12% / 22%', title: 'OPEN + TARGET TIER & 48H SLA', metric: '12% Open Discovery • 22% Top-50 Target Sample' }
    ];
    diagramSvg = `
      <rect x="195" y="395" width="690" height="660" rx="28" fill="#FFFFFF" stroke="#0F1418" stroke-width="5" />
      <rect x="225" y="420" width="630" height="54" rx="14" fill="#0F1418" />
      <text x="540" y="455" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="23" fill="#9CEAE2" text-anchor="middle">SELLER CENTER -&gt; SALES ACCELERATOR DIAGNOSTIC</text>
      ${rows
        .map(
          (r) => `
        <rect x="225" y="${r.y}" width="630" height="118" rx="18" fill="${r.active ? '#0F1418' : '#F1F5F9'}" stroke="${r.active ? '#DF1B38' : '#0F1418'}" stroke-width="${r.active ? '5' : '3'}" />
        <rect x="245" y="${r.y + 22}" width="175" height="74" rx="12" fill="${r.active ? '#DF1B38' : '#0F1418'}" />
        <text x="332" y="${r.y + 67}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="23" fill="#FFE600" text-anchor="middle">${escapeXml(r.badge)}</text>
        <text x="440" y="${r.y + 48}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="24" fill="${r.active ? '#FFFFFF' : '#0F1418'}" text-anchor="start">${escapeXml(r.title)}</text>
        <text x="440" y="${r.y + 86}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="20" fill="${r.active ? '#9CEAE2' : '#475569'}" text-anchor="start">${escapeXml(r.metric)}</text>
      `
        )
        .join('')}
    `;
  } else if (episode.diagramType === 'live') {
    diagramSvg = `
      <rect x="195" y="395" width="690" height="660" rx="28" fill="#FFFFFF" stroke="#0F1418" stroke-width="5" />
      <!-- Left: 9:16 Safe Zone Phone -->
      <rect x="230" y="430" width="290" height="590" rx="34" fill="#0F1418" />
      <rect x="246" y="452" width="258" height="340" rx="18" fill="#9CEAE2" stroke="${safeIdx === 3 ? '#DF1B38' : 'none'}" stroke-width="5" />
      <text x="375" y="510" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="22" fill="#0F1418" text-anchor="middle">TOP 65% SAFE ZONE</text>
      <text x="375" y="542" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="18" fill="#0F1418" text-anchor="middle">Hold Swatches &amp; Price</text>
      <text x="375" y="568" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="18" fill="#0F1418" text-anchor="middle">Board Here + Cam 2</text>
      <rect x="246" y="802" width="258" height="196" rx="18" fill="#2B080C" />
      <text x="375" y="885" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#FF4D6A" text-anchor="middle">BOTTOM 35% BLOCKED</text>
      <text x="375" y="918" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#FFFFFF" text-anchor="middle">Chat + Orange Cart Drawer</text>
      <!-- Right: Streamer Console -->
      <rect x="545" y="430" width="310" height="130" rx="16" fill="${safeIdx === 0 ? '#DF1B38' : '#0F1418'}" />
      <text x="700" y="478" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#FFE600" text-anchor="middle">100-SKU BAG TIERS</text>
      <text x="700" y="512" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#FFFFFF" text-anchor="middle">#1-#5 Hero Traffic</text>
      <text x="700" y="538" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#9CEAE2" text-anchor="middle">#6-#25 High-Margin Bundles</text>

      <rect x="545" y="582" width="310" height="130" rx="16" fill="${safeIdx === 1 ? '#DF1B38' : '#0F1418'}" />
      <text x="700" y="630" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#FFE600" text-anchor="middle">RE-PIN EVERY 3-5 MIN</text>
      <text x="700" y="664" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#FFFFFF" text-anchor="middle">Fires Fresh Orange Banner</text>
      <text x="700" y="690" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#9CEAE2" text-anchor="middle">+30s Countdown Timer</text>

      <rect x="545" y="734" width="310" height="130" rx="16" fill="${safeIdx === 2 ? '#DF1B38' : '#0F1418'}" />
      <text x="700" y="782" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#FFE600" text-anchor="middle">&lt; 5 UNITS SCARCITY</text>
      <text x="700" y="816" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#FFFFFF" text-anchor="middle">Inject +10 Buffer Stock</text>
      <text x="700" y="842" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#9CEAE2" text-anchor="middle">Before 0-Stock Auto-Unpin</text>

      <rect x="545" y="886" width="310" height="134" rx="16" fill="${safeIdx === 4 ? '#DF1B38' : '#0F1418'}" />
      <text x="700" y="934" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#FFE600" text-anchor="middle">GPM $50+ &amp; WATCH &gt;45S</text>
      <text x="700" y="968" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#FFFFFF" text-anchor="middle">60s Poll + Flash Claim</text>
      <text x="700" y="994" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="17" fill="#9CEAE2" text-anchor="middle">Spikes Comment Velocity</text>
    `;
  } else if (episode.diagramType === 'health') {
    const cards = [
      { x: 225, y: 425, w: 300, h: 185, active: safeIdx === 0, title: 'AHR 200+ & SPS 4.0+', l1: 'Campaign Gatekeeper', l2: 'Below 4.0 = No Subsidies' },
      { x: 555, y: 425, w: 300, h: 185, active: safeIdx === 1, title: 'OPS SLA THRESHOLDS', l1: 'LDR <4% • Cancel <2.5%', l2: 'Valid Tracking & <12h CS' },
      { x: 225, y: 635, w: 300, h: 185, active: safeIdx === 2, title: '1 OFFICIAL + 4 MKT', l1: 'Audit CHR 200+ Weekly', l2: 'Unlink Warned Handles Fast' },
      { x: 555, y: 635, w: 300, h: 185, active: safeIdx === 3 || safeIdx === 4, title: 'APPEAL PDF BUNDLE', l1: 'GS1 Cert + FDA/UL COA', l2: '2 Appeals Max Within 7d' }
    ];
    diagramSvg = `
      <rect x="195" y="395" width="690" height="660" rx="28" fill="#FFFFFF" stroke="#0F1418" stroke-width="5" />
      ${cards
        .map(
          (c) => `
        <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="20" fill="${c.active ? '#0F1418' : '#F1F5F9'}" stroke="${c.active ? '#DF1B38' : '#0F1418'}" stroke-width="${c.active ? '5' : '3.5'}" />
        <text x="${c.x + c.w / 2}" y="${c.y + 56}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="22" fill="${c.active ? '#FFE600' : '#0F1418'}" text-anchor="middle">${escapeXml(c.title)}</text>
        <text x="${c.x + c.w / 2}" y="${c.y + 105}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="19" fill="${c.active ? '#FFFFFF' : '#334155'}" text-anchor="middle">${escapeXml(c.l1)}</text>
        <text x="${c.x + c.w / 2}" y="${c.y + 142}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="18" fill="${c.active ? '#9CEAE2' : '#475569'}" text-anchor="middle">${escapeXml(c.l2)}</text>
      `
        )
        .join('')}
      <rect x="225" y="850" width="630" height="170" rx="20" fill="#0F1418" />
      <text x="540" y="905" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="25" fill="#9CEAE2" text-anchor="middle">NEVER EDIT FROZEN SKU COPY BEFORE APPEALING</text>
      <text x="540" y="950" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="700" font-size="20" fill="#FFFFFF" text-anchor="middle">Submit 1 Merged PDF: GS1 Barcode + Lot Photo + Lab COA</text>
      <text x="540" y="990" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="20" fill="#FFE600" text-anchor="middle">Protects GMV Max Ad Delivery &amp; Rolling Reserve Payouts</text>
    `;
  } else {
    // Default: Episode 1 45° Glare-Free Product Lighting & 5600K Rule Overhead Diagram
    const showWarmBulb = safeIdx === 0;
    const showRingGlare = safeIdx === 1;
    const showFill = safeIdx >= 3;
    const showBack = safeIdx === 4;
    const keyRaysActive = safeIdx >= 2;
    const fillRaysActive = safeIdx >= 3;
    const backRaysActive = safeIdx === 4;

    const shadowOffsetX = safeIdx === 2 ? -34 : safeIdx >= 3 ? -8 : 0;
    const shadowAlpha = safeIdx === 2 ? 0.28 : 0.12;
    const rScale = 0.72 + 0.28 * rayPhase;

    const fillRays = [
      { x1: 350, y1: 790, x2: 365, y2: 678 },
      { x1: 392, y1: 816, x2: 438, y2: 726 },
      { x1: 418, y1: 862, x2: 498, y2: 840 }
    ];
    const keyRays = [
      { x1: 720, y1: 790, x2: 695, y2: 682 },
      { x1: 680, y1: 822, x2: 625, y2: 732 },
      { x1: 656, y1: 866, x2: 582, y2: 842 }
    ];
    const backRays = [
      { x1: 690, y1: 525, x2: 615, y2: 565 },
      { x1: 705, y1: 552, x2: 625, y2: 602 }
    ];

    diagramSvg = `
      <defs>
        <linearGradient id="leftEdgeShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#0F171E" stop-opacity="0.18" />
          <stop offset="55%" stop-color="#0F171E" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="rightEdgeShade" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stop-color="#0F171E" stop-opacity="0.18" />
          <stop offset="55%" stop-color="#0F171E" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="bottomMintFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#BAF2EC" stop-opacity="0" />
          <stop offset="100%" stop-color="#BAF2EC" stop-opacity="0.95" />
        </linearGradient>
        <radialGradient id="subjShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0F171E" stop-opacity="${shadowAlpha}" />
          <stop offset="100%" stop-color="#0F171E" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="backRimGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#25F4EE" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#25F4EE" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="warmCastGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FF9900" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#FF9900" stop-opacity="0" />
        </radialGradient>
        <clipPath id="sweepClip">
          <path d="M 255 424 L 825 424 Q 790 560 815 910 L 265 910 Q 290 560 255 424 Z" />
        </clipPath>
      </defs>

      <!-- 1. White Seamless Backdrop Paper Sweep -->
      <g clip-path="url(#sweepClip)">
        <rect x="240" y="420" width="600" height="500" fill="#FFFFFF" />
        <rect x="250" y="420" width="95" height="500" fill="url(#leftEdgeShade)" />
        <rect x="735" y="420" width="95" height="500" fill="url(#rightEdgeShade)" />
        <rect x="240" y="845" width="600" height="75" fill="url(#bottomMintFade)" />
      </g>

      <!-- 2. Backdrop Stand Crossbar & Side Tripods -->
      <g stroke="#0F1418" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <line x1="234" y1="424" x2="244" y2="520" />
        <line x1="240" y1="492" x2="206" y2="530" />
        <line x1="240" y1="492" x2="260" y2="504" />
        <line x1="212" y1="464" x2="238" y2="464" />
        <line x1="212" y1="456" x2="212" y2="472" />
        <line x1="846" y1="424" x2="836" y2="520" />
        <line x1="840" y1="492" x2="874" y2="530" />
        <line x1="840" y1="492" x2="820" y2="504" />
        <line x1="868" y1="464" x2="842" y2="464" />
        <line x1="868" y1="456" x2="868" y2="472" />
      </g>
      <rect x="212" y="412" width="656" height="16" rx="8" fill="#9CEAE2" stroke="#0F1418" stroke-width="3.5" />
      <rect x="210" y="410" width="32" height="20" rx="5" fill="#0F1418" />
      <rect x="838" y="410" width="32" height="20" rx="5" fill="#0F1418" />

      <!-- 3. Dynamic Cast Shadow Behind Creator -->
      <ellipse cx="${532 + shadowOffsetX}" cy="565" rx="58" ry="74" fill="url(#subjShadow)" transform="rotate(-8 ${532 + shadowOffsetX} 565)" />

      <!-- 3b. Beat 0: 3200K Warm Ceiling Bulb Warning -->
      ${
        showWarmBulb
          ? `
        <circle cx="532" cy="615" r="145" fill="url(#warmCastGlow)" />
        <circle cx="370" cy="495" r="34" fill="#FFB800" stroke="#0F1418" stroke-width="4" />
        <line x1="342" y1="467" x2="398" y2="523" stroke="#DF1B38" stroke-width="9" stroke-linecap="round" />
        <line x1="398" y1="467" x2="342" y2="523" stroke="#DF1B38" stroke-width="9" stroke-linecap="round" />
        <rect x="420" y="468" width="330" height="48" rx="12" fill="#0F1418" />
        <text x="585" y="500" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="22" fill="#FFE600" text-anchor="middle">3200K CEILING BULB = OFF</text>
      `
          : ''
      }

      <!-- 4. Back Light Rim Glow & 3 FT Separation (Beat 4) -->
      ${
        showBack
          ? `
        <circle cx="532" cy="615" r="95" fill="url(#backRimGlow)" />
        <line x1="455" y1="435" x2="455" y2="590" stroke="#0F1418" stroke-width="4" stroke-dasharray="8 8" />
        <rect x="340" y="485" width="170" height="44" rx="10" fill="#0F1418" />
        <text x="425" y="514" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#9CEAE2" text-anchor="middle">3 FT DEPTH</text>
      `
          : ''
      }

      <!-- 5. Creator / Subject (Top-Down View in Red Shirt) -->
      <g transform="translate(532, 632)">
        <ellipse cx="0" cy="38" rx="34" ry="18" fill="#180B0E" />
        <ellipse cx="-34" cy="48" rx="10" ry="13" transform="rotate(18 -34 48)" fill="#F3C1AA" stroke="#180B0E" stroke-width="3" />
        <ellipse cx="34" cy="48" rx="10" ry="13" transform="rotate(-18 34 48)" fill="#F3C1AA" stroke="#180B0E" stroke-width="3" />
        <path d="M -46 -12 Q 0 -28 46 -12 Q 58 16 42 44 L 26 44 Q 28 25 22 34 Q 0 42 -22 34 Q -28 25 -26 44 L -42 44 Q -58 16 -46 -12 Z" fill="#E11937" stroke="#180B0E" stroke-width="3.5" />
        <ellipse cx="0" cy="2" rx="24" ry="18" fill="#FFFFFF" />
        <ellipse cx="0" cy="4" rx="23" ry="25" fill="#F3C1AA" stroke="#180B0E" stroke-width="3" />
        <path d="M -22 2 A 23 23 0 1 1 22 2 Q 0 14 -22 2 Z" fill="#1A0A0E" />
      </g>

      <!-- 5b. Beat 1: 0° Ring Light Glare Warning on Glossy Bottle -->
      ${
        showRingGlare
          ? `
        <rect x="514" y="715" width="36" height="62" rx="8" fill="#0F1418" stroke="#FFFFFF" stroke-width="3" />
        <line x1="546" y1="845" x2="532" y2="778" stroke="#DF1B38" stroke-width="8" stroke-dasharray="10 8" />
        <rect x="330" y="772" width="420" height="48" rx="12" fill="#2B080C" />
        <text x="540" y="803" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="22" fill="#FF3355" text-anchor="middle">0° RING LIGHT = BOTTLE GLARE ✕</text>
      `
          : ''
      }

      <!-- 6. FILL LIGHT (Bottom Left + 3 Red Light Rays + FILL Label) -->
      <g opacity="${showFill ? '1' : '0.28'}">
        ${
          fillRaysActive
            ? `<g stroke="#DF1B38" stroke-width="10" stroke-linecap="round">
          ${fillRays
            .map((r) => {
              const x2 = (r.x1 + (r.x2 - r.x1) * rScale).toFixed(1);
              const y2 = (r.y1 + (r.y2 - r.y1) * rScale).toFixed(1);
              return `<line x1="${r.x1}" y1="${r.y1}" x2="${x2}" y2="${y2}" />`;
            })
            .join('')}
        </g>`
            : ''
        }
        <g transform="translate(306, 892) rotate(-32)">
          <rect x="-38" y="34" width="76" height="22" rx="8" fill="#0F1418" />
          <rect x="-56" y="-42" width="112" height="84" rx="16" fill="#0F1418" />
          <rect x="-45" y="-32" width="90" height="64" rx="10" fill="#A8F5ED" />
          <rect x="-18" y="-14" width="36" height="28" rx="6" fill="#125E63" />
          <circle cx="0" cy="0" r="5.5" fill="#FFFFFF" />
        </g>
        <text x="306" y="1034" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="43" fill="#0F1418" text-anchor="middle">FILL</text>
        ${
          showFill
            ? `
          <rect x="186" y="1050" width="240" height="42" rx="10" fill="#0F1418" />
          <text x="306" y="1078" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#9CEAE2" text-anchor="middle">45° • 35% OUTPUT</text>
        `
            : ''
        }
      </g>

      <!-- 7. KEY LIGHT (Bottom Right + Reflector Cone + KEY Label) -->
      <g opacity="${safeIdx >= 2 ? '1' : '0.45'}">
        ${
          keyRaysActive
            ? `<g stroke="#DF1B38" stroke-width="10" stroke-linecap="round">
          ${keyRays
            .map((r) => {
              const x2 = (r.x1 + (r.x2 - r.x1) * rScale).toFixed(1);
              const y2 = (r.y1 + (r.y2 - r.y1) * rScale).toFixed(1);
              return `<line x1="${r.x1}" y1="${r.y1}" x2="${x2}" y2="${y2}" />`;
            })
            .join('')}
        </g>`
            : ''
        }
        <g transform="translate(772, 892) rotate(-39)">
          <polygon points="-26,-20 -56,-78 28,-58 22,-10" fill="#0F1418" />
          <line x1="-50" y1="-73" x2="22" y2="-55" stroke="#9CEAE2" stroke-width="3.5" stroke-linecap="round" />
          <rect x="-32" y="-16" width="64" height="68" rx="12" fill="#0F1418" stroke="#9CEAE2" stroke-width="3" />
          <line x1="-18" y1="6" x2="18" y2="6" stroke="#9CEAE2" stroke-width="3" />
          <line x1="-18" y1="20" x2="18" y2="20" stroke="#9CEAE2" stroke-width="3" />
          <line x1="-18" y1="34" x2="18" y2="34" stroke="#9CEAE2" stroke-width="3" />
          <rect x="-16" y="52" width="32" height="16" rx="5" fill="#0F1418" stroke="#9CEAE2" stroke-width="3" />
        </g>
        <text x="804" y="1034" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="43" fill="#0F1418" text-anchor="middle">KEY</text>
        ${
          safeIdx >= 2
            ? `
          <rect x="664" y="1050" width="280" height="42" rx="10" fill="#0F1418" />
          <text x="804" y="1078" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="21" fill="#FFE600" text-anchor="middle">45° • 5600K • 100%</text>
        `
            : ''
        }
      </g>

      <!-- 8. BACK LIGHT (Top Right behind creator on Beat 4) -->
      ${
        showBack
          ? `
        <g>
          ${
            backRaysActive
              ? `<g stroke="#DF1B38" stroke-width="9" stroke-linecap="round">
            ${backRays
              .map((r) => {
                const x2 = (r.x1 + (r.x2 - r.x1) * rScale).toFixed(1);
                const y2 = (r.y1 + (r.y2 - r.y1) * rScale).toFixed(1);
                return `<line x1="${r.x1}" y1="${r.y1}" x2="${x2}" y2="${y2}" />`;
              })
              .join('')}
          </g>`
              : ''
          }
          <g transform="translate(742, 505) rotate(-123)">
            <rect x="-26" y="-22" width="52" height="48" rx="10" fill="#0F1418" stroke="#9CEAE2" stroke-width="3" />
            <polygon points="-20,-22 -36,-54 36,-54 20,-22" fill="#0F1418" />
          </g>
          <text x="742" y="452" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="30" fill="#0F1418" text-anchor="middle">RIM 25%</text>
        </g>
      `
          : ''
      }

      <!-- 9. CAMERA (Bottom Center at x=546, y=955) -->
      <g transform="translate(546, 955)">
        <rect x="-24" y="-88" width="48" height="86" rx="6" fill="#0F1418" />
        <rect x="-28" y="-94" width="56" height="12" rx="4" fill="#0F1418" stroke="#9CEAE2" stroke-width="2.5" />
        <g stroke="#8CE8E0" stroke-width="3">
          <line x1="-20" y1="-76" x2="20" y2="-76" />
          <line x1="-20" y1="-67" x2="20" y2="-67" />
          <line x1="-20" y1="-58" x2="20" y2="-58" />
          <line x1="-20" y1="-49" x2="20" y2="-49" />
          <line x1="-20" y1="-40" x2="20" y2="-40" />
          <line x1="-20" y1="-31" x2="20" y2="-31" />
          <line x1="-20" y1="-22" x2="20" y2="-22" />
        </g>
        <rect x="-38" y="-6" width="108" height="66" rx="12" fill="#0F1418" />
        <rect x="-30" y="4" width="56" height="46" rx="8" fill="none" stroke="#8CE8E0" stroke-width="3" />
        <circle cx="44" cy="28" r="15" fill="#8CE8E0" />
        <circle cx="44" cy="28" r="7" fill="#0F1418" />
        <circle cx="44" cy="6" r="5" fill="#FE2C55" />
        <rect x="-18" y="60" width="36" height="12" rx="4" fill="#0F1418" />
      </g>
      ${
        safeIdx === 4
          ? `
        <rect x="436" y="1050" width="220" height="42" rx="10" fill="#0F1418" />
        <text x="546" y="1078" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="20" fill="#FFE600" text-anchor="middle">AE/AF LOCKED ✓</text>
      `
          : ''
      }
    `;
  }

  // Optional static caption preview for standalone PNG verification
  let captionSvg = '';
  if (captionPreview && Array.isArray(captionPreview.words)) {
    const words = captionPreview.words;
    const activeIdx = captionPreview.activeIdx || 0;
    captionSvg = `
      <g transform="translate(540, 1445)" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="54" text-anchor="middle">
        <text y="0" xml:space="preserve" stroke="#0B0F14" stroke-width="14" stroke-linejoin="round" paint-order="stroke fill">${words
          .map(
            (w, idx) =>
              `<tspan fill="${idx === activeIdx ? '#FFE600' : '#FFFFFF'}"${idx > 0 ? ' dx="14"' : ''}>${escapeXml(w)}</tspan>`
          )
          .join('')}</text>
      </g>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="#BAF2EC" />
    ${diagramSvg}
    <!-- Dark Rounded Pill Header -->
    <rect x="${pillX}" y="${pillY}" width="${pillW}" height="96" rx="24" fill="#2B080C" stroke="#521018" stroke-width="3" />
    <text x="540" y="${pillY + 63}" font-family="Poppins, Segoe UI, Arial, sans-serif" font-weight="800" font-size="46" fill="#FF3355" text-anchor="middle" letter-spacing="1">${pillTitle}</text>
    ${captionSvg}
  </svg>`;
}

function fmtAssTime(sec) {
  const s = Math.max(0, sec);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.min(99, Math.round((s - Math.floor(s)) * 100));
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Writes Creator Academy-style word-by-word yellow-highlighted ASS subtitles
 * Each 2-3 word phrase stays on screen while the active word turns yellow (#FFE600 -> &H0000E6FF in ASS BGR)
 */
function wrapHookLines(text, maxChars = 28) {
  const clean = String(text || '').trim().replace(/\s+/g, ' ');
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  const words = clean.split(' ');
  if (words.length <= 2) return [clean];
  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ');
    const l2 = words.slice(i).join(' ');
    const diff = Math.abs(l1.length - l2.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }
  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

function measureHookWidth(str, fontSize = 44) {
  let units = 0;
  for (const ch of String(str || '')) {
    if ('ilI1|.,:;!\' '.includes(ch)) units += 0.25;
    else if ('mwMW@%&'.includes(ch)) units += 0.72;
    else if (ch >= 'A' && ch <= 'Z') units += 0.56;
    else units += 0.46;
  }
  return Math.round(units * fontSize * 0.76);
}

function makeRoundedRectAssPath(w, h, r) {
  const x0 = -Math.round(w / 2);
  const y0 = -Math.round(h / 2);
  const x1 = x0 + w;
  const y1 = y0 + h;
  const c = Math.round(r * 0.552);
  return [
    `m ${x0 + r} ${y0}`,
    `l ${x1 - r} ${y0}`,
    `b ${x1 - r + c} ${y0} ${x1} ${y0 + r - c} ${x1} ${y0 + r}`,
    `l ${x1} ${y1 - r}`,
    `b ${x1} ${y1 - r + c} ${x1 - r + c} ${y1} ${x1 - r} ${y1}`,
    `l ${x0 + r} ${y1}`,
    `b ${x0 + r - c} ${y1} ${x0} ${y1 - r + c} ${x0} ${y1 - r}`,
    `l ${x0} ${y0 + r}`,
    `b ${x0} ${y0 + r - c} ${x0 + r - c} ${y0} ${x0 + r} ${y0}`
  ].join(' ');
}

function buildHookAssEvents(hookBannerText, hookX = 540, hookY = 335) {
  const cleanHook = String(hookBannerText || '').trim();
  if (!cleanHook) return [];
  const lines = wrapHookLines(cleanHook, 28);
  const fontSize = 44;
  const maxLineW = Math.max(...lines.map((l) => measureHookWidth(l, fontSize)));
  const boxW = Math.min(680, Math.max(240, maxLineW + 48));
  const boxH = lines.length > 1 ? 124 : 76;
  const rectPath = makeRoundedRectAssPath(boxW, boxH, 12);
  const halfW = Math.round(boxW / 2) + 16;
  const halfH = Math.round(boxH / 2) + 16;
  const cx = Math.max(halfW, Math.min(1080 - halfW, Math.round(Number(hookX) || 540)));
  const cy = Math.max(halfH, Math.min(1920 - halfH, Math.round(Number(hookY) || 335)));
  const assText = lines.join('\\N');
  return [
    `Dialogue: 2,0:00:00.00,0:00:03.40,HookShape,,0,0,0,,{\\an7\\pos(${cx - 9},${cy - 9})\\1c&HEEF425&\\p1}${rectPath}{\\p0}`,
    `Dialogue: 3,0:00:00.00,0:00:03.40,HookShape,,0,0,0,,{\\an7\\pos(${cx + 9},${cy + 9})\\1c&H552CFE&\\p1}${rectPath}{\\p0}`,
    `Dialogue: 4,0:00:00.00,0:00:03.40,HookShape,,0,0,0,,{\\an7\\pos(${cx},${cy})\\1c&HFFFFFF&\\p1}${rectPath}{\\p0}`,
    `Dialogue: 5,0:00:00.00,0:00:03.40,HookText,,0,0,0,,{\\an5\\pos(${cx},${cy})}${assText}`
  ];
}

function writeKaraokeAssSubtitles(episode, lineWindows, outAssPath, hookBannerText = '', hookX = 540, hookY = 335, burnCaptions = true) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CreatorKaraoke,Poppins ExtraBold,58,&H00FFFFFF,&H00FFFFFF,&H000B0F14,&H60000000,-1,0,0,0,100,100,0,0,1,6.5,2.5,2,60,60,445,1
Style: HookShape,Poppins,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: HookText,Poppins,44,&H00111111,&H00111111,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0.2,0,1,0,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = [...buildHookAssEvents(hookBannerText, hookX, hookY)];
  if (!burnCaptions) {
    fs.writeFileSync(outAssPath, header + events.join('\n') + '\n', 'utf8');
    return;
  }
  for (const win of lineWindows) {
    const lineObj = (episode.lines && episode.lines[win.lineIndex]) || null;
    if (!lineObj || !lineObj.text) continue;

    const { phrases } = buildKaraokePhrases(lineObj.text);
    const totalChars = phrases.reduce(
      (acc, p) => acc + p.words.reduce((wa, w) => wa + w.length, 0),
      0
    );
    const lineSpan = Math.max(0.4, win.end - win.start);
    let cursor = win.start;

    for (let pIdx = 0; pIdx < phrases.length; pIdx++) {
      const phrase = phrases[pIdx];
      const phraseChars = phrase.words.reduce((a, w) => a + w.length, 0);
      const phraseDur =
        pIdx === phrases.length - 1
          ? Math.max(0.15, win.end - cursor)
          : lineSpan * (phraseChars / Math.max(1, totalChars));

      let wordCursor = cursor;
      for (let wIdx = 0; wIdx < phrase.words.length; wIdx++) {
        const wChars = phrase.words[wIdx].length;
        const wDur =
          wIdx === phrase.words.length - 1
            ? Math.max(0.08, cursor + phraseDur - wordCursor)
            : phraseDur * (wChars / Math.max(1, phraseChars));

        const t0 = fmtAssTime(wordCursor);
        const t1 = fmtAssTime(wordCursor + wDur);

        // Build the 2-3 word phrase with the active word in yellow (&H0000E6FF&) and others in white (&H00FFFFFF&)
        const formattedWords = phrase.words
          .map((w, idx) =>
            idx === wIdx ? `{\\c&H0000E6FF&}${w}{\\c&H00FFFFFF&}` : `{\\c&H00FFFFFF&}${w}`
          )
          .join(' ');

        events.push(`Dialogue: 1,${t0},${t1},CreatorKaraoke,,0,0,0,,${formattedWords}`);
        wordCursor += wDur;
      }
      cursor += phraseDur;
    }
  }

  fs.writeFileSync(outAssPath, header + events.join('\n') + '\n', 'utf8');
}

/**
 * Renders a complete 1080x1920 MP4 for an episode given lineWindows and optional audioPath
 */
async function renderIllustrationMp4(options) {
  const {
    episodeId = 'ep1-3point-lighting',
    customEpisode = null,
    lineWindows = null,
    audioInputPath = null,
    audioFilterChain = null,
    keepSegments = null,
    burnCaptions = true,
    burnHookBanner = false,
    hookBannerText = '',
    hookBannerX = 540,
    hookBannerY = 335,
    musicBedPath = null,
    outMp4Path = path.join(ARTIFACT_DIR, 'ep1_3_point_lighting_illustration.mp4')
  } = options || {};

  const episode =
    customEpisode || EPISODES.find((e) => e.id === episodeId) || EPISODES[0];

  // Build default lineWindows if none provided
  let windows = lineWindows;
  if (!windows || windows.length === 0) {
    let acc = 0;
    windows = episode.lines.map((l, idx) => {
      const start = acc;
      const end = acc + (l.duration || 6.5);
      acc = end;
      return { lineIndex: idx, start, end };
    });
  }

  // Render 2 animation frames per beat (rayPhase=0.65 and rayPhase=1.0) for crisp animated ray pulsing
  const platePaths = [];
  for (let i = 0; i < windows.length; i++) {
    const bIdx = windows[i].lineIndex;
    const svgA = buildSceneSvg(episode, bIdx, 0.55, null);
    const svgB = buildSceneSvg(episode, bIdx, 1.0, null);
    const pngA = path.join(SCRATCH_DIR, `beat_${i}_a.png`);
    const pngB = path.join(SCRATCH_DIR, `beat_${i}_b.png`);
    await renderSvgBufferToPngFile(svgA, pngA);
    await renderSvgBufferToPngFile(svgB, pngB);
    platePaths.push({ pngA, pngB, duration: Math.max(0.2, windows[i].end - windows[i].start) });
  }

  const assFilename = 'illustration_karaoke.ass';
  const assPath = path.join(SCRATCH_DIR, assFilename);
  const effectiveHook = burnHookBanner ? hookBannerText : '';
  const hasAnyAss = (burnCaptions !== false) || Boolean(effectiveHook);
  writeKaraokeAssSubtitles(episode, windows, assPath, effectiveHook, hookBannerX, hookBannerY, burnCaptions !== false);

  // Build FFmpeg filter_complex that alternates/pulses each beat's plates smoothly at 30fps and burns ASS karaoke captions
  const inputs = [];
  const filterParts = [];
  const vConcatInputs = [];

  platePaths.forEach((p, idx) => {
    const dur = p.duration.toFixed(3);
    inputs.push('-loop', '1', '-t', dur, '-i', p.pngA);
    inputs.push('-loop', '1', '-t', dur, '-i', p.pngB);
    const inA = idx * 2;
    const inB = idx * 2 + 1;
    // Smoothly pulse between plate A and plate B at 1.5Hz so light rays animate alive
    filterParts.push(
      `[${inA}:v][${inB}:v]blend=all_expr='A*(0.5+0.5*cos(2*PI*T*1.6))+B*(0.5-0.5*cos(2*PI*T*1.6))',fps=30,format=yuv420p[vb${idx}]`
    );
    vConcatInputs.push(`[vb${idx}]`);
  });

  const assClause = hasAnyAss ? `,ass=${assFilename}:fontsdir=fonts` : '';
  filterParts.push(
    `${vConcatInputs.join('')}concat=n=${platePaths.length}:v=1:a=0${assClause}[vout]`
  );

  const totalDuration = windows[windows.length - 1].end;
  const audioInputIdx = platePaths.length * 2;

  const args = ['-y', ...inputs];
  if (audioInputPath && fs.existsSync(audioInputPath)) {
    args.push('-i', audioInputPath);
    if (keepSegments && keepSegments.length > 1) {
      const af = audioFilterChain || 'anull';
      const aSplitLabels = keepSegments.map((_, sIdx) => `[ain${sIdx}]`).join('');
      filterParts.push(`[${audioInputIdx}:a]${af},asplit=${keepSegments.length}${aSplitLabels}`);
      const aConcat = [];
      keepSegments.forEach((seg, sIdx) => {
        const dur = Math.max(0.06, seg.end - seg.start);
        const fadeOutSt = Math.max(0, dur - 0.018).toFixed(3);
        filterParts.push(
          `[ain${sIdx}]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.018,afade=t=out:st=${fadeOutSt}:d=0.018[aseg${sIdx}]`
        );
        aConcat.push(`[aseg${sIdx}]`);
      });
      filterParts.push(
        `${aConcat.join('')}concat=n=${keepSegments.length}:v=0:a=1[aout]`
      );
    } else if (keepSegments && keepSegments.length === 1) {
      const seg = keepSegments[0];
      const af = audioFilterChain || 'anull';
      filterParts.push(
        `[${audioInputIdx}:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS,${af}[aout]`
      );
    } else {
      const af = audioFilterChain || 'anull';
      filterParts.push(`[${audioInputIdx}:a]${af}[aout]`);
    }
    if (musicBedPath && fs.existsSync(musicBedPath)) {
      const musicIdx = audioInputIdx + 1;
      args.push('-stream_loop', '-1', '-i', musicBedPath);
      const lastPartIdx = filterParts.length - 1;
      filterParts[lastPartIdx] = filterParts[lastPartIdx].replace(/\[aout\]$/, '[avoice]');
      filterParts.push(`[${musicIdx}:a]volume=0.085,aresample=48000[abed]`);
      filterParts.push(`[avoice][abed]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`);
    }
    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[vout]',
      '-map',
      '[aout]',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      '+faststart',
      outMp4Path
    );
  } else {
    // Silent audio track ready for voiceover recording
    args.push(
      '-f',
      'lavfi',
      '-t',
      totalDuration.toFixed(3),
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=48000'
    );
    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[vout]',
      '-map',
      `${audioInputIdx}:a`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-shortest',
      '-movflags',
      '+faststart',
      outMp4Path
    );
  }

  execFileSync(ffmpegBin, args, { cwd: SCRATCH_DIR, stdio: 'pipe' });
  return { outMp4Path, totalDuration };
}

if (require.main === module) {
  (async () => {
    // 1. Render verification PNG matching Beat 3 ("45° FILL @ 35% OUTPUT" + "35% output")
    const verifySvg = buildSceneSvg(EPISODES[0], 3, 1.0, {
      words: ['35%', 'output'],
      activeIdx: 0
    });
    const verifyPngPath = path.join(ARTIFACT_DIR, 'ep1_fill_light_preview.png');
    await sharp(Buffer.from(verifySvg)).png().toFile(verifyPngPath);
    console.log('Saved verification frame:', verifyPngPath);

    // 2. Render full Episode 1 1080x1920 MP4
    const outPath = path.join(ARTIFACT_DIR, 'ep1_3_point_lighting_illustration.mp4');
    const res = await renderIllustrationMp4({
      episodeId: 'ep1-3point-lighting',
      outMp4Path: outPath
    });
    fs.copyFileSync(outPath, path.join(SCRATCH_DIR, 'latest_take_mastered.mp4'));
    console.log('Rendered full Episode 1 MP4:', res.outMp4Path, `(${res.totalDuration}s)`);
  })();
}

module.exports = {
  buildSceneSvg,
  writeKaraokeAssSubtitles,
  renderIllustrationMp4
};
