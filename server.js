const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, execFileSync, spawn } = require('child_process');

const appDataRoot = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const studioDataDir = process.env.XL_STUDIO_DATA_DIR || path.join(appDataRoot, 'XL Creator Studio');
const brainDir = studioDataDir;
const localHtmlPath = path.join(__dirname, 'webcam_practice_recorder.html');
const htmlPath = localHtmlPath;
const scratchDir = path.join(studioDataDir, 'workspace');
const bundledAssetsDir = path.join(__dirname, 'assets');
const bundledFontsDir = path.join(bundledAssetsDir, 'fonts');
const mpDir = path.join(bundledAssetsDir, 'mediapipe');
const imgRoot = path.join(bundledAssetsDir, 'backgrounds');

let ffmpegBin = 'ffmpeg';
try {
  const ffStatic = require('ffmpeg-static');
  if (ffStatic && fs.existsSync(ffStatic)) ffmpegBin = ffStatic;
} catch (e) {}
if (ffmpegBin === 'ffmpeg') {
  const localFf = path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fs.existsSync(localFf)) ffmpegBin = localFf;
}

const whisperDir = path.join(bundledAssetsDir, 'whisper');
const whisperCliBin = path.join(whisperDir, 'whisper-cli.exe');
const whisperModelPath = path.join(whisperDir, 'ggml-tiny.en-q5_1.bin');

function detectHardwareH264Encoder() {
  const candidates = ['h264_nvenc', 'h264_amf', 'h264_qsv'];
  for (const enc of candidates) {
    try {
      const pixFmt = enc === 'h264_qsv' ? 'nv12' : 'yuv420p';
      execFileSync(
        ffmpegBin,
        ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.04', '-frames:v', '1', '-pix_fmt', pixFmt, '-c:v', enc, '-f', 'null', '-'],
        { timeout: 4000, windowsHide: true, stdio: 'ignore' }
      );
      return enc;
    } catch (e) {}
  }
  return 'libx264';
}

const HW_H264_ENCODER = detectHardwareH264Encoder();

function getVideoEncoderArgs(crf = 20, forceCpu = false) {
  const q = String(crf);
  const hwQ = String(Math.min(28, crf + 1));
  if (!forceCpu && HW_H264_ENCODER === 'h264_nvenc') {
    return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', hwQ, '-b:v', '0'];
  }
  if (!forceCpu && HW_H264_ENCODER === 'h264_amf') {
    return ['-c:v', 'h264_amf', '-rc', 'cqp', '-qp_i', hwQ, '-qp_p', hwQ];
  }
  if (!forceCpu && HW_H264_ENCODER === 'h264_qsv') {
    return ['-c:v', 'h264_qsv', '-global_quality', hwQ];
  }
  return ['-c:v', 'libx264', '-preset', 'fast', '-crf', q];
}

function execFfmpegWithCpuFallback(buildArgsFn, opts, cb) {
  const primaryArgs = buildArgsFn(false);
  execFile(ffmpegBin, primaryArgs, opts, (err, stdout, stderr) => {
    if (!err || HW_H264_ENCODER === 'libx264') {
      return cb(err, stdout, stderr);
    }
    const fallbackArgs = buildArgsFn(true);
    execFile(ffmpegBin, fallbackArgs, opts, cb);
  });
}

const { EPISODES, buildKaraokePhrases } = require('./illustration_episodes.js');
const { renderIllustrationMp4 } = require('./render_illustration_video.js');

fs.mkdirSync(scratchDir, { recursive: true });
const scratchFontsDir = path.join(scratchDir, 'fonts');
fs.mkdirSync(scratchFontsDir, { recursive: true });

// Copy bundled fonts into workspace/fonts so FFmpeg libass (fontsdir=fonts) and /fonts/* work on any PC
try {
  if (fs.existsSync(bundledFontsDir)) {
    const fontFiles = fs.readdirSync(bundledFontsDir);
    for (const f of fontFiles) {
      if (/\.(ttf|otf)$/i.test(f)) {
        const destFont = path.join(scratchFontsDir, f);
        if (!fs.existsSync(destFont)) {
          fs.copyFileSync(path.join(bundledFontsDir, f), destFont);
        }
      }
    }
  }
} catch (e) {}

process.on('uncaughtException', (err) => {
  try {
    fs.appendFileSync(path.join(scratchDir, 'server_error.log'), `[uncaughtException] ${new Date().toISOString()} ${err.stack || err}\n`);
  } catch (e) {}
});

process.on('unhandledRejection', (err) => {
  try {
    fs.appendFileSync(path.join(scratchDir, 'server_error.log'), `[unhandledRejection] ${new Date().toISOString()} ${(err && err.stack) || err}\n`);
  } catch (e) {}
});

const takeHistoryPath = path.join(scratchDir, 'take_history.json');
function loadTakeHistory() {
  const demoFiles = new Set([
    'vault_ep4_camera_hacks.mp4',
    'vault_ep3_lighting_angle.mp4',
    'vault_ep2_wireless_mic.mp4',
    'vault_ep1_camera_distance.mp4',
    'vault_frank_intro_bare_minimum.mp4'
  ]);
  let existingCustom = [];
  try {
    if (fs.existsSync(takeHistoryPath)) {
      const parsed = JSON.parse(fs.readFileSync(takeHistoryPath, 'utf8'));
      if (Array.isArray(parsed)) {
        existingCustom = parsed.filter(
          (t) =>
            t &&
            t.file &&
            !demoFiles.has(t.file) &&
            fs.existsSync(path.join(scratchDir, t.file)) &&
            Number(t.duration || 0) >= 1.0 &&
            !/^Free Record Take\.\.\.$/i.test(String(t.label || '')) &&
            !/^Move your phone camera/i.test(String(t.label || ''))
        );
      }
    }
  } catch (e) {}

  const merged = existingCustom.slice(0, 12);
  try {
    fs.writeFileSync(takeHistoryPath, JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {}
  return merged;
}

let TAKE_HISTORY = loadTakeHistory();

function addTakeToHistory({ file, rawFile, label, duration, freeLines, hookBannerText }) {
  const entry = {
    id: path.basename(file, '.mp4'),
    file,
    rawFile: rawFile || null,
    url: `/takes/${file}`,
    label: label || `Take • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    duration: Number(Number(duration || 0).toFixed(1)),
    freeLines: Array.isArray(freeLines) ? freeLines : [],
    hookBannerText: hookBannerText || '',
    timestamp: new Date().toISOString()
  };
  const others = TAKE_HISTORY.filter((t) => t.file !== file).slice(0, 11);
  TAKE_HISTORY = [entry, ...others];
  try {
    fs.writeFileSync(takeHistoryPath, JSON.stringify(TAKE_HISTORY, null, 2), 'utf8');
  } catch (e) {}
  return TAKE_HISTORY;
}

const EMPTY_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);


// Pure-JS Minimal QR Code SVG Generator (Version 2-4 Byte Mode, ECC L) + Deterministic Scannable Matrix
function ensureMusicBedWav() {
  const bedPath = path.join(scratchDir, 'music_bed_loop.wav');
  if (fs.existsSync(bedPath) && fs.statSync(bedPath).size > 1000) {
    return bedPath;
  }
  try {
    const { execFileSync } = require('child_process');
    // Generate a warm, Spark-Ad-safe 16-second ambient lo-fi synth chord pad (C major 9th warm filtered harmonic bed)
    execFileSync(
      ffmpegBin,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        'aevalsrc=0.18*sin(2*PI*130.81*t)+0.14*sin(2*PI*164.81*t)+0.12*sin(2*PI*196.00*t)+0.10*sin(2*PI*246.94*t)+0.08*sin(2*PI*293.66*t)*(0.65+0.35*sin(2*PI*2.0*t)):s=48000:d=16',
        '-af',
        'lowpass=f=1600,highpass=f=90,afade=t=in:st=0:d=0.4,afade=t=out:st=15.6:d=0.4',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-c:a',
        'pcm_s16le',
        bedPath
      ],
      { cwd: scratchDir, timeout: 20000 }
    );
  } catch (e) {}
  return bedPath;
}
ensureMusicBedWav();

function ensureViralSfxWav() {
  const sfxPath = path.join(scratchDir, 'viral_sfx_accents.wav');
  if (fs.existsSync(sfxPath) && fs.statSync(sfxPath).size > 1000) {
    return sfxPath;
  }
  try {
    const { execFileSync } = require('child_process');
    // Broadcast micro-SFX accent: soft UI pop at 0.04s (Hook Banner snap-in) + subtle harmonic whoosh chime at 3.35s (Hook Banner exit)
    const expr = "0.22*exp(-38*t)*sin(2*PI*(520+240*t)*t)*between(t,0,0.12) + 0.16*exp(-18*(t-3.35))*(sin(2*PI*440*(t-3.35))+0.6*sin(2*PI*659.25*(t-3.35)))*between(t,3.35,3.70)";
    execFileSync(
      ffmpegBin,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `aevalsrc='${expr}':s=48000:d=5`,
        '-af',
        'lowpass=f=4200,highpass=f=120',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-c:a',
        'pcm_s16le',
        sfxPath
      ],
      { cwd: scratchDir, timeout: 15000 }
    );
  } catch (e) {}
  return sfxPath;
}
ensureViralSfxWav();


// Minimal Dependency-Free ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, Error Correction Level L)
const QR_GF_EXP = new Uint8Array(512);
const QR_GF_LOG = new Uint8Array(256);
(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    QR_GF_EXP[i] = x;
    QR_GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) QR_GF_EXP[i] = QR_GF_EXP[i - 255];
})();
function qrGfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return QR_GF_EXP[QR_GF_LOG[a] + QR_GF_LOG[b]];
}
function qrRsEncode(data, ecLen) {
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    const root = QR_GF_EXP[i];
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= qrGfMul(gen[j], root);
    }
    gen = next;
  }
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= qrGfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}
const QR_VERSIONS = {
  3: { size: 29, totalData: 55, ecLen: 15, align: [6, 22] },
  4: { size: 33, totalData: 80, ecLen: 20, align: [6, 26] },
  5: { size: 37, totalData: 108, ecLen: 26, align: [6, 30] }
};
function generateQrSvg(text) {
  const bytes = Buffer.from(String(text || ''), 'utf8');
  let ver = 3;
  if (bytes.length > 53) ver = 4;
  if (bytes.length > 78) ver = 5;
  const spec = QR_VERSIONS[ver];
  const { size, totalData, ecLen, align } = spec;

  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
  for (let i = 0; i < 4 && bits.length < totalData * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const dataBytes = new Uint8Array(totalData);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    dataBytes[i] = b;
  }
  let padToggle = true;
  for (let i = Math.floor(bits.length / 8); i < totalData; i++) {
    dataBytes[i] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }
  const ecBytes = qrRsEncode(dataBytes, ecLen);
  const allCodewords = new Uint8Array(totalData + ecLen);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecBytes, totalData);

  const mat = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const isFunc = Array.from({ length: size }, () => new Uint8Array(size).fill(0));

  const setFinder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        mat[r][c] = inOuter || inInner ? 1 : 0;
        isFunc[r][c] = 1;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    mat[6][i] = i % 2 === 0 ? 1 : 0;
    isFunc[6][i] = 1;
    mat[i][6] = i % 2 === 0 ? 1 : 0;
    isFunc[i][6] = 1;
  }

  for (const ar of align) {
    for (const ac of align) {
      if ((ar === 6 && ac === 6) || (ar === 6 && ac === size - 7) || (ar === size - 7 && ac === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = ar + dr;
          const c = ac + dc;
          mat[r][c] = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0;
          isFunc[r][c] = 1;
        }
      }
    }
  }

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunc[8][i] = 1;
      isFunc[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][size - 1 - i] = 1;
    isFunc[size - 1 - i][8] = 1;
  }
  mat[size - 8][8] = 1;
  isFunc[size - 8][8] = 1;

  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  let up = true;
  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5;
    for (let cnt = 0; cnt < size; cnt++) {
      const r = up ? size - 1 - cnt : cnt;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!isFunc[r][c]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (allCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          // Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) bit ^= 1;
          mat[r][c] = bit;
        }
      }
    }
    up = !up;
  }

  // Format info for ECC Level L (01) + Mask 0 (000) -> 0x77c4
  const fmtBits = 0x77c4;
  const fmtCoordsA = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const b = (fmtBits >> i) & 1;
    const [r, c] = fmtCoordsA[i];
    mat[r][c] = b;
  }
  for (let i = 0; i < 7; i++) {
    mat[size - 1 - i][8] = (fmtBits >> i) & 1;
  }
  for (let i = 7; i < 15; i++) {
    mat[8][size - 15 + i] = (fmtBits >> i) & 1;
  }

  const margin = 3;
  const full = size + margin * 2;
  let paths = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (mat[r][c] === 1) {
        paths += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="180" height="180" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#FFFFFF" rx="2"/><path d="${paths}" fill="#0F1418"/></svg>`;
}

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function episodeToScriptLines(episode) {
  return (episode.lines || []).map((l) => {
    const wordsArr = String(l.text || '').split(/\s+/).filter(Boolean);
    const words = wordsArr.length;
    const duration = l.duration || Math.max(2.5, Number((words / 2.15).toFixed(1)));
    const { phrases } = buildKaraokePhrases(l.text);
    const chunks = phrases.map((p) => p.words.join(' '));
    return {
      beatTitle: l.beatTitle || 'KEY POINT',
      text: l.text,
      words,
      duration,
      chunks: chunks.length ? chunks : [l.text]
    };
  });
}

let currentEpisodeId = 'custom';
let SCRIPT_LINES = [];

function parseCustomScriptLines(rawText) {
  const rows = String(rawText || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];
  return rows.map((rawRow, idx) => {
    // Allow optional "[BEAT TITLE] Spoken sentence..." syntax per line
    let beatTitle = `STEP ${idx + 1}`;
    let text = rawRow;
    const bracketMatch = rawRow.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (bracketMatch) {
      beatTitle = bracketMatch[1].trim().toUpperCase();
      text = bracketMatch[2].trim();
    }
    const wordsArr = text.split(/\s+/).filter(Boolean);
    const words = wordsArr.length;
    const duration = Math.max(2.5, Number((words / 2.15).toFixed(1)));
    const { phrases } = buildKaraokePhrases(text);
    const chunks = phrases.map((p) => p.words.join(' '));
    return { beatTitle, text, words, duration, chunks: chunks.length ? chunks : [text] };
  });
}

const BG_MAP = {
  '/bg/studio.jpg': path.join(imgRoot, 'studio.jpg'),
  '/bg/booth.jpg': path.join(imgRoot, 'booth.jpg'),
  '/bg/creator.jpg': path.join(imgRoot, 'creator.jpg')
};

const MIME_MAP = {
  '.js': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.tflite': 'application/octet-stream',
  '.binarypb': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

// ============================================================================
// NATIVE WINDOWS SPEECH-TO-TEXT ENGINE (Live Mic Stream + WAV File Fallback)
// Eliminates browser dependency on Chrome's private Web Speech API keys
// ============================================================================
const liveSpeechState = {
  interim: '',
  lines: [],
  seq: 0
};
let nativeSpeechProc = null;

function resetNativeLiveSpeechState() {
  liveSpeechState.interim = '';
  liveSpeechState.lines = [];
  liveSpeechState.seq++;
}

function startNativeLiveSpeechWorker() {
  if (nativeSpeechProc) return;
  try {
    const workerScriptPath = path.join(scratchDir, 'native_speech_worker.ps1');
    const psCode = [
      'Add-Type -AssemblyName System.Speech',
      'try {',
      '  $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine([System.Globalization.CultureInfo]::GetCultureInfo("en-US"))',
      '  $rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))',
      '  $rec.SetInputToDefaultAudioDevice()',
      '  $rec.BabbleTimeout = [TimeSpan]::FromSeconds(0)',
      '  $rec.InitialSilenceTimeout = [TimeSpan]::FromSeconds(0)',
      '  $rec.EndSilenceTimeout = [TimeSpan]::FromSeconds(0.42)',
      '  $rec.EndSilenceTimeoutAmbiguous = [TimeSpan]::FromSeconds(0.55)',
      '  Register-ObjectEvent -InputObject $rec -EventName SpeechHypothesized -Action {',
      '    if ($Event.SourceEventArgs.Result -and $Event.SourceEventArgs.Result.Text) {',
      '      $obj = @{ type = "interim"; text = $Event.SourceEventArgs.Result.Text } | ConvertTo-Json -Compress',
      '      [Console]::Out.WriteLine("STT_JSON:$obj")',
      '      [Console]::Out.Flush()',
      '    }',
      '  } | Out-Null',
      '  Register-ObjectEvent -InputObject $rec -EventName SpeechRecognized -Action {',
      '    if ($Event.SourceEventArgs.Result -and $Event.SourceEventArgs.Result.Text) {',
      '      $obj = @{ type = "final"; text = $Event.SourceEventArgs.Result.Text } | ConvertTo-Json -Compress',
      '      [Console]::Out.WriteLine("STT_JSON:$obj")',
      '      [Console]::Out.Flush()',
      '    }',
      '  } | Out-Null',
      '  $rec.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)',
      '  while ($true) { Start-Sleep -Milliseconds 180 }',
      '} catch {}'
    ].join('\r\n');
    fs.writeFileSync(workerScriptPath, psCode, 'utf8');

    nativeSpeechProc = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', workerScriptPath],
      { cwd: scratchDir, windowsHide: true }
    );

    let stdoutBuf = '';
    nativeSpeechProc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString('utf8');
      const rows = stdoutBuf.split(/\r?\n/);
      stdoutBuf = rows.pop() || '';
      for (const row of rows) {
        const idx = row.indexOf('STT_JSON:');
        if (idx === -1) continue;
        try {
          const msg = JSON.parse(row.slice(idx + 9));
          if (msg.type === 'interim' && msg.text) {
            liveSpeechState.interim = String(msg.text).trim();
            liveSpeechState.seq++;
          } else if (msg.type === 'final' && msg.text) {
            const cleanTxt = String(msg.text).trim();
            if (cleanTxt) {
              liveSpeechState.lines.push(cleanTxt);
            }
            liveSpeechState.interim = '';
            liveSpeechState.seq++;
          }
        } catch (e) {}
      }
    });

    nativeSpeechProc.on('exit', () => {
      nativeSpeechProc = null;
    });
  } catch (e) {
    nativeSpeechProc = null;
  }
}

function stopNativeLiveSpeechWorker() {
  if (!nativeSpeechProc) return;
  try {
    nativeSpeechProc.kill();
  } catch (e) {}
  nativeSpeechProc = null;
}

let warmWavSttProc = null;
let warmWavSttReady = false;
let warmWavSttSeq = 0;
const warmWavPending = new Map();

function ensureWarmWavSpeechWorker() {
  if (warmWavSttProc) return;
  try {
    const scriptPath = path.join(scratchDir, 'native_warm_wav_stt.ps1');
    const psCode = [
      'Add-Type -AssemblyName System.Speech',
      '$rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine([System.Globalization.CultureInfo]::GetCultureInfo("en-US"))',
      '$rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))',
      '[Console]::Out.WriteLine("WARM_STT_READY")',
      '[Console]::Out.Flush()',
      'while ($true) {',
      '  $line = [Console]::In.ReadLine()',
      '  if ($null -eq $line) { break }',
      '  if (-not $line.StartsWith("REQ|")) { continue }',
      '  $parts = $line.Split("|", 3)',
      '  if ($parts.Length -lt 3) { continue }',
      '  $reqId = $parts[1]',
      '  $wavPath = $parts[2]',
      '  $out = @()',
      '  try {',
      '    if (Test-Path -LiteralPath $wavPath) {',
      '      $rec.SetInputToWaveFile($wavPath)',
      '      while ($true) {',
      '        try {',
      '          $res = $rec.Recognize()',
      '          if ($null -eq $res) { break }',
      '          if ($res.Text) { $out += $res.Text }',
      '        } catch {',
      '          break',
      '        }',
      '      }',
      '      try { $rec.SetInputToNull() } catch {}',
      '    }',
      '  } catch {',
      '    try { $rec.SetInputToNull() } catch {}',
      '  }',
      '  $json = ConvertTo-Json -InputObject @($out) -Compress',
      '  [Console]::Out.WriteLine("RES|$reqId|$json")',
      '  [Console]::Out.Flush()',
      '}'
    ].join('\r\n');
    fs.writeFileSync(scriptPath, psCode, 'utf8');

    warmWavSttProc = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { cwd: scratchDir, windowsHide: true }
    );

    let outBuf = '';
    warmWavSttProc.stdout.on('data', (chunk) => {
      outBuf += chunk.toString('utf8');
      const rows = outBuf.split(/\r?\n/);
      outBuf = rows.pop() || '';
      for (const row of rows) {
        if (row.includes('WARM_STT_READY')) {
          warmWavSttReady = true;
          continue;
        }
        const idx = row.indexOf('RES|');
        if (idx === -1) continue;
        const rest = row.slice(idx + 4);
        const sep = rest.indexOf('|');
        if (sep === -1) continue;
        const reqId = rest.slice(0, sep);
        const rawJson = rest.slice(sep + 1).trim();
        const entry = warmWavPending.get(reqId);
        if (entry) {
          warmWavPending.delete(reqId);
          clearTimeout(entry.timer);
          try { fs.unlinkSync(entry.tempWav); } catch (e) {}
          try {
            const parsed = JSON.parse(rawJson || '[]');
            const arr = Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [String(parsed)] : []);
            entry.cb(arr);
          } catch (e) {
            entry.cb([]);
          }
        }
      }
    });

    warmWavSttProc.on('exit', () => {
      warmWavSttProc = null;
      warmWavSttReady = false;
      for (const [, entry] of warmWavPending.entries()) {
        clearTimeout(entry.timer);
        try { fs.unlinkSync(entry.tempWav); } catch (e) {}
        entry.cb([]);
      }
      warmWavPending.clear();
    });
  } catch (e) {
    warmWavSttProc = null;
    warmWavSttReady = false;
  }
}

// Start warm WAV speech worker on server boot so transcription is instant (~300ms) without touching hardware mic
ensureWarmWavSpeechWorker();

function transcribeAudioFileWithWindowsSpeech(mediaPath, cb) {
  if (!mediaPath || !fs.existsSync(mediaPath)) return cb([]);
  ensureWarmWavSpeechWorker();
  const tempWav = path.join(scratchDir, `stt_fallback_${Date.now()}_${++warmWavSttSeq}.wav`);
  execFile(
    ffmpegBin,
    [
      '-y',
      '-i',
      mediaPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-af',
      'highpass=f=85,lowpass=f=7600,dynaudnorm=f=150:g=15',
      tempWav
    ],
    { cwd: scratchDir, timeout: 20000, windowsHide: true },
    (ffErr) => {
      if (ffErr || !fs.existsSync(tempWav)) {
        try { fs.unlinkSync(tempWav); } catch (e) {}
        return cb([]);
      }

      const runWindowsSpeechFallback = () => {
        if (warmWavSttProc && warmWavSttProc.stdin && !warmWavSttProc.killed) {
          const reqId = String(++warmWavSttSeq);
          const timer = setTimeout(() => {
            if (warmWavPending.has(reqId)) {
              warmWavPending.delete(reqId);
              try { fs.unlinkSync(tempWav); } catch (e) {}
              cb([]);
            }
          }, 15000);
          warmWavPending.set(reqId, { cb, tempWav, timer });
          try {
            warmWavSttProc.stdin.write(`REQ|${reqId}|${tempWav}\r\n`);
            return;
          } catch (e) {
            warmWavPending.delete(reqId);
            clearTimeout(timer);
          }
        }

        const wavScriptPath = path.join(scratchDir, 'native_wav_stt.ps1');
        const psWav = [
          'param([string]$WavPath)',
          'Add-Type -AssemblyName System.Speech',
          '$out = @()',
          'try {',
          '  $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine([System.Globalization.CultureInfo]::GetCultureInfo("en-US"))',
          '  $rec.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))',
          '  $rec.SetInputToWaveFile($WavPath)',
          '  while ($true) {',
          '    try {',
          '      $res = $rec.Recognize()',
          '      if ($null -eq $res) { break }',
          '      if ($res.Text) { $out += $res.Text }',
          '    } catch {',
          '      break',
          '    }',
          '  }',
          '  $rec.Dispose()',
          '} catch {}',
          '$json = ConvertTo-Json -InputObject @($out) -Compress',
          '[Console]::Out.WriteLine("WAV_STT_JSON:$json")'
        ].join('\r\n');
        try {
          fs.writeFileSync(wavScriptPath, psWav, 'utf8');
        } catch (e) {}
        execFile(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', wavScriptPath, '-WavPath', tempWav],
          { cwd: scratchDir, timeout: 25000, windowsHide: true },
          (psErr, stdout) => {
            try { fs.unlinkSync(tempWav); } catch (e) {}
            const outStr = String(stdout || '');
            const marker = outStr.indexOf('WAV_STT_JSON:');
            if (marker === -1) return cb([]);
            try {
              const rawJson = outStr.slice(marker + 13).trim().split(/\r?\n/)[0];
              if (!rawJson) return cb([]);
              const parsed = JSON.parse(rawJson);
              const arr = Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [String(parsed)] : []);
              return cb(arr);
            } catch (e) {
              return cb([]);
            }
          }
        );
      };

      // Primary ASR Engine: Bundled Whisper.cpp (ggml-tiny.en-q5_1) with word-boundary splitting (-ml 36 -sow)
      if (fs.existsSync(whisperCliBin) && fs.existsSync(whisperModelPath)) {
        const outJsonBase = path.join(scratchDir, `whisper_out_${Date.now()}_${++warmWavSttSeq}`);
        const outJsonFile = `${outJsonBase}.json`;
        execFile(
          whisperCliBin,
          ['-m', whisperModelPath, '-f', tempWav, '-ml', '36', '-sow', '-oj', '-np', '-of', outJsonBase],
          { cwd: whisperDir, timeout: 25000, windowsHide: true },
          (wErr) => {
            try {
              if (!wErr && fs.existsSync(outJsonFile)) {
                const parsed = JSON.parse(fs.readFileSync(outJsonFile, 'utf8'));
                try { fs.unlinkSync(outJsonFile); } catch (e) {}
                const segments = Array.isArray(parsed && parsed.transcription) ? parsed.transcription : [];
                const whisperPhrases = [];
                const whisperLines = [];
                for (const seg of segments) {
                  const cleanTxt = String(seg.text || '')
                    .replace(/\[(?:BLANK_AUDIO|MUSIC|SILENCE|APPLAUSE|LAUGHTER|_+)[^\]]*\]/gi, '')
                    .replace(/\((?:music|silence|applause|laughter|blank audio)[^)]*\)/gi, '')
                    .trim();
                  if (!cleanTxt || cleanTxt.length < 2) continue;
                  const sSec = seg.offsets && typeof seg.offsets.from === 'number' ? Number((seg.offsets.from / 1000).toFixed(2)) : 0;
                  const eSec = seg.offsets && typeof seg.offsets.to === 'number' ? Number((seg.offsets.to / 1000).toFixed(2)) : sSec + 1.8;
                  whisperPhrases.push({ start: sSec, end: Math.max(sSec + 0.25, eSec), text: cleanTxt });
                  whisperLines.push(cleanTxt);
                }
                if (whisperLines.length > 0) {
                  try { fs.unlinkSync(tempWav); } catch (e) {}
                  studioState.lastWhisperPhrases = whisperPhrases;
                  return cb(whisperLines);
                }
              } else if (fs.existsSync(outJsonFile)) {
                try { fs.unlinkSync(outJsonFile); } catch (e) {}
              }
            } catch (e) {}
            runWindowsSpeechFallback();
          }
        );
        return;
      }

      runWindowsSpeechFallback();
    }
  );
}

const autoAudioProfilePath = path.join(scratchDir, 'auto_audio_profile.json');
const DEFAULT_AUTO_AUDIO_PROFILE = {
  calibrated: true,
  source: 'Calibrated Broadcast Voice Profile',
  noiseFloorDb: -54.2,
  speechRmsDb: -20.2,
  speechPeakDb: -1.4,
  measuredLufs: -15.9,
  targetLufs: -14.0,
  postLufs: -14.0,
  postPeakDb: -1.0,
  hpFreq: 95,
  nrAmountDb: 12,
  mudCutDb: -3.8,
  boxCutDb: -3.6,
  honkCutDb: -2.4,
  roomResonanceHz: 390,
  echoTailRatio: 0.22,
  presenceBoostDb: 3.4,
  deEssCutDb: -3.2,
  airBoostDb: 3.0,
  gateThresholdLinear: 0.008,
  gateRangeLinear: 0.25,
  gateRatio: 2.2,
  compThresholdDb: -21,
  compRatio: 2.8,
  makeupGainDb: 2.5,
  acousticDiagnosis: 'Balanced Room • De-Reverb Expander Active',
  acousticTip: 'Mic distance & room acoustics look solid.',
  masteredCheckUrl: null,
  summary: 'NR -12dB • De-Echo Gate • 390Hz Anti-Ring • Pres +3.4dB • De-Ess • -14.0 LUFS'
};

function loadAutoAudioProfile() {
  try {
    if (fs.existsSync(autoAudioProfilePath)) {
      const parsed = JSON.parse(fs.readFileSync(autoAudioProfilePath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        const merged = { ...DEFAULT_AUTO_AUDIO_PROFILE, ...parsed };
        if (typeof merged.summary === 'string') {
          merged.summary = merged.summary.replace(/\s+\?\s+/g, ' • ');
        }
        return merged;
      }
    }
  } catch (e) {}
  return { ...DEFAULT_AUTO_AUDIO_PROFILE };
}

function saveAutoAudioProfile(prof) {
  const merged = { ...DEFAULT_AUTO_AUDIO_PROFILE, ...(prof || {}), calibrated: true, updatedAt: new Date().toISOString() };
  if (typeof merged.summary === 'string') {
    merged.summary = merged.summary.replace(/\s+\?\s+/g, ' • ');
  }
  try {
    fs.writeFileSync(autoAudioProfilePath, JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {}
  return merged;
}

let AUTO_AUDIO_PROFILE = loadAutoAudioProfile();

let latestPreviewJpeg = null;
let stateVersion = 1;

function getLineBankStatus() {
  return SCRIPT_LINES.map((_, i) => {
    const p = path.join(scratchDir, `line_${i}.webm`);
    return fs.existsSync(p) && fs.statSync(p).size > 100;
  });
}

const studioState = {
  version: 1,
  visualFormat: 'webcam',
  episodeId: '',
  currentMode: 'free',
  wpmMode: 'voice',
  prompterView: 'pinned',
  bgMode: 'none',
  keyLight: 'feathered',
  camTilt: 8,
  eyelinePct: 38,
  audioPreset: 'auto',
  autoAudioProfile: AUTO_AUDIO_PROFILE,
  micGain: 2,
  trimSilence: true,
  burnCaptions: true,
  autoStop: true,
  activeIdx: 0,
  spokenWordCount: 0,
  lineProgress: 0,
  isRunning: false,
  isReplaying: false,
  countdown: 0,
  directorCue: '',
  micLevel: 0,
  timerText: '00:00.0 • FREE',
  statusText: 'STANDBY • Free Record Mode',
  masteredMp4: '/takes/latest_take_mastered.mp4',
  takeHistory: TAKE_HISTORY,
  hookBannerText: '',
  hookBannerX: 540,
  hookBannerY: 335,
  burnHookBanner: true,
  coldOpenTrim: true,
  dynamicZoom: false,
  musicBed: false,
  avDelayMs: 0,
  dslrFraming: 'standard',
  zebraWarning: false,
  colorCaptions: true,
  lensPolish: true,
  viralSfx: false,
  abBadgeMode: 'off',
  fontTheme: 'classic_poppins',
  fontCase: 'default',
  fontBacking: 'default',
  fontScale: 100,
  lines: [],
  hookSuggestions: [],
  lanIp: getLanIp(),
  pendingCommand: null,
  commandId: 0
};

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'Connection': 'close'
  });
  res.end(body);
}

function clampNum(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getAfChain(preset, customProfile = null, avDelayMs = 0) {
  const delayMs = Math.round(clampNum(avDelayMs, 0, 250, 0));
  const delayPrefix = delayMs > 0 ? `adelay=${delayMs}|${delayMs},` : '';
  const p = { ...DEFAULT_AUTO_AUDIO_PROFILE, ...(AUTO_AUDIO_PROFILE || {}), ...(customProfile || {}) };
  const resHz = Math.round(clampNum(p.roomResonanceHz, 175, 720, 390));

  if (preset === 'raw') {
    return delayPrefix + 'aresample=48000';
  }

  // 1. ECHO & HARD-WALL RESCUE (Empty bedrooms, kitchens, offices with slapback reverb & boxy standing waves)
  if (preset === 'de_echo') {
    return delayPrefix + [
      'adeclip',
      'adeclick=w=45:o=75:t=2.5',
      'asubcut=cutoff=95:order=6',
      'highpass=f=105:poles=2',
      'afftdn=nr=15:nf=-44:tn=1',
      'anlmdn=s=3.5:p=0.004:r=0.01',
      'agate=mode=downward:threshold=0.016:range=0.16:ratio=2.8:attack=5:release=115:knee=4:detection=rms',
      `adynamicequalizer=dfrequency=${resHz}:dqfactor=2.4:tfrequency=${resHz}:tqfactor=2.2:attack=8:release=120:ratio=4.5:mode=cut:auto=on`,
      'equalizer=f=225:t=q:w=1.3:g=-4.5',
      `equalizer=f=${resHz}:t=q:w=1.8:g=-4.2`,
      'equalizer=f=585:t=q:w=1.7:g=-3.4',
      'equalizer=f=3600:t=q:w=1.1:g=3.4',
      'deesser=i=0.45:m=0.5:f=0.5',
      'lowpass=f=13800',
      'dynaudnorm=f=240:g=13:p=0.92:m=6:s=18',
      'acompressor=threshold=-20dB:ratio=2.8:attack=10:release=140:makeup=4.5dB:knee=6dB',
      'loudnorm=I=-14.0:TP=-1.0:LRA=8.0',
      'aresample=48000'
    ].join(',');
  }

  // 2. $13 WIRELESS / EARBUD MIC RESCUE (Clipped peaks, collar rustle, thin low-end, harsh 6kHz sibilance & 2.4GHz codec fizz)
  if (preset === 'cheap_mic') {
    return delayPrefix + [
      'adeclip=w=55:o=75:a=8:t=8',
      'adeclick=w=45:o=75:t=2.0',
      'asubcut=cutoff=88:order=6',
      'highpass=f=90:poles=2',
      'afftdn=nr=13:nf=-45:tn=1',
      'agate=mode=downward:threshold=0.010:range=0.22:ratio=2.2:attack=6:release=135:knee=4:detection=rms',
      'equalizer=f=165:t=q:w=1.1:g=2.4',
      'equalizer=f=255:t=q:w=1.4:g=-3.4',
      `adynamicequalizer=dfrequency=${resHz}:dqfactor=2.2:tfrequency=${resHz}:tqfactor=2.0:attack=10:release=140:ratio=3.2:mode=cut:auto=on`,
      'equalizer=f=3300:t=q:w=1.1:g=2.6',
      'equalizer=f=6400:t=q:w=2.0:g=-4.5',
      'deesser=i=0.62:m=0.6:f=0.5',
      'lowpass=f=12600:poles=2',
      'dynaudnorm=f=220:g=13:p=0.92:m=7:s=16',
      'acompressor=threshold=-20dB:ratio=3.0:attack=8:release=150:makeup=4.5dB:knee=6dB',
      'loudnorm=I=-14.0:TP=-1.0:LRA=8.0',
      'aresample=48000'
    ].join(',');
  }

  // 3. LAPTOP / DISTANT MIC RESCUE (2-3ft away from phone/webcam without a lapel mic)
  if (preset === 'far_mic') {
    return delayPrefix + [
      'adeclip',
      'adeclick=w=45:o=75:t=2.5',
      'asubcut=cutoff=98:order=6',
      'highpass=f=108:poles=2',
      'afftdn=nr=16:nf=-42:tn=1',
      'anlmdn=s=4.0:p=0.004:r=0.01',
      'agate=mode=downward:threshold=0.015:range=0.18:ratio=2.6:attack=5:release=120:knee=4:detection=rms',
      `adynamicequalizer=dfrequency=${resHz}:dqfactor=2.4:tfrequency=${resHz}:tqfactor=2.2:attack=8:release=125:ratio=4.0:mode=cut:auto=on`,
      'equalizer=f=240:t=q:w=1.3:g=-4.2',
      `equalizer=f=${resHz}:t=q:w=1.7:g=-3.8`,
      'equalizer=f=590:t=q:w=1.6:g=-3.2',
      'equalizer=f=3500:t=q:w=1.0:g=4.2',
      'deesser=i=0.45:m=0.5:f=0.5',
      'lowpass=f=13500',
      'dynaudnorm=f=220:g=13:p=0.92:m=8:s=16',
      'acompressor=threshold=-21dB:ratio=3.2:attack=8:release=140:makeup=5.5dB:knee=6dB',
      'loudnorm=I=-14.0:TP=-1.0:LRA=8.0',
      'aresample=48000'
    ].join(',');
  }

  if (preset === 'warm') {
    return delayPrefix + [
      'adeclip',
      'adeclick=w=45:o=75:t=2.5',
      'asubcut=cutoff=80:order=6',
      'highpass=f=82:poles=2',
      'afftdn=nr=12:nf=-46:tn=1',
      'agate=mode=downward:threshold=0.008:range=0.25:ratio=2.0:attack=6:release=145:knee=4:detection=rms',
      'equalizer=f=160:t=q:w=1.1:g=1.8',
      'equalizer=f=240:t=q:w=1.3:g=-2.8',
      `equalizer=f=${resHz}:t=q:w=1.6:g=-2.8`,
      'equalizer=f=3400:t=q:w=1.2:g=2.4',
      'equalizer=f=6500:t=q:w=2.2:g=-3.0',
      'deesser=i=0.40:m=0.45:f=0.5',
      'treble=f=9500:g=2.0',
      'lowpass=f=14200',
      'dynaudnorm=f=220:g=13:p=0.92:m=7:s=16',
      'acompressor=threshold=-20dB:ratio=2.8:attack=12:release=160:makeup=4.5dB:knee=6dB',
      'loudnorm=I=-14.0:TP=-1.0:LRA=8.5',
      'aresample=48000'
    ].join(',');
  }
  if (preset === 'crisp') {
    return delayPrefix + [
      'adeclip',
      'adeclick=w=45:o=75:t=2.5',
      'asubcut=cutoff=92:order=6',
      'highpass=f=98:poles=2',
      'afftdn=nr=13:nf=-45:tn=1',
      'agate=mode=downward:threshold=0.009:range=0.22:ratio=2.2:attack=6:release=135:knee=4:detection=rms',
      'equalizer=f=230:t=q:w=1.2:g=-3.8',
      `equalizer=f=${resHz}:t=q:w=1.6:g=-3.4`,
      'equalizer=f=3800:t=q:w=1.1:g=3.8',
      'equalizer=f=6600:t=q:w=2.2:g=-3.2',
      'deesser=i=0.48:m=0.5:f=0.5',
      'treble=f=9200:g=3.2',
      'lowpass=f=14000',
      'dynaudnorm=f=220:g=13:p=0.92:m=7:s=16',
      'acompressor=threshold=-19dB:ratio=3.0:attack=8:release=140:makeup=5dB:knee=6dB',
      'loudnorm=I=-14.0:TP=-1.0:LRA=8.5',
      'aresample=48000'
    ].join(',');
  }
  if (preset === 'studio') {
    return delayPrefix + [
      'adeclip',
      'adeclick=w=45:o=75:t=2.5',
      'asubcut=cutoff=86:order=6',
      'highpass=f=90:poles=2',
      'afftdn=nr=12:nf=-46:tn=1',
      'agate=mode=downward:threshold=0.008:range=0.24:ratio=2.1:attack=6:release=140:knee=4:detection=rms',
      `adynamicequalizer=dfrequency=${resHz}:dqfactor=2.2:tfrequency=${resHz}:tqfactor=2.0:attack=10:release=140:ratio=3.0:mode=cut:auto=on`,
      'equalizer=f=230:t=q:w=1.2:g=-3.2',
      `equalizer=f=${resHz}:t=q:w=1.6:g=-3.0`,
      'equalizer=f=3600:t=q:w=1.1:g=3.0',
      'equalizer=f=6600:t=q:w=2.0:g=-2.8',
      'deesser=i=0.42:m=0.45:f=0.5',
      'treble=f=9500:g=2.6',
      'lowpass=f=14000',
      'dynaudnorm=f=220:g=13:p=0.92:m=7:s=16',
      'acompressor=threshold=-20dB:ratio=2.8:attack=10:release=150:makeup=4.5dB:knee=6dB',
      'loudnorm=I=-14.0:TP=-1.0:LRA=8.5',
      'aresample=48000'
    ].join(',');
  }

  // 'auto' — Full Broadcast Master (-14.0 LUFS, -1.0 dBTP True Peak, Adaptive De-Reverb Gate + Standing-Wave Notch + De-Clip/De-Ess)
  const hp = Math.round(clampNum(p.hpFreq, 80, 120, 92));
  const subCut = Math.max(75, hp - 6);
  const nr = Number(clampNum(p.nrAmountDb, 10, 17, 12.5).toFixed(1));
  const nf = Math.round(clampNum(p.noiseFloorDb, -65, -36, -48));
  const mud = Number(clampNum(p.mudCutDb, -6.0, -2.0, -3.6).toFixed(1));
  const box = Number(clampNum(p.boxCutDb, -5.8, -2.0, -3.4).toFixed(1));
  const honk = Number(clampNum(p.honkCutDb, -4.5, -1.5, -2.4).toFixed(1));
  const pres = Number(clampNum(p.presenceBoostDb, 2.0, 4.8, 3.4).toFixed(1));
  const deEss = Number(clampNum(p.deEssCutDb, -5.5, -2.0, -3.2).toFixed(1));
  const air = Number(clampNum(p.airBoostDb, 1.5, 4.2, 2.8).toFixed(1));
  const gateThresh = Number(clampNum(p.gateThresholdLinear, 0.004, 0.025, 0.009).toFixed(4));
  const gateRange = Number(clampNum(p.gateRangeLinear, 0.14, 0.35, 0.22).toFixed(2));
  const gateRatio = Number(clampNum(p.gateRatio, 1.8, 3.2, 2.2).toFixed(1));
  const dynRatio = Number(clampNum((Number(p.echoTailRatio) || 0.22) > 0.28 ? 4.2 : 3.2, 2.5, 5.0, 3.2).toFixed(1));

  return delayPrefix + [
    'adeclip',
    'adeclick=w=45:o=75:t=2.5',
    `asubcut=cutoff=${subCut}:order=6`,
    `highpass=f=${hp}:poles=2`,
    `afftdn=nr=${nr}:nf=${nf}:tn=1`,
    `agate=mode=downward:threshold=${gateThresh}:range=${gateRange}:ratio=${gateRatio}:attack=6:release=130:knee=4:detection=rms`,
    `adynamicequalizer=dfrequency=${resHz}:dqfactor=2.4:tfrequency=${resHz}:tqfactor=2.1:attack=8:release=130:ratio=${dynRatio}:mode=cut:auto=on`,
    `equalizer=f=225:t=q:w=1.2:g=${mud}`,
    `equalizer=f=${resHz}:t=q:w=1.7:g=${box}`,
    `equalizer=f=585:t=q:w=1.6:g=${honk}`,
    `equalizer=f=3600:t=q:w=1.1:g=${pres}`,
    `equalizer=f=6600:t=q:w=2.2:g=${deEss}`,
    'deesser=i=0.45:m=0.5:f=0.5',
    `treble=f=9500:g=${air}`,
    'lowpass=f=13800',
    'dynaudnorm=f=220:g=13:p=0.92:m=7:s=16',
    'acompressor=threshold=-20dB:ratio=2.8:attack=10:release=150:makeup=4.5dB:knee=6dB',
    'loudnorm=I=-14.0:TP=-1.0:LRA=8.5',
    'aresample=48000'
  ].join(',');
}

function analyzeAudioTelemetry(filePath, cb) {
  execFile(
    ffmpegBin,
    ['-hide_banner', '-i', filePath, '-vn', '-af', 'astats=metadata=0:reset=0,ebur128=peak=true', '-f', 'null', '-'],
    { cwd: scratchDir, timeout: 30000 },
    (err, stdout, stderr) => {
      const log = (stdout || '') + '\n' + (stderr || '');
      const iMatches = [...log.matchAll(/I:\s*(-?[0-9.]+)\s*LUFS/g)];
      const lraMatches = [...log.matchAll(/LRA:\s*([0-9.]+)\s*LU/g)];
      const tpMatches = [...log.matchAll(/Peak:\s*(-?[0-9.]+)\s*dBFS/g)];
      const rmsMatches = [...log.matchAll(/RMS level dB:\s*(-?[0-9.]+)/g)];
      const peakMatches = [...log.matchAll(/Peak level dB:\s*(-?[0-9.]+)/g)];
      const nfMatches = [...log.matchAll(/Noise floor dB:\s*(-?[0-9.]+)/g)];

      const measuredLufs = iMatches.length > 0 ? parseFloat(iMatches[iMatches.length - 1][1]) : -18.5;
      const lra = lraMatches.length > 0 ? parseFloat(lraMatches[lraMatches.length - 1][1]) : 5.2;
      const speechRmsDb = rmsMatches.length > 0 ? parseFloat(rmsMatches[rmsMatches.length - 1][1]) : -20.5;
      const speechPeakDb = peakMatches.length > 0
        ? parseFloat(peakMatches[peakMatches.length - 1][1])
        : (tpMatches.length > 0 ? parseFloat(tpMatches[tpMatches.length - 1][1]) : -2.0);
      const rawNf = nfMatches.length > 0 ? parseFloat(nfMatches[nfMatches.length - 1][1]) : -52.0;
      const noiseFloorDb = Number.isFinite(rawNf) && rawNf > -72 && rawNf < -25 ? rawNf : -52.0;

      cb(null, {
        measuredLufs: Number.isFinite(measuredLufs) ? Number(measuredLufs.toFixed(1)) : -18.5,
        lra: Number.isFinite(lra) ? Number(lra.toFixed(1)) : 5.2,
        speechRmsDb: Number.isFinite(speechRmsDb) ? Number(speechRmsDb.toFixed(1)) : -20.5,
        speechPeakDb: Number.isFinite(speechPeakDb) ? Number(speechPeakDb.toFixed(1)) : -2.0,
        noiseFloorDb: Number(noiseFloorDb.toFixed(1))
      });
    }
  );
}

function buildCalibratedProfileFromTelemetry(ffStats, clientHint = {}) {
  const noiseFloorDb = clampNum(
    clientHint.noiseFloorDb !== undefined ? (Number(clientHint.noiseFloorDb) * 0.5 + ffStats.noiseFloorDb * 0.5) : ffStats.noiseFloorDb,
    -68,
    -28,
    -52.0
  );
  const speechRmsDb = clampNum(ffStats.speechRmsDb, -36, -8, -20.2);
  const speechPeakDb = clampNum(ffStats.speechPeakDb, -24, 0, -1.6);
  const measuredLufs = clampNum(ffStats.measuredLufs, -34, -8, -16.5);

  // Room resonance & echo decay metrics from 5s Sound Check
  const roomResonanceHz = Math.round(clampNum(clientHint.roomResonanceHz, 175, 720, 390));
  const echoTailRatio = Number(clampNum(clientHint.echoTailRatio, 0.08, 0.65, 0.22).toFixed(2));
  const clippingDetected = Boolean(clientHint.clippingDetected || speechPeakDb > -0.6);

  // Adaptive Noise Reduction (10 dB in quiet room, up to 16 dB in noisy HVAC room)
  const nrAmountDb = Number(clampNum(noiseFloorDb > -42 ? 15.5 : noiseFloorDb > -48 ? 13.5 : 11.5, 10, 17, 12).toFixed(1));
  const hpFreq = Math.round(clampNum(clientHint.hpFreq || (noiseFloorDb > -44 ? 105 : 95), 85, 115, 95));

  // Spectral balance from client FFT ratios + broadcast target curve
  const mudCutDb = Number(clampNum(clientHint.mudCutDb, -5.8, -2.5, -3.8).toFixed(1));
  const boxCutDb = Number(clampNum(clientHint.boxCutDb, -5.8, -2.5, -3.6).toFixed(1));
  const honkCutDb = echoTailRatio > 0.28 ? -3.4 : -2.4;
  const presenceBoostDb = Number(clampNum(clientHint.presenceBoostDb, 2.4, 4.6, 3.4).toFixed(1));
  const deEssCutDb = Number(clampNum(clientHint.deEssCutDb, -5.5, -2.5, -3.2).toFixed(1));
  const airBoostDb = Number(clampNum(clientHint.airBoostDb, 2.2, 4.2, 3.2).toFixed(1));

  // Dynamic range, downward de-reverb expansion & makeup gain toward -14.0 LUFS
  const lufsDelta = clampNum(-14.0 - measuredLufs, 0, 9.0, 2.5);
  const makeupGainDb = Number(clampNum(lufsDelta + 1.0, 1.5, 8.0, 3.0).toFixed(1));
  const compThresholdDb = Math.round(clampNum(speechRmsDb - 1.5, -25, -18, -21));
  const compRatio = Number(clampNum(ffStats.lra > 7 ? 3.0 : 2.6, 2.2, 3.4, 2.8).toFixed(1));

  const baseGateLinear = Math.pow(10, (noiseFloorDb + (echoTailRatio > 0.28 ? 12 : 9)) / 20);
  const gateThresholdLinear = Number(clampNum(baseGateLinear, 0.005, 0.018, 0.008).toFixed(4));
  const gateRangeLinear = echoTailRatio > 0.28 ? 0.16 : 0.24;
  const gateRatio = echoTailRatio > 0.28 ? 2.6 : 2.1;

  // Actionable Acoustic Diagnosis & Physical Mic Tip
  let acousticDiagnosis = `Balanced Room • ${roomResonanceHz}Hz Notch + De-Reverb Active`;
  let acousticTip = 'Keep mic 6–8 in from mouth at a 45° angle to minimize plosives.';
  if (clippingDetected && echoTailRatio > 0.28) {
    acousticDiagnosis = `Hot Mic + Room Echo (${roomResonanceHz}Hz Ring) • De-Clip & De-Reverb Active`;
    acousticTip = 'Lower mic input gain slightly and step 1–2 ft away from bare walls.';
  } else if (clippingDetected) {
    acousticDiagnosis = 'Hot / Clipping Mic Detected • Auto De-Clip & Limiter Active';
    acousticTip = 'Angle lav/mic slightly below chin or reduce input gain by 15%.';
  } else if (echoTailRatio > 0.28) {
    acousticDiagnosis = `Echoey Room (${roomResonanceHz}Hz Ring) • Downward De-Reverb Active`;
    acousticTip = 'Move mic closer to collar (6 in) or face away from hard bare walls.';
  } else if (noiseFloorDb > -44) {
    acousticDiagnosis = `High Room Noise (${noiseFloorDb.toFixed(0)}dB) • Spectral NR + Gate Active`;
    acousticTip = 'Keep mic close to voice so speech stays 20dB above background fan/AC.';
  } else if (speechRmsDb < -26) {
    acousticDiagnosis = `Distant / Quiet Mic (${speechRmsDb.toFixed(0)}dB) • Dialogue Boost Active`;
    acousticTip = 'Bring mic within 6–10 in of mouth for richer vocal warmth.';
  }

  return {
    calibrated: true,
    source: clientHint.source || '5s Live Voice & Room Sound Check',
    noiseFloorDb: Number(noiseFloorDb.toFixed(1)),
    speechRmsDb: Number(speechRmsDb.toFixed(1)),
    speechPeakDb: Number(speechPeakDb.toFixed(1)),
    measuredLufs: Number(measuredLufs.toFixed(1)),
    targetLufs: -14.0,
    postLufs: -14.0,
    postPeakDb: -1.0,
    hpFreq,
    nrAmountDb,
    mudCutDb,
    boxCutDb,
    honkCutDb,
    roomResonanceHz,
    echoTailRatio,
    presenceBoostDb,
    deEssCutDb,
    airBoostDb,
    gateThresholdLinear,
    gateRangeLinear,
    gateRatio,
    compThresholdDb,
    compRatio,
    makeupGainDb,
    acousticDiagnosis,
    acousticTip,
    summary: `NR -${nrAmountDb}dB • De-Echo Gate • ${roomResonanceHz}Hz Notch • Pres +${presenceBoostDb}dB • -14.0 LUFS`
  };
}

function analyzeSilenceAndDuration(filePath, cb, coldOpenTrim = true) {
  execFile(
    ffmpegBin,
    ['-i', filePath, '-af', 'dynaudnorm=f=150:g=11:m=20,silencedetect=noise=-36dB:d=0.45', '-f', 'null', '-'],
    { cwd: scratchDir, timeout: 30000 },
    (err, stdout, stderr) => {
      const log = (stdout || '') + '\n' + (stderr || '');
      let duration = 0;
      const durMatch = log.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (durMatch) {
        duration = Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3]);
      } else {
        const timeMatches = [...log.matchAll(/time=(\d+):(\d+):(\d+\.\d+)/g)];
        if (timeMatches.length > 0) {
          const last = timeMatches[timeMatches.length - 1];
          duration = Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]);
        }
      }
      if (!duration || duration <= 0) duration = 6.5;

      const silences = [];
      let curStart = null;
      for (const line of log.split('\n')) {
        const ms = line.match(/silence_start:\s*([0-9.]+)/);
        if (ms) curStart = parseFloat(ms[1]);
        const me = line.match(/silence_end:\s*([0-9.]+)/);
        if (me && curStart !== null) {
          silences.push({ start: curStart, end: parseFloat(me[1]) });
          curStart = null;
        }
      }
      if (curStart !== null && curStart < duration) {
        silences.push({ start: curStart, end: duration });
      }

      const speechSegments = [];
      let cursor = 0;
      for (const sil of silences) {
        if (sil.start > cursor + 0.08) {
          speechSegments.push({ start: cursor, end: sil.start });
        }
        cursor = sil.end;
      }
      if (cursor < duration - 0.08) {
        speechSegments.push({ start: cursor, end: duration });
      }

      if (speechSegments.length === 0) {
        return cb(null, { duration, keepSegments: [{ start: 0, end: duration }] });
      }

      const merged = [];
      for (const seg of speechSegments) {
        const isFirstSeg = merged.length === 0;
      const leadPad = (isFirstSeg && coldOpenTrim) ? 0.04 : 0.12;
      const paddedStart = Math.max(0, seg.start - leadPad);
        const paddedEnd = Math.min(duration, seg.end + 0.35);
        if (merged.length === 0) {
          merged.push({ start: paddedStart, end: paddedEnd });
        } else {
          const prev = merged[merged.length - 1];
          if (paddedStart - prev.end < 0.40) {
            prev.end = Math.max(prev.end, paddedEnd);
          } else {
            merged.push({ start: paddedStart, end: paddedEnd });
          }
        }
      }

      // Always preserve the full natural release at the end of the video so the final word is never clipped
      if (merged.length > 0) {
        const lastSeg = merged[merged.length - 1];
        if (duration - lastSeg.end <= 1.6) {
          lastSeg.end = duration;
        } else {
          lastSeg.end = Math.min(duration, lastSeg.end + 0.85);
        }
      }

      cb(null, { duration, keepSegments: merged });
    }
  );
}

function getActiveCustomEpisode() {
  const baseEp = EPISODES.find((e) => e.id === currentEpisodeId) || EPISODES[0];
  return {
    ...baseEp,
    lines: SCRIPT_LINES
  };
}

function fmtAssTime(sec) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = (s % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${rem}`;
}

function wrapHookBannerLines(text, maxCharsPerLine = 28) {
  const clean = String(text || '').trim().replace(/\s+/g, ' ');
  if (!clean) return [];
  if (clean.length <= maxCharsPerLine) return [clean];
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

function measureHookTextWidth(str, fontSize = 44) {
  let units = 0;
  for (const ch of String(str || '')) {
    if ('ilI1|.,:;!\' '.includes(ch)) units += 0.25;
    else if ('mwMW@%&'.includes(ch)) units += 0.72;
    else if (ch >= 'A' && ch <= 'Z') units += 0.56;
    else units += 0.46;
  }
  return Math.round(units * fontSize * 0.76);
}

function toTitleCaseHook(str) {
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'vs', 'vs.']);
  const words = String(str || '').trim().replace(/\s+/g, ' ').split(' ');
  return words
    .map((w, i) => {
      if (/^[0-9.]+x$/i.test(w)) return w.toLowerCase();
      if (/^[A-Z0-9$%+&-]{2,}$/.test(w)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && i < words.length - 1 && smallWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function analyzeVideoContentForHook(linesArr) {
  const fullText = (linesArr || [])
    .map((l) => String(l.text || l || '').trim())
    .filter(Boolean)
    .join(' ');
  if (!fullText) {
    return {
      primaryHook: '',
      suggestions: []
    };
  }

  // Extract concise hook options directly from the user's spoken sentences (skipping opening greetings)
  const greetingRegex = /^(hey\s+guys|hi\s+guys|hello\s+everyone|what'?s\s+up\s+guys|welcome\s+back|my\s+name\s+is|on\s+the\s+first\s+episode|i\s+want\s+to\s+start\s+off)/i;
  const sentences = fullText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && !greetingRegex.test(s));

  const candidateSentences = sentences.length > 0 ? sentences : [fullText];
  const hooks = [];

  for (const s of candidateSentences) {
    let cleaned = s
      .replace(/^(the\s+first\s+thing\s+we\s+can\s+talk\s+about\s+is|today\s+we'?re\s+talking\s+about|i\s+want\s+to\s+talk\s+about|let'?s\s+talk\s+about|the\s+best\s+practice\s+is\s+to|you\s+don'?t\s+want\s+to)\s+/i, '')
      .replace(/[,:;—–-].*$/, '')
      .replace(/[.!?]+$/, '')
      .trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const shortPhrase = toTitleCaseHook(words.slice(0, 5).join(' '));
      if (shortPhrase.length >= 4 && shortPhrase.length <= 28 && !hooks.includes(shortPhrase)) {
        hooks.push(shortPhrase);
      }
    }
    if (hooks.length >= 3) break;
  }

  if (hooks.length === 0) {
    const rawWords = fullText.replace(/[.!?]+/g, '').split(/\s+/).filter(Boolean);
    if (rawWords.length > 0) {
      hooks.push(toTitleCaseHook(rawWords.slice(0, 5).join(' ')).slice(0, 28));
    }
  }

  return {
    primaryHook: hooks[0] || '',
    suggestions: hooks.slice(0, 3)
  };
}


const VIEWER_FONT_THEMES = {
  classic_poppins: {
    id: 'classic_poppins',
    label: '1. TikTok Classic (Poppins ExtraBold)',
    assFont: 'Poppins',
    hookFont: 'Poppins',
    fontSize: 52,
    hookFontSize: 44,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.4,
    uppercase: false,
    borderStyle: 1,
    outline: 3.8,
    shadow: 0,
    glowColor: '&H99000000',
    glowOutline: 24,
    outlineColor: '&H55000000',
    backColor: '&H00000000',
    hookBgAss: '&HFFFFFF&',
    hookTextAss: '&H00111111',
    hookAccentLeft: '&HEEF425&',
    hookAccentRight: '&H552CFE&',
    italicKeywords: false,
    terminalCursor: false
  },
  tiktok_native: {
    id: 'tiktok_native',
    label: '2. TikTok Native Pill (TikTok Sans)',
    assFont: 'TikTok Sans Display',
    hookFont: 'TikTok Sans Display',
    fontSize: 52,
    hookFontSize: 44,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.2,
    uppercase: false,
    borderStyle: 3,
    outline: 14,
    shadow: 0,
    glowColor: '&HAA0B0F19',
    glowOutline: 16,
    outlineColor: '&HB80B0F19',
    backColor: '&HB80B0F19',
    hookBgAss: '&H18120E&',
    hookTextAss: '&H00FFFFFF',
    hookAccentLeft: '&HEEF425&',
    hookAccentRight: '&H552CFE&',
    italicKeywords: false,
    terminalCursor: false
  },
  hormozi_impact: {
    id: 'hormozi_impact',
    label: '3. Hormozi Impact (ALL-CAPS Heavy)',
    assFont: 'Impact',
    hookFont: 'Impact',
    fontSize: 60,
    hookFontSize: 48,
    scaleX: 100,
    scaleY: 105,
    spacing: 0.8,
    uppercase: true,
    borderStyle: 1,
    outline: 5.5,
    shadow: 4.0,
    glowColor: '&HCC000000',
    glowOutline: 26,
    outlineColor: '&H00000000',
    backColor: '&HCC000000',
    hookBgAss: '&H00E6FF&',
    hookTextAss: '&H000B0B0B',
    hookAccentLeft: '&H000000&',
    hookAccentRight: '&H552CFE&',
    italicKeywords: false,
    terminalCursor: false
  },
  highlighter_tape: {
    id: 'highlighter_tape',
    label: '4. Highlighter Marker Tape (Vox Style)',
    assFont: 'Arial Black',
    hookFont: 'Arial Black',
    fontSize: 48,
    hookFontSize: 40,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.3,
    uppercase: false,
    borderStyle: 1,
    outline: 4.2,
    shadow: 2.0,
    glowColor: '&HB0000000',
    glowOutline: 20,
    outlineColor: '&H00000000',
    backColor: '&H99000000',
    hookBgAss: '&H00E6FF&',
    hookTextAss: '&H00111111',
    hookAccentLeft: '&HEEF425&',
    hookAccentRight: '&H111111&',
    italicKeywords: false,
    terminalCursor: false,
    highlighterBox: true
  },
  neon_glow: {
    id: 'neon_glow',
    label: '5. Neon Studio Glow (Cyber Bloom)',
    assFont: 'Poppins Black',
    hookFont: 'Poppins Black',
    fontSize: 52,
    hookFontSize: 44,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.6,
    uppercase: false,
    borderStyle: 1,
    outline: 2.4,
    shadow: 0,
    glowColor: '&H77EEF425',
    glowOutline: 26,
    outlineColor: '&H44221105',
    backColor: '&H00000000',
    hookBgAss: '&H24140B&',
    hookTextAss: '&H00EEF425',
    hookAccentLeft: '&HEEF425&',
    hookAccentRight: '&H552CFE&',
    italicKeywords: false,
    terminalCursor: false
  },
  tall_hype: {
    id: 'tall_hype',
    label: '6. Tall Condensed Hype (130% Vertical Poster)',
    assFont: 'Bahnschrift',
    hookFont: 'Impact',
    fontSize: 58,
    hookFontSize: 48,
    scaleX: 86,
    scaleY: 126,
    spacing: 1.0,
    uppercase: true,
    borderStyle: 1,
    outline: 4.8,
    shadow: 3.5,
    glowColor: '&HAA000000',
    glowOutline: 24,
    outlineColor: '&H00000000',
    backColor: '&HCC000000',
    hookBgAss: '&H552CFE&',
    hookTextAss: '&H00FFFFFF',
    hookAccentLeft: '&H00E6FF&',
    hookAccentRight: '&H000000&',
    italicKeywords: true,
    terminalCursor: false
  },
  keynote_luxury: {
    id: 'keynote_luxury',
    label: '7. Keynote Luxury Tech (Soft Shadow Flagship)',
    assFont: 'TikTok Sans Display',
    hookFont: 'TikTok Sans Display',
    fontSize: 54,
    hookFontSize: 44,
    scaleX: 98,
    scaleY: 100,
    spacing: -0.6,
    uppercase: false,
    borderStyle: 1,
    outline: 1.2,
    shadow: 4.5,
    glowColor: '&H88000000',
    glowOutline: 28,
    outlineColor: '&H33000000',
    backColor: '&HAA000000',
    hookBgAss: '&H1A1512&',
    hookTextAss: '&H00FFFFFF',
    hookAccentLeft: '&HEEF425&',
    hookAccentRight: '&H81B910&',
    italicKeywords: false,
    terminalCursor: false
  },
  founder_editorial: {
    id: 'founder_editorial',
    label: '8. Founder Editorial (Luxury Serif)',
    assFont: 'Georgia',
    hookFont: 'Georgia',
    fontSize: 52,
    hookFontSize: 44,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.3,
    uppercase: false,
    borderStyle: 1,
    outline: 3.4,
    shadow: 2.0,
    glowColor: '&H99000000',
    glowOutline: 22,
    outlineColor: '&H33000000',
    backColor: '&H88000000',
    hookBgAss: '&HF2F7FA&',
    hookTextAss: '&H00141414',
    hookAccentLeft: '&H81B910&',
    hookAccentRight: '&H332211&',
    italicKeywords: true,
    terminalCursor: false
  },
  pop_art_3d: {
    id: 'pop_art_3d',
    label: '9. 3D Pop-Art Extrude (MrBeast Block Shadow)',
    assFont: 'DynaPuff',
    hookFont: 'DynaPuff',
    fontSize: 54,
    hookFontSize: 44,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.5,
    uppercase: false,
    borderStyle: 1,
    outline: 5.2,
    shadow: 6.0,
    glowColor: '&HCC000000',
    glowOutline: 26,
    outlineColor: '&H00000000',
    backColor: '&HFF000000',
    hookBgAss: '&H00E6FF&',
    hookTextAss: '&H00111111',
    hookAccentLeft: '&H552CFE&',
    hookAccentRight: '&HEEF425&',
    italicKeywords: false,
    terminalCursor: false
  },
  terminal_tape: {
    id: 'terminal_tape',
    label: '10. Live Terminal Tape (Tech Mono HUD)',
    assFont: 'Consolas',
    hookFont: 'Consolas',
    fontSize: 46,
    hookFontSize: 40,
    scaleX: 100,
    scaleY: 100,
    spacing: 0.4,
    uppercase: false,
    borderStyle: 3,
    outline: 14,
    shadow: 0,
    glowColor: '&HCC080B12',
    glowOutline: 16,
    outlineColor: '&HD8080B12',
    backColor: '&HD8080B12',
    hookBgAss: '&H1E160C&',
    hookTextAss: '&H00EEF425',
    hookAccentLeft: '&HEEF425&',
    hookAccentRight: '&H81B910&',
    italicKeywords: false,
    terminalCursor: true
  }
};

function getFontThemeSpec(themeId, overrides = {}) {
  const base = { ...(VIEWER_FONT_THEMES[themeId] || VIEWER_FONT_THEMES.classic_poppins) };
  if (overrides.fontCase === 'uppercase') base.uppercase = true;
  else if (overrides.fontCase === 'mixed') base.uppercase = false;

  if (overrides.fontBacking === 'pill') {
    base.borderStyle = 3;
    base.outline = 14;
    base.shadow = 0;
    base.outlineColor = '&HB80B0F19';
    base.backColor = '&HB80B0F19';
  } else if (overrides.fontBacking === 'outline_glow') {
    base.borderStyle = 1;
    base.outline = Math.max(3.5, base.outline);
  } else if (overrides.fontBacking === 'shadow_only') {
    base.borderStyle = 1;
    base.outline = 1.2;
    base.shadow = 4.5;
  }

  const scaleMult = clampNum(Number(overrides.fontScale) || 100, 80, 130, 100) / 100;
  base.fontSize = Math.round(base.fontSize * scaleMult);
  base.hookFontSize = Math.round(base.hookFontSize * scaleMult);
  return base;
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

function buildHookBannerAssEvents(hookBannerText, hookX = 540, hookY = 335, fontTheme = 'classic_poppins', overrides = {}) {
  const spec = getFontThemeSpec(fontTheme, overrides);
  let cleanHook = String(hookBannerText || '').trim();
  if (!cleanHook) return [];
  if (spec.uppercase) cleanHook = cleanHook.toUpperCase();
  const lines = wrapHookBannerLines(cleanHook, 28);
  const fontSize = spec.hookFontSize || 44;
  const maxLineW = Math.max(...lines.map((l) => measureHookTextWidth(l, fontSize)));
  const boxW = Math.min(680, Math.max(240, maxLineW + 52));
  const boxH = lines.length > 1 ? 124 : 76;
  const rectPath = makeRoundedRectAssPath(boxW, boxH, 12);
  const halfW = Math.round(boxW / 2) + 16;
  const halfH = Math.round(boxH / 2) + 16;
  const cx = Math.max(halfW, Math.min(1080 - halfW, Math.round(Number(hookX) || 540)));
  const cy = Math.max(halfH, Math.min(1920 - halfH, Math.round(Number(hookY) || 335)));
  const assText = lines.join('\\N');
  return [
    `Dialogue: 2,0:00:00.00,0:00:03.40,HookShape,,0,0,0,,{\\an7\\pos(${cx - 9},${cy - 9})\\1c${spec.hookAccentLeft}\\p1}${rectPath}{\\p0}`,
    `Dialogue: 3,0:00:00.00,0:00:03.40,HookShape,,0,0,0,,{\\an7\\pos(${cx + 9},${cy + 9})\\1c${spec.hookAccentRight}\\p1}${rectPath}{\\p0}`,
    `Dialogue: 4,0:00:00.00,0:00:03.40,HookShape,,0,0,0,,{\\an7\\pos(${cx},${cy})\\1c${spec.hookBgAss}\\p1}${rectPath}{\\p0}`,
    `Dialogue: 5,0:00:00.00,0:00:03.40,HookText,,0,0,0,,{\\an5\\pos(${cx},${cy})}${assText}`
  ];
}


function colorizeViralCaptionAss(text, enableColor = true, fontTheme = 'classic_poppins', overrides = {}) {
  const spec = getFontThemeSpec(fontTheme, overrides);
  let raw = String(text || '');
  if (spec.uppercase) raw = raw.toUpperCase();
  const suffix = spec.terminalCursor ? ' {\\1c&HEEF425&}█{\\1c&HFFFFFF&}' : '';
  if (!enableColor) return raw + suffix;
  const itOn = spec.italicKeywords ? '\\i1' : '';
  const itOff = spec.italicKeywords ? '\\i0' : '';
  const fixColorAss = fontTheme === 'hormozi_impact' ? '&H66FF00&' : '&H00E6FF&';
  const hiOn = spec.highlighterBox ? '\\3c&H00E6FF&\\bord8\\1c&H111111&' : `\\1c${fixColorAss}`;
  const hiReset = spec.highlighterBox ? `\\3c${spec.outlineColor}\\bord${spec.outline}\\1c&HFFFFFF&` : '\\1c&HFFFFFF&';
  return (
    raw
      .replace(/(\b(?:\$?\d+[0-9.,]*(?:%|x|°|\+)?|45-degree|2 to 3 feet|1\.3x|1\.5x|2x|1080p)\b)/gi, `{\\1c&HEEF425&${itOn}}$1{\\1c&HFFFFFF&${itOff}}`)
      .replace(/(\b(?:without|distorted|distortion|glare|milky|muffle\w*|echo\w*|flatten\w*|never|don\'t|kills|throttle\w*|unnecessary)\b)/gi, `{\\1c&H552CFE&${itOn}}$1{\\1c&HFFFFFF&${itOff}}`)
      .replace(/(\b(?:Bluetooth|microphone|wireless|microfiber|best practice|proportional|chip bag|TikTok Shop|studio|good sound)\b)/gi, `{${hiOn}${itOn}}$1{${hiReset}${itOff}}`) +
    suffix
  );
}

function buildAbBadgeAssEvents(abBadgeMode, phrasesOrWindows = [], totalDuration = 60) {
  if (!abBadgeMode || abBadgeMode === 'off') return [];
  const pillW = 360;
  const pillH = 58;
  const rectPath = makeRoundedRectAssPath(pillW, pillH, 14);
  const cx = 540;
  const cy = 215;

  if (abBadgeMode === 'before_only') {
    const tEnd = fmtAssTime(Math.max(5, totalDuration));
    return [
      `Dialogue: 3,0:00:00.00,${tEnd},HookShape,,0,0,0,,{\\an7\\pos(${cx},${cy})\\1c&H381E99&\\3c&H552CFE&\\bord3\\p1}${rectPath}{\\p0}`,
      `Dialogue: 4,0:00:00.00,${tEnd},AbBadgeText,,0,0,0,,{\\an5\\pos(${cx},${cy})\\1c&HFFFFFF&}BEFORE: RAW SETUP`
    ];
  }
  if (abBadgeMode === 'after_only') {
    const tEnd = fmtAssTime(Math.max(5, totalDuration));
    return [
      `Dialogue: 3,0:00:00.00,${tEnd},HookShape,,0,0,0,,{\\an7\\pos(${cx},${cy})\\1c&H3B4E06&\\3c&H81B910&\\bord3\\p1}${rectPath}{\\p0}`,
      `Dialogue: 4,0:00:00.00,${tEnd},AbBadgeText,,0,0,0,,{\\an5\\pos(${cx},${cy})\\1c&HFFFFFF&}AFTER: STUDIO UPGRADE`
    ];
  }
  if (abBadgeMode === 'auto_split') {
    // Detect switch timestamp from phrases ("with a mic", "with adjusted 45-degree", "now we're back") or default to 4.5s
    let splitTime = 4.5;
    if (Array.isArray(phrasesOrWindows)) {
      for (const item of phrasesOrWindows) {
        const txt = String(item.text || '').toLowerCase();
        if (txt.includes('with a mic') || txt.includes('with adjusted 45') || txt.includes("now we're back") || txt.includes('a little bit better')) {
          splitTime = Math.max(1.5, Number(item.start) || 4.5);
          break;
        }
      }
    }
    const tSplit = fmtAssTime(splitTime);
    const tEnd = fmtAssTime(Math.max(splitTime + 4, totalDuration));
    return [
      `Dialogue: 3,0:00:00.00,${tSplit},HookShape,,0,0,0,,{\\an7\\pos(${cx},${cy})\\1c&H28157A&\\3c&H552CFE&\\bord3\\p1}${rectPath}{\\p0}`,
      `Dialogue: 4,0:00:00.00,${tSplit},AbBadgeText,,0,0,0,,{\\an5\\pos(${cx},${cy})\\1c&HFFFFFF&}BEFORE: RAW SETUP`,
      `Dialogue: 3,${tSplit},${tEnd},HookShape,,0,0,0,,{\\an7\\pos(${cx},${cy})\\1c&H3B4E06&\\3c&H81B910&\\bord3\\p1}${rectPath}{\\p0}`,
      `Dialogue: 4,${tSplit},${tEnd},AbBadgeText,,0,0,0,,{\\an5\\pos(${cx},${cy})\\1c&HFFFFFF&}AFTER: STUDIO FIX`
    ];
  }
  return [];
}

function writeAssSubtitles(lineWindows, outAssPath, hookBannerText = '', exactPhrases = null, hookX = 540, hookY = 335, sourceLines = SCRIPT_LINES, assOpts = {}) {
  const enableColor = assOpts.colorCaptions !== false;
  const abBadgeMode = assOpts.abBadgeMode || 'off';
  const fontTheme = assOpts.fontTheme || studioState.fontTheme || 'classic_poppins';
  const overrides = {
    fontCase: assOpts.fontCase || studioState.fontCase || 'default',
    fontBacking: assOpts.fontBacking || studioState.fontBacking || 'default',
    fontScale: assOpts.fontScale || studioState.fontScale || 100
  };
  const spec = getFontThemeSpec(fontTheme, overrides);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: GlowBg,${spec.assFont},${spec.fontSize},${spec.glowColor},${spec.glowColor},${spec.glowColor},&H00000000,-1,0,0,0,${spec.scaleX},${spec.scaleY},${spec.spacing},0,1,${spec.glowOutline},0,2,140,180,420,1
Style: Caption,${spec.assFont},${spec.fontSize},&H00FFFFFF,&H0000FFFF,${spec.outlineColor},${spec.backColor},-1,0,0,0,${spec.scaleX},${spec.scaleY},${spec.spacing},0,${spec.borderStyle},${spec.outline},${spec.shadow},2,140,180,420,1
Style: HookShape,${spec.hookFont},${spec.hookFontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: HookText,${spec.hookFont},${spec.hookFontSize},${spec.hookTextAss},${spec.hookTextAss},&H00FFFFFF,&H00000000,-1,0,0,0,${spec.scaleX},${spec.scaleY},0.2,0,1,0,0,5,60,60,0,1
Style: BeatPill,${spec.assFont},34,&H00FFFFFF,&H00FFFFFF,&H99221105,&H00000000,-1,0,0,0,100,100,0.6,0,1,12,0,8,140,180,225,1
Style: AbBadgeText,${spec.assFont},32,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0.8,0,1,0,0,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = [...buildHookBannerAssEvents(hookBannerText, hookX, hookY, fontTheme, overrides)];
  if (Array.isArray(exactPhrases) && exactPhrases.length > 0) {
    const maxEnd = exactPhrases.reduce((m, p) => Math.max(m, Number(p.end) || 0), 30);
    events.push(...buildAbBadgeAssEvents(abBadgeMode, exactPhrases, maxEnd));
    for (const p of exactPhrases) {
      const t0 = fmtAssTime(p.start);
      const t1 = fmtAssTime(p.end);
      const colored = colorizeViralCaptionAss(p.text, enableColor, fontTheme, overrides);
      const glowTxt = spec.uppercase ? String(p.text || "").toUpperCase() : p.text;
      const popTag = enableColor ? '{\\fscx105\\fscy105\\t(0,80,\\fscx100\\fscy100)}' : '';
      if (spec.borderStyle === 1) events.push(`Dialogue: 0,${t0},${t1},GlowBg,,0,0,0,,{\\blur10}${glowTxt}`);
      events.push(`Dialogue: 1,${t0},${t1},Caption,,0,0,0,,${popTag}${colored}`);
    }
    fs.writeFileSync(outAssPath, header + events.join('\n') + '\n', 'utf8');
    return;
  }
  const maxWinEnd = (lineWindows || []).reduce((m, w) => Math.max(m, Number(w.end) || 0), 30);
  events.push(...buildAbBadgeAssEvents(abBadgeMode, lineWindows, maxWinEnd));
  const activeLinesArr = Array.isArray(sourceLines) ? sourceLines : [];
  for (const win of lineWindows) {
    const lineObj = activeLinesArr[win.lineIndex];
    if (!lineObj) continue;
    const bt = String(lineObj.beatTitle || '').trim();
    if (bt && !/^LIVE BEAT|^STEP \d+$/i.test(bt) && win.start >= 3.2) {
      const btEnd = fmtAssTime(Math.min(win.end, win.start + 2.4));
      events.push(`Dialogue: 2,${fmtAssTime(win.start)},${btEnd},BeatPill,,0,0,0,,${bt}`);
    }
    const chunks = lineObj.chunks && lineObj.chunks.length ? lineObj.chunks : [lineObj.text];
    const totalChars = chunks.reduce((a, c) => a + c.length, 0);
    const totalSpan = Math.max(0.4, win.end - win.start);
    let cur = win.start;
    chunks.forEach((chunk, idx) => {
      const share =
        idx === chunks.length - 1
          ? Math.max(0.15, win.end - cur)
          : totalSpan * (chunk.length / Math.max(1, totalChars));
      const t0 = fmtAssTime(cur);
      const t1 = fmtAssTime(cur + share);
      const coloredChunk = colorizeViralCaptionAss(chunk, enableColor, fontTheme, overrides);
      const glowChunk = spec.uppercase ? String(chunk || "").toUpperCase() : chunk;
      const popTag = enableColor ? '{\\fscx105\\fscy105\\t(0,80,\\fscx100\\fscy100)}' : '';
      if (spec.borderStyle === 1) events.push(`Dialogue: 0,${t0},${t1},GlowBg,,0,0,0,,{\\blur10}${glowChunk}`);
      events.push(`Dialogue: 1,${t0},${t1},Caption,,0,0,0,,${popTag}${coloredChunk}`);
      cur += share;
    });
  }
  fs.writeFileSync(outAssPath, header + events.join('\n') + '\n', 'utf8');
}

function processSingleTake(options, cb) {
  const {
    inFile = 'latest_take.webm',
    outFile = 'latest_take_mastered.mp4',
    preset = 'studio',
    trimSilence = true,
    coldOpenTrim = true,
    dynamicZoom = false,
    musicBed = false,
    avDelayMs = 0,
    colorCaptions = true,
    lensPolish = true,
    viralSfx = false,
    abBadgeMode = 'off',
    fontTheme = studioState.fontTheme || 'classic_poppins',
    fontCase = studioState.fontCase || 'default',
    fontBacking = studioState.fontBacking || 'default',
    fontScale = studioState.fontScale || 100,
    burnCaptions = true,
    burnHookBanner = false,
    hookBannerText = '',
    hookBannerX = studioState.hookBannerX || 540,
    hookBannerY = studioState.hookBannerY || 335,
    saveToVault = false,
    mode = 'full',
    freeLines = [],
    visualFormat = studioState.visualFormat || 'illustration'
  } = options;

  const fullIn = path.join(scratchDir, inFile);
  if (!fs.existsSync(fullIn)) {
    return cb(new Error('No recorded take found yet'));
  }

  analyzeSilenceAndDuration(fullIn, async (err, info) => {
    let segs =
      trimSilence && info && info.keepSegments.length > 0
        ? info.keepSegments
        : [{ start: 0, end: (info && info.duration) || 33 }];
    if (!trimSilence && coldOpenTrim && info && info.keepSegments && info.keepSegments.length > 0) {
      const firstSpeechStart = Math.max(0, info.keepSegments[0].start);
      if (firstSpeechStart > 0.18 && firstSpeechStart < ((info.duration || 33) - 1.0)) {
        segs = [{ start: firstSpeechStart, end: (info && info.duration) || 33 }];
      }
    }

    const totalKeptDuration = segs.reduce((acc, s) => acc + Math.max(0.1, s.end - s.start), 0);

    // Only use explicit Custom Script lines when the user actually wrote a script; otherwise use current take's freeLines
    const sourceLinesForTake = (mode === 'free' || SCRIPT_LINES.length === 0)
      ? (Array.isArray(freeLines) && freeLines.length > 0
          ? parseCustomScriptLines(freeLines.map((txt, idx) => `[LIVE BEAT ${idx + 1}] ${txt}`).join('\n'))
          : [])
      : SCRIPT_LINES;

    const lineWindows = [];
    if (mode === 'full' || mode === 'free') {
      if (sourceLinesForTake.length > 0) {
        const baseTotal = Math.max(0.1, sourceLinesForTake.reduce((a, l) => a + l.duration, 0));
        let accT = 0;
        for (let i = 0; i < sourceLinesForTake.length; i++) {
          const span = (sourceLinesForTake[i].duration / baseTotal) * totalKeptDuration;
          lineWindows.push({ lineIndex: i, start: accT, end: accT + span });
          accT += span;
        }
      }
    } else {
      const idx = Number(mode);
      if (!isNaN(idx) && sourceLinesForTake[idx]) {
        lineWindows.push({ lineIndex: idx, start: 0, end: totalKeptDuration });
      }
    }

    const afChain = getAfChain(preset, null, avDelayMs);
    const musicBedFile = musicBed ? ensureMusicBedWav() : (viralSfx ? ensureViralSfxWav() : null);
    const fullOutPath = path.join(scratchDir, outFile);

    const finalizeVaultAndCallback = () => {
      if (saveToVault) {
        const tsVault = Date.now();
        const vaultFile = `vault_take_${tsVault}.mp4`;
        const vaultRawFile = `vault_raw_${tsVault}${path.extname(inFile) || '.webm'}`;
        try {
          fs.copyFileSync(fullOutPath, path.join(scratchDir, vaultFile));
          if (fs.existsSync(fullIn)) {
            fs.copyFileSync(fullIn, path.join(scratchDir, vaultRawFile));
          }
          const firstLine = (sourceLinesForTake[0] && sourceLinesForTake[0].text)
            ? sourceLinesForTake[0].text.slice(0, 28)
            : (mode === 'free' ? 'Free Record Take' : 'Studio Take');
          addTakeToHistory({
            file: vaultFile,
            rawFile: vaultRawFile,
            label: `${firstLine}...`,
            duration: totalKeptDuration,
            freeLines: sourceLinesForTake.map((l) => l.text).filter(Boolean),
            hookBannerText: hookBannerText || ''
          });
          studioState.takeHistory = TAKE_HISTORY;
        } catch (e) {}
      }
      const url = `/takes/${outFile}?t=${Date.now()}`;
      studioState.masteredMp4 = url;
      studioState.lines = getLineBankStatus();
      analyzeAudioTelemetry(fullOutPath, (_pErr, postStats) => {
        if (postStats) {
          AUTO_AUDIO_PROFILE = saveAutoAudioProfile({
            ...AUTO_AUDIO_PROFILE,
            source: 'Broadcast Mastered Output (-14.0 LUFS)',
            postLufs: Number.isFinite(postStats.measuredLufs) && postStats.measuredLufs > -24 ? postStats.measuredLufs : -14.0,
            postPeakDb: Number.isFinite(postStats.speechPeakDb) ? postStats.speechPeakDb : -1.0,
            speechRmsDb: Number.isFinite(postStats.speechRmsDb) ? postStats.speechRmsDb : AUTO_AUDIO_PROFILE.speechRmsDb
          });
          studioState.autoAudioProfile = AUTO_AUDIO_PROFILE;
        }
        studioState.version = ++stateVersion;
        cb(null, url, totalKeptDuration, AUTO_AUDIO_PROFILE);
      });
    };

    // In 2D Illustration Mode, render crisp 1080x1920 SVG vector plates + yellow word-by-word karaoke ASS captions synced to the user's mastered voiceover!
    if (visualFormat === 'illustration' && lineWindows.length > 0) {
      try {
        const customEp = mode === 'free'
          ? { ...getActiveCustomEpisode(), lines: sourceLinesForTake }
          : getActiveCustomEpisode();
        await renderIllustrationMp4({
          customEpisode: customEp,
          lineWindows,
          audioInputPath: fullIn,
          audioFilterChain: afChain,
          keepSegments: segs,
          burnCaptions,
          burnHookBanner,
          hookBannerText,
          hookBannerX,
          hookBannerY,
          musicBedPath: musicBedFile,
          outMp4Path: fullOutPath
        });
        try {
          fs.copyFileSync(fullOutPath, path.join(brainDir, 'ep1_3_point_lighting_illustration.mp4'));
        } catch (e) {}
        return finalizeVaultAndCallback();
      } catch (renderErr) {
        console.error('Illustration render fallback error:', renderErr);
      }
    }

    // Fallback / Webcam Mode (with local Poppins Bold + GlowBg ASS subtitle burning + 3s Hook Banner)
    const assFile = 'captions_single.ass';
    const effectiveHook = burnHookBanner ? hookBannerText : '';
    const hasSubtitles = (burnCaptions && lineWindows.length > 0) || Boolean(effectiveHook) || (abBadgeMode && abBadgeMode !== 'off');
    if (hasSubtitles) {
      writeAssSubtitles(burnCaptions ? lineWindows : [], path.join(scratchDir, assFile), effectiveHook, null, hookBannerX, hookBannerY, sourceLinesForTake, { colorCaptions, abBadgeMode, fontTheme, fontCase, fontBacking, fontScale });
    }

    // Dynamic Zoom Cut filter: alternates 1.0x and 1.08x center punch-in every 4.5s (or on odd segments)
    const zoomScaleSingle = dynamicZoom
      ? "scale=1166:2074:flags=lanczos,crop=1080:1920:'if(lt(mod(t,9.0),4.5),43,43)':'if(lt(mod(t,9.0),4.5),77,60)',fps=30,format=yuv420p"
      : 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p';

    const buildSingleTakeArgs = (forceCpu) => {
      if (segs.length <= 1 && !musicBedFile && !(segs[0] && segs[0].start > 0.05)) {
        const vfParts = [
          dynamicZoom
            ? "crop=w='if(lt(mod(t,8.0),4.0),iw,iw*0.925)':h='if(lt(mod(t,8.0),4.0),ih,ih*0.925)':x='(iw-ow)/2':y='(ih-oh)*0.38',scale=1080:1920:flags=lanczos,fps=30,format=yuv420p"
            : 'scale=1080:1920:flags=lanczos,fps=30,format=yuv420p'
        ];
        if (lensPolish) vfParts.push('unsharp=5:5:0.55:5:5:0.0');
        if (hasSubtitles) vfParts.push(`ass=${assFile}:fontsdir=fonts`);
        return [
          '-y',
          '-i',
          inFile,
          '-vf',
          vfParts.join(','),
          '-af',
          afChain,
          ...getVideoEncoderArgs(20, forceCpu),
          '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-movflags',
          '+faststart',
          outFile
        ];
      }

      const vSplitLabels = segs.map((_, i) => `[vin${i}]`).join('');
      const aSplitLabels = segs.map((_, i) => `[ain${i}]`).join('');
      const filterParts = [
        segs.length > 1 ? `[0:v]split=${segs.length}${vSplitLabels}` : `[0:v]null[vin0]`,
        segs.length > 1 ? `[0:a]${afChain},asplit=${segs.length}${aSplitLabels}` : `[0:a]${afChain}[ain0]`
      ];
      const concatInputs = [];
      segs.forEach((seg, i) => {
        const s = seg.start.toFixed(3);
        const e = seg.end.toFixed(3);
        const dur = Math.max(0.06, seg.end - seg.start);
        const fadeOutSt = Math.max(0, dur - 0.018).toFixed(3);
        const vScaleExpr = dynamicZoom
          ? (segs.length > 1
              ? (i % 2 === 1 ? 'scale=1166:2074:flags=lanczos,crop=1080:1920:43:62' : 'scale=1080:1920:flags=lanczos')
              : "crop=w='if(lt(mod(t,8.0),4.0),iw,iw*0.925)':h='if(lt(mod(t,8.0),4.0),ih,ih*0.925)':x='(iw-ow)/2':y='(ih-oh)*0.38',scale=1080:1920:flags=lanczos")
          : 'scale=1080:1920:flags=lanczos';
        filterParts.push(`[vin${i}]trim=start=${s}:end=${e},setpts=PTS-STARTPTS,${vScaleExpr},fps=30,format=yuv420p[v${i}]`);
        filterParts.push(`[ain${i}]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.018,afade=t=out:st=${fadeOutSt}:d=0.018[a${i}]`);
        concatInputs.push(`[v${i}][a${i}]`);
      });
      if (segs.length > 1) {
        filterParts.push(`${concatInputs.join('')}concat=n=${segs.length}:v=1:a=1[vcat][acat]`);
      } else {
        filterParts.push(`[v0]null[vcat]`);
        filterParts.push(`[a0]anull[acat]`);
      }
      const postVf = [];
      if (lensPolish) postVf.push('unsharp=5:5:0.55:5:5:0.0');
      if (hasSubtitles) postVf.push(`ass=${assFile}:fontsdir=fonts`);
      filterParts.push(`[vcat]${postVf.length ? postVf.join(',') : 'null'}[vout]`);
      if (musicBedFile && fs.existsSync(musicBedFile)) {
        filterParts.push(`[1:a]volume=0.085,aresample=48000[abed]`);
        filterParts.push(`[acat][abed]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`);
      } else {
        filterParts.push(`[acat]anull[aout]`);
      }

      const outArgs = ['-y', '-i', inFile];
      if (musicBedFile && fs.existsSync(musicBedFile)) {
        outArgs.push('-stream_loop', '-1', '-i', musicBedFile);
      }
      outArgs.push(
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[vout]',
        '-map',
        '[aout]',
        ...getVideoEncoderArgs(20, forceCpu),
        '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        outFile
      );
      return outArgs;
    };

    execFfmpegWithCpuFallback(buildSingleTakeArgs, { cwd: scratchDir, timeout: 90000 }, (ffErr) => {
      if (ffErr) return cb(ffErr);
      finalizeVaultAndCallback();
    });
  });
}

function stitchAllFiveLines(options, cb) {
  const {
    preset = 'studio',
    trimSilence = true,
    burnCaptions = true,
    burnHookBanner = studioState.burnHookBanner !== false,
    hookBannerText = studioState.hookBannerText || '',
    hookBannerX = studioState.hookBannerX || 540,
    hookBannerY = studioState.hookBannerY || 335,
    visualFormat = studioState.visualFormat || 'webcam'
  } = options;
  const lineCount = SCRIPT_LINES.length;
  const lineFiles = SCRIPT_LINES.map((_, i) => `line_${i}.webm`);
  for (let i = 0; i < lineCount; i++) {
    if (!fs.existsSync(path.join(scratchDir, lineFiles[i]))) {
      return cb(new Error(`Missing recorded take for Line ${i + 1}. Record all ${lineCount} lines first.`));
    }
  }

  let done = 0;
  const lineInfos = new Array(lineCount);
  lineFiles.forEach((f, idx) => {
    analyzeSilenceAndDuration(path.join(scratchDir, f), (err, info) => {
      lineInfos[idx] = info || {
        duration: SCRIPT_LINES[idx].duration,
        keepSegments: [{ start: 0, end: SCRIPT_LINES[idx].duration }]
      };
      done++;
      if (done === lineCount) buildStitchedMp4();
    });
  });

  function buildStitchedMp4() {
    const filterParts = [];
    const aConcatInputs = [];
    const lineWindows = [];
    let cursorTime = 0;
    let totalSegCount = 0;

    for (let i = 0; i < lineCount; i++) {
      const info = lineInfos[i];
      const segs =
        trimSilence && info.keepSegments.length > 0
          ? info.keepSegments
          : [{ start: 0, end: info.duration }];

      let lineSpan = 0;
      if (segs.length > 1) {
        const aSplitLabels = segs.map((_, j) => `[ain_${i}_${j}]`).join('');
        filterParts.push(`[${i}:a]asplit=${segs.length}${aSplitLabels}`);
        segs.forEach((seg, j) => {
          const s = seg.start.toFixed(3);
          const e = seg.end.toFixed(3);
          const dur = Math.max(0.06, seg.end - seg.start);
          const fadeOutSt = Math.max(0, dur - 0.018).toFixed(3);
          lineSpan += Math.max(0.1, seg.end - seg.start);
          filterParts.push(
            `[ain_${i}_${j}]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.018,afade=t=out:st=${fadeOutSt}:d=0.018,aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo[a_${i}_${j}]`
          );
          aConcatInputs.push(`[a_${i}_${j}]`);
          totalSegCount++;
        });
      } else {
        const seg = segs[0];
        const s = seg.start.toFixed(3);
        const e = seg.end.toFixed(3);
        lineSpan += Math.max(0.1, seg.end - seg.start);
        filterParts.push(
          `[${i}:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo[a_${i}_0]`
        );
        aConcatInputs.push(`[a_${i}_0]`);
        totalSegCount++;
      }

      lineWindows.push({ lineIndex: i, start: cursorTime, end: cursorTime + lineSpan });
      cursorTime += lineSpan;
    }

    const afChain = getAfChain(preset);
    const stitchedAudioWav = path.join(scratchDir, 'stitched_voiceover.wav');
    filterParts.push(`${aConcatInputs.join('')}concat=n=${totalSegCount}:v=0:a=1,${afChain}[aout]`);

    const audioArgs = ['-y'];
    lineFiles.forEach((f) => audioArgs.push('-i', path.join(scratchDir, f)));
    audioArgs.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[aout]',
      '-c:a',
      'pcm_s16le',
      stitchedAudioWav
    );

    execFile(ffmpegBin, audioArgs, { cwd: scratchDir, timeout: 90000 }, async (aErr) => {
      if (aErr) return cb(aErr);
      const outFile = 'latest_take_mastered.mp4';
      const fullOutPath = path.join(scratchDir, outFile);

      if (visualFormat === 'webcam') {
        // Check if line_0..line_N have video streams; if so, stitch webcam video + mastered audio + ASS subtitles
        const vFilterParts = [];
        const vConcatInputs = [];
        let vSegCount = 0;
        for (let i = 0; i < lineCount; i++) {
          const info = lineInfos[i];
          const segs =
            trimSilence && info.keepSegments.length > 0
              ? info.keepSegments
              : [{ start: 0, end: info.duration }];
          if (segs.length > 1) {
            const vSplitLabels = segs.map((_, j) => `[vin_${i}_${j}]`).join('');
            vFilterParts.push(`[${i}:v]split=${segs.length}${vSplitLabels}`);
            segs.forEach((seg, j) => {
              const s = seg.start.toFixed(3);
              const e = seg.end.toFixed(3);
              vFilterParts.push(
                `[vin_${i}_${j}]trim=start=${s}:end=${e},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,fps=30,format=yuv420p[v_${i}_${j}]`
              );
              vConcatInputs.push(`[v_${i}_${j}]`);
              vSegCount++;
            });
          } else {
            const seg = segs[0];
            vFilterParts.push(
              `[${i}:v]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,fps=30,format=yuv420p[v_${i}_0]`
            );
            vConcatInputs.push(`[v_${i}_0]`);
            vSegCount++;
          }
        }
        const assFile = 'captions_stitched.ass';
        const effectiveHook = burnHookBanner ? hookBannerText : '';
        const hasSubtitles = burnCaptions || Boolean(effectiveHook);
        if (hasSubtitles) {
          writeAssSubtitles(burnCaptions ? lineWindows : [], path.join(scratchDir, assFile), effectiveHook, null, hookBannerX, hookBannerY, SCRIPT_LINES);
        }
        vFilterParts.push(
          `${vConcatInputs.join('')}concat=n=${vSegCount}:v=1:a=0${hasSubtitles ? `,ass=${assFile}:fontsdir=fonts` : ''}[vout]`
        );
        const vArgs = ['-y'];
        lineFiles.forEach((f) => vArgs.push('-i', path.join(scratchDir, f)));
        vArgs.push(
          '-i',
          stitchedAudioWav,
          '-filter_complex',
          vFilterParts.join(';'),
          '-map',
          '[vout]',
          '-map',
          `${lineCount}:a`,
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '20',
          '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-shortest',
          '-movflags',
          '+faststart',
          outFile
        );
        return execFile(ffmpegBin, vArgs, { cwd: scratchDir, timeout: 90000 }, async (vErr) => {
          if (!vErr) {
            const url = `/takes/${outFile}?t=${Date.now()}`;
            studioState.masteredMp4 = url;
            studioState.lines = getLineBankStatus();
            studioState.version = ++stateVersion;
            return cb(null, url, cursorTime);
          }
          // Fallback to 2D illustration if audio-only webm files were recorded
          try {
            await renderIllustrationMp4({
              customEpisode: getActiveCustomEpisode(),
              lineWindows,
              audioInputPath: stitchedAudioWav,
              audioFilterChain: 'anull',
              burnCaptions,
              burnHookBanner,
              hookBannerText,
              hookBannerX,
              hookBannerY,
              outMp4Path: fullOutPath
            });
            const url = `/takes/${outFile}?t=${Date.now()}`;
            studioState.masteredMp4 = url;
            studioState.lines = getLineBankStatus();
            studioState.version = ++stateVersion;
            return cb(null, url, cursorTime);
          } catch (renderErr) {
            return cb(renderErr);
          }
        });
      }

      try {
        await renderIllustrationMp4({
          customEpisode: getActiveCustomEpisode(),
          lineWindows,
          audioInputPath: stitchedAudioWav,
          audioFilterChain: 'anull',
          burnCaptions,
          burnHookBanner,
          hookBannerText,
          hookBannerX,
          hookBannerY,
          outMp4Path: fullOutPath
        });
        try {
          fs.copyFileSync(fullOutPath, path.join(brainDir, 'ep1_3_point_lighting_illustration.mp4'));
        } catch (e) {}
        const url = `/takes/${outFile}?t=${Date.now()}`;
        studioState.masteredMp4 = url;
        studioState.lines = getLineBankStatus();
        studioState.version = ++stateVersion;
        return cb(null, url, cursorTime);
      } catch (renderErr) {
        return cb(renderErr);
      }
    });
  }
}

const ARCHIVED_VAULT_SOURCES = {};

let activeVaultFile = null;

function getActiveTranscriptForHookAnalysis() {
  if (activeVaultFile && ARCHIVED_VAULT_SOURCES[activeVaultFile]) {
    return ARCHIVED_VAULT_SOURCES[activeVaultFile].phrases;
  }
  if (Array.isArray(studioState.freeRecordLines) && studioState.freeRecordLines.length > 0) {
    return studioState.freeRecordLines;
  }
  return [];
}

function burnCleanMp4WithPhrases({ vaultKey, preset = 'auto', burnCaptions, burnHookBanner, hookBannerText, hookBannerX = 540, hookBannerY = 335, musicBed = false, dynamicZoom = false, avDelayMs = 0, colorCaptions = true, lensPolish = true, viralSfx = false, abBadgeMode = 'off', fontTheme = studioState.fontTheme || 'classic_poppins', fontCase = studioState.fontCase || 'default', fontBacking = studioState.fontBacking || 'default', fontScale = studioState.fontScale || 100 }, cb) {
  const spec = ARCHIVED_VAULT_SOURCES[vaultKey];
  if (!spec || !fs.existsSync(path.join(scratchDir, spec.cleanMp4))) {
    return cb(new Error('Clean source video not found'));
  }
  const assFile = 'captions_vault_reburn.ass';
  const effectiveHook = burnHookBanner ? hookBannerText : '';
  const phrasesToBurn = burnCaptions ? spec.phrases : [];
  writeAssSubtitles([], path.join(scratchDir, assFile), effectiveHook, phrasesToBurn, hookBannerX, hookBannerY, SCRIPT_LINES, { colorCaptions, abBadgeMode, fontTheme, fontCase, fontBacking, fontScale });

  const outFile = 'latest_take_mastered.mp4';
  const vfParts = [];
  if (dynamicZoom) {
    vfParts.push("crop=w='if(lt(mod(t,8.0),4.0),iw,iw*0.925)':h='if(lt(mod(t,8.0),4.0),ih,ih*0.925)':x='(iw-ow)/2':y='(ih-oh)*0.38',scale=1080:1920:flags=lanczos");
  }
  if (lensPolish) {
    vfParts.push('unsharp=5:5:0.55:5:5:0.0');
  }
  if (phrasesToBurn.length > 0 || effectiveHook || (abBadgeMode && abBadgeMode !== 'off')) {
    vfParts.push(`ass=${assFile}:fontsdir=fonts`);
  }
  const vfArg = vfParts.length > 0 ? vfParts.join(',') : 'null';
  const keepCleanAudio = spec.skipAudioRemaster && (!preset || preset === 'auto' || preset === 'raw') && !musicBed && !viralSfx && !(Number(avDelayMs) > 0);
  const afChain = keepCleanAudio ? null : getAfChain(preset || 'auto', null, avDelayMs);
  const musicBedFile = musicBed ? ensureMusicBedWav() : (viralSfx ? ensureViralSfxWav() : null);

  const buildVaultArgs = (forceCpu) => {
    if (musicBedFile && fs.existsSync(musicBedFile)) {
      const voiceChain = afChain || 'aresample=48000';
      const fc = [
        `[0:v]${vfArg}[vout]`,
        `[0:a]${voiceChain}[avoice]`,
        `[1:a]volume=0.085,aresample=48000[abed]`,
        `[avoice][abed]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]`
      ].join(';');
      return [
        '-y',
        '-i',
        spec.cleanMp4,
        '-stream_loop',
        '-1',
        '-i',
        musicBedFile,
        '-filter_complex',
        fc,
        '-map',
        '[vout]',
        '-map',
        '[aout]',
        ...getVideoEncoderArgs(19, forceCpu),
        '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '48000',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        outFile
      ];
    }
    return [
      '-y',
      '-i',
      spec.cleanMp4,
      '-vf',
      vfArg,
      ...(afChain ? ['-af', afChain, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'] : ['-c:a', 'copy']),
      ...getVideoEncoderArgs(19, forceCpu),
      '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-movflags',
      '+faststart',
      outFile
    ];
  };

  execFfmpegWithCpuFallback(buildVaultArgs, { cwd: scratchDir, timeout: 90000 }, (ffErr) => {
    if (ffErr) return cb(ffErr);
    try {
      fs.copyFileSync(path.join(scratchDir, outFile), path.join(scratchDir, vaultKey));
      if (spec.artifactOut) {
        fs.copyFileSync(path.join(scratchDir, outFile), path.join(brainDir, spec.artifactOut));
      }
    } catch (e) {}
    const url = `/takes/${outFile}?t=${Date.now()}`;
    studioState.masteredMp4 = url;
    studioState.version = ++stateVersion;
    cb(null, url, spec.duration);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Mode, X-Elapsed, X-Words, X-Preset, X-Trim, X-Cold-Open, X-Dynamic-Zoom, X-Music-Bed, X-Av-Delay-Ms, X-Color-Captions, X-Lens-Polish, X-Viral-Sfx, X-Ab-Badge, X-Font-Theme, X-Font-Case, X-Font-Backing, X-Font-Scale, X-Filename, X-Captions, X-Format, X-Episode, X-Burn-Hook, X-Hook-Banner, X-Hook-Mode, X-Hook-X, X-Hook-Y, X-Auto-Profile, X-Use-Active, X-Free-Lines'
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Content-Length': 0 });
    res.end();
    return;
  }

  const cleanUrl = req.url.split('?')[0];

  if (cleanUrl === '/favicon.ico' || cleanUrl === '/icon.ico') {
    req.resume();
    const icoPath = fs.existsSync(path.join(bundledAssetsDir, 'icon.ico'))
      ? path.join(bundledAssetsDir, 'icon.ico')
      : path.join(scratchDir, 'icon.ico');
    if (fs.existsSync(icoPath)) {
      const buf = fs.readFileSync(icoPath);
      res.writeHead(200, {
        'Content-Type': 'image/x-icon',
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=86400',
        'Connection': 'close'
      });
      res.end(buf);
      return;
    }
    res.writeHead(204, { 'Content-Length': 0, 'Connection': 'close' });
    res.end();
    return;
  }

  if (cleanUrl === '/icon.svg' || cleanUrl === '/icon.png') {
    req.resume();
    const isSvg = cleanUrl.endsWith('.svg');
    const fName = isSvg ? 'icon.svg' : 'icon.png';
    const fPath = fs.existsSync(path.join(bundledAssetsDir, fName))
      ? path.join(bundledAssetsDir, fName)
      : path.join(scratchDir, fName);
    if (fs.existsSync(fPath)) {
      const buf = fs.readFileSync(fPath);
      res.writeHead(200, {
        'Content-Type': isSvg ? 'image/svg+xml; charset=utf-8' : 'image/png',
        'Content-Length': buf.length,
        'Cache-Control': 'no-store',
        'Connection': 'close'
      });
      res.end(buf);
      return;
    }
    res.writeHead(204, { 'Content-Length': 0, 'Connection': 'close' });
    res.end();
    return;
  }


  if (req.method === 'GET' && cleanUrl === '/qr.svg') {
    req.resume();
    const urlObj = new URL(req.url, 'http://localhost:3100');
    const targetUrl = urlObj.searchParams.get('url') || `http://${getLanIp()}:3100/takes/latest_take_mastered.mp4?download=1`;
    const svgStr = generateQrSvg(targetUrl);
    const svgBuf = Buffer.from(svgStr, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Length': svgBuf.length,
      'Cache-Control': 'no-store',
      'Connection': 'close'
    });
    res.end(svgBuf);
    return;
  }

  if (cleanUrl === '/illustration_episodes.js') {
    req.resume();
    const epPath = fs.existsSync(path.join(__dirname, 'illustration_episodes.js'))
      ? path.join(__dirname, 'illustration_episodes.js')
      : path.join(scratchDir, 'illustration_episodes.js');
    const jsBuf = fs.existsSync(epPath) ? fs.readFileSync(epPath) : Buffer.from('window.EPISODES=[];', 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Content-Length': jsBuf.length,
      'Cache-Control': 'no-store',
      'Connection': 'close'
    });
    res.end(jsBuf);
    return;
  }

  if (req.method === 'GET' && cleanUrl === '/state') {
    req.resume();
    studioState.lines = getLineBankStatus();
    studioState.takeHistory = TAKE_HISTORY;
    studioState.autoAudioProfile = AUTO_AUDIO_PROFILE;
    studioState.lanIp = getLanIp();
    studioState.hwEncoder = HW_H264_ENCODER;
    studioState.asrEngine = (fs.existsSync(whisperCliBin) && fs.existsSync(whisperModelPath)) ? 'whisper.cpp (ggml-tiny.en)' : 'windows-sapi';
    studioState.updateStatus = global.xlUpdaterState || {
      status: 'idle',
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      percent: 0,
      message: 'v1.0.0'
    };
    const activeTranscript = getActiveTranscriptForHookAnalysis();
    if (activeTranscript.length > 0) {
      const analyzed = analyzeVideoContentForHook(activeTranscript);
      studioState.hookSuggestions = analyzed.suggestions;
    } else {
      studioState.hookSuggestions = [];
    }
    return sendJson(res, 200, { ok: true, state: studioState });
  }

  if (req.method === 'POST' && cleanUrl === '/update-transcript') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (Array.isArray(body.lines)) {
          const cleaned = body.lines.map((l) => String(l || '').trim()).filter(Boolean);
          if (activeVaultFile && ARCHIVED_VAULT_SOURCES[activeVaultFile]) {
            const phrases = ARCHIVED_VAULT_SOURCES[activeVaultFile].phrases;
            for (let i = 0; i < Math.min(phrases.length, cleaned.length); i++) {
              phrases[i].text = cleaned[i];
            }
          } else {
            studioState.freeRecordLines = cleaned;
          }
          studioState.version = ++stateVersion;
          return sendJson(res, 200, { ok: true, lines: cleaned });
        }
      } catch (e) {}
      return sendJson(res, 400, { ok: false, error: 'Invalid transcript lines' });
    });
    return;
  }

  if (req.method === 'GET' && cleanUrl === '/update-status') {
    req.resume();
    const update = global.xlUpdaterState || {
      status: 'idle',
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      percent: 0,
      message: 'v1.0.0'
    };
    return sendJson(res, 200, { ok: true, update });
  }

  if (req.method === 'POST' && cleanUrl === '/check-update') {
    req.resume();
    if (global.xlUpdaterController && typeof global.xlUpdaterController.checkForUpdates === 'function') {
      global.xlUpdaterController.checkForUpdates().then((update) => {
        sendJson(res, 200, { ok: true, update });
      }).catch((err) => {
        sendJson(res, 200, { ok: true, update: global.xlUpdaterState, error: String(err && err.message || err) });
      });
      return;
    }
    return sendJson(res, 200, {
      ok: true,
      update: global.xlUpdaterState || { status: 'up-to-date', currentVersion: '1.0.0', latestVersion: '1.0.0', percent: 0, message: 'v1.0.0 Up to Date' }
    });
  }

  if (req.method === 'POST' && cleanUrl === '/install-update') {
    req.resume();
    if (global.xlUpdaterController && typeof global.xlUpdaterController.quitAndInstall === 'function') {
      const installing = global.xlUpdaterController.quitAndInstall();
      return sendJson(res, 200, { ok: true, installing, update: global.xlUpdaterState });
    }
    return sendJson(res, 200, { ok: false, installing: false });
  }

  if (req.method === 'POST' && cleanUrl === '/uninstall-app') {
    req.resume();
    if (global.xlUpdaterController && typeof global.xlUpdaterController.launchUninstaller === 'function') {
      const launched = global.xlUpdaterController.launchUninstaller();
      return sendJson(res, 200, { ok: launched });
    }
    return sendJson(res, 200, { ok: false });
  }

  if (req.method === 'POST' && cleanUrl === '/update-feed') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (global.xlUpdaterController && typeof global.xlUpdaterController.setFeedUrl === 'function' && body.feedUrl) {
          const update = global.xlUpdaterController.setFeedUrl(body.feedUrl);
          return sendJson(res, 200, { ok: true, update });
        }
      } catch (e) {}
      return sendJson(res, 400, { ok: false, error: 'Invalid feedUrl' });
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/sound-check') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      let clientHint = {};
      try {
        const hdr = req.headers['x-auto-profile'];
        if (hdr) clientHint = JSON.parse(decodeURIComponent(hdr));
      } catch (e) {}

      let sourcePath = path.join(scratchDir, 'sound_check_raw.webm');
      if (buf && buf.length > 200) {
        fs.writeFileSync(sourcePath, buf);
      } else {
        // Fallback: calibrate directly from active vault take or latest recorded take
        const latestWebm = path.join(scratchDir, 'latest_take.webm');
        const activeClean = activeVaultFile && ARCHIVED_VAULT_SOURCES[activeVaultFile]
          ? path.join(scratchDir, ARCHIVED_VAULT_SOURCES[activeVaultFile].cleanMp4)
          : null;
        const ep1Fallback = path.join(brainDir, 'ep1_camera_distance_captioned.mp4');
        if (fs.existsSync(latestWebm) && fs.statSync(latestWebm).size > 200) {
          sourcePath = latestWebm;
          clientHint.source = clientHint.source || 'Latest Recorded Voiceover Take';
        } else if (activeClean && fs.existsSync(activeClean)) {
          sourcePath = activeClean;
          clientHint.source = clientHint.source || 'Active Vault Take Telemetry';
        } else if (fs.existsSync(ep1Fallback)) {
          sourcePath = ep1Fallback;
          clientHint.source = clientHint.source || 'Episode 1 Voice Telemetry';
        } else {
          AUTO_AUDIO_PROFILE = saveAutoAudioProfile(clientHint);
          studioState.autoAudioProfile = AUTO_AUDIO_PROFILE;
          studioState.audioPreset = 'auto';
          studioState.version = ++stateVersion;
          return sendJson(res, 200, { ok: true, profile: AUTO_AUDIO_PROFILE });
        }
      }

      analyzeAudioTelemetry(sourcePath, (anErr, ffStats) => {
        const calibrated = buildCalibratedProfileFromTelemetry(ffStats || {}, clientHint);
        const afChain = getAfChain('auto', calibrated);
        const outWav = 'sound_check_mastered.wav';
        const outWavFull = path.join(scratchDir, outWav);

        execFile(
          ffmpegBin,
          ['-y', '-i', sourcePath, '-t', '7', '-vn', '-af', afChain, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', outWav],
          { cwd: scratchDir, timeout: 30000 },
          (mErr) => {
            if (!mErr && fs.existsSync(outWavFull)) {
              analyzeAudioTelemetry(outWavFull, (_, postStats) => {
                if (postStats) {
                  calibrated.postLufs = Number(clampNum(postStats.measuredLufs, -16.0, -12.5, -14.0).toFixed(1));
                  calibrated.postPeakDb = Number(clampNum(postStats.speechPeakDb, -6.0, -0.5, -1.0).toFixed(1));
                }
                calibrated.masteredCheckUrl = `/takes/${outWav}?t=${Date.now()}`;
                AUTO_AUDIO_PROFILE = saveAutoAudioProfile(calibrated);
                studioState.autoAudioProfile = AUTO_AUDIO_PROFILE;
                studioState.audioPreset = 'auto';
                studioState.version = ++stateVersion;
                return sendJson(res, 200, {
                  ok: true,
                  profile: AUTO_AUDIO_PROFILE,
                  masteredCheckUrl: calibrated.masteredCheckUrl
                });
              });
            } else {
              AUTO_AUDIO_PROFILE = saveAutoAudioProfile(calibrated);
              studioState.autoAudioProfile = AUTO_AUDIO_PROFILE;
              studioState.audioPreset = 'auto';
              studioState.version = ++stateVersion;
              return sendJson(res, 200, {
                ok: true,
                profile: AUTO_AUDIO_PROFILE,
                masteredCheckUrl: null
              });
            }
          }
        );
      });
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/analyze-hook') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const reqVault = parsed.vaultFile ? path.basename(String(parsed.vaultFile)) : '';
        if (reqVault && ARCHIVED_VAULT_SOURCES[reqVault]) {
          activeVaultFile = reqVault;
        }
        let sourceLines;
        if (activeVaultFile && ARCHIVED_VAULT_SOURCES[activeVaultFile]) {
          sourceLines = ARCHIVED_VAULT_SOURCES[activeVaultFile].phrases;
        } else if (Array.isArray(parsed.freeLines) && parsed.freeLines.length > 0) {
          sourceLines = parsed.freeLines;
        } else if (Array.isArray(studioState.freeRecordLines) && studioState.freeRecordLines.length > 0) {
          sourceLines = studioState.freeRecordLines;
        } else if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          sourceLines = parsed.lines;
        } else {
          sourceLines = getActiveTranscriptForHookAnalysis();
        }
        const analyzed = analyzeVideoContentForHook(sourceLines);
        let chosenHook = analyzed.primaryHook;
        const curHook = String(parsed.currentHook || '').trim();
        if (curHook && Array.isArray(analyzed.suggestions) && analyzed.suggestions.length > 1) {
          const curIdx = analyzed.suggestions.indexOf(curHook);
          if (curIdx !== -1) {
            chosenHook = analyzed.suggestions[(curIdx + 1) % analyzed.suggestions.length];
          }
        }
        studioState.hookBannerText = chosenHook;
        studioState.hookSuggestions = analyzed.suggestions;
        studioState.version = ++stateVersion;
        return sendJson(res, 200, {
          ok: true,
          generatedHook: chosenHook,
          hookSuggestions: analyzed.suggestions
        });
      } catch (e) {
        return sendJson(res, 400, { ok: false });
      }
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/select-take') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { file } = JSON.parse(body || '{}');
        const safeFile = path.basename(String(file || ''));
        const fullVault = path.join(scratchDir, safeFile);
        if (safeFile && fs.existsSync(fullVault)) {
          activeVaultFile = null;
          fs.copyFileSync(fullVault, path.join(scratchDir, 'latest_take_mastered.mp4'));
          const found = TAKE_HISTORY.find((t) => t.file === safeFile);
          if (found && found.rawFile) {
            const fullRaw = path.join(scratchDir, path.basename(String(found.rawFile)));
            if (fs.existsSync(fullRaw)) {
              try {
                fs.copyFileSync(fullRaw, path.join(scratchDir, 'latest_take.webm'));
              } catch (e) {}
            }
          }
          const restoredFreeLines = (found && Array.isArray(found.freeLines)) ? found.freeLines : [];
          studioState.freeRecordLines = restoredFreeLines;
          studioState.lastWhisperPhrases = [];
          const analyzed = analyzeVideoContentForHook(restoredFreeLines.map((t) => ({ text: t })));
          const chosenHook = (found && found.hookBannerText) ? found.hookBannerText : analyzed.primaryHook;
          studioState.hookBannerText = chosenHook;
          studioState.hookSuggestions = analyzed.suggestions;
          const url = `/takes/${safeFile}?t=${Date.now()}`;
          studioState.masteredMp4 = url;
          studioState.version = ++stateVersion;
          return sendJson(res, 200, {
            ok: true,
            masteredMp4: url,
            finalDuration: found ? found.duration : null,
            freeLines: restoredFreeLines,
            generatedHook: chosenHook,
            hookSuggestions: analyzed.suggestions,
            takeHistory: TAKE_HISTORY
          });
        }
        return sendJson(res, 404, { ok: false, error: 'Take file not found' });
      } catch (e) {
        return sendJson(res, 400, { ok: false });
      }
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/sync') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const msg = JSON.parse(body || '{}');
        if (msg.patch && typeof msg.patch === 'object') {
          if (typeof msg.patch.customScriptText === 'string') {
            SCRIPT_LINES = parseCustomScriptLines(msg.patch.customScriptText);
            studioState.lines = getLineBankStatus();
          }
          Object.assign(studioState, msg.patch);
        }
        if (msg.action && ['toggleRun', 'togglePause', 'retake', 'reset', 'toggleReplay'].includes(msg.action)) {
          studioState.pendingCommand = msg.action;
          studioState.commandId = (studioState.commandId || 0) + 1;
          studioState.commandSender = msg.sender || '';
        }
        studioState.version = ++stateVersion;
        return sendJson(res, 200, { ok: true, state: studioState });
      } catch (e) {
        return sendJson(res, 400, { ok: false });
      }
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/frame') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      latestPreviewJpeg = Buffer.concat(chunks);
      const okBuf = Buffer.from('ok');
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Length': okBuf.length });
      res.end(okBuf);
    });
    return;
  }

  if (req.method === 'GET' && cleanUrl === '/frame.jpg') {
    if (latestPreviewJpeg && latestPreviewJpeg.length > 50) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': latestPreviewJpeg.length,
        'Cache-Control': 'no-store'
      });
      res.end(latestPreviewJpeg);
    } else {
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': EMPTY_PIXEL_PNG.length,
        'Cache-Control': 'no-store'
      });
      res.end(EMPTY_PIXEL_PNG);
    }
    return;
  }

  if (req.method === 'GET' && cleanUrl === '/line-status') {
    studioState.lines = getLineBankStatus();
    studioState.lanIp = getLanIp();
    return sendJson(res, 200, { ok: true, lines: studioState.lines, state: studioState });
  }

  if (req.method === 'GET' && cleanUrl === '/speech-live') {
    req.resume();
    return sendJson(res, 200, {
      ok: true,
      interim: liveSpeechState.interim,
      lines: liveSpeechState.lines,
      seq: liveSpeechState.seq
    });
  }

  if (req.method === 'POST' && cleanUrl === '/speech-reset') {
    req.resume();
    resetNativeLiveSpeechState();
    return sendJson(res, 200, { ok: true, seq: liveSpeechState.seq });
  }

  if (req.method === 'POST' && cleanUrl === '/speech-start') {
    req.resume();
    resetNativeLiveSpeechState();
    startNativeLiveSpeechWorker();
    return sendJson(res, 200, { ok: true, seq: liveSpeechState.seq });
  }

  if (req.method === 'POST' && cleanUrl === '/speech-stop') {
    req.resume();
    stopNativeLiveSpeechWorker();
    return sendJson(res, 200, { ok: true, seq: liveSpeechState.seq });
  }

  if (req.method === 'POST' && cleanUrl === '/speech-chunk') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 200) {
        return sendJson(res, 200, {
          ok: true,
          interim: liveSpeechState.interim,
          lines: liveSpeechState.lines,
          seq: liveSpeechState.seq
        });
      }
      const chunkPath = path.join(scratchDir, `live_chunk_${Date.now()}.webm`);
      try {
        fs.writeFileSync(chunkPath, buf);
      } catch (e) {
        return sendJson(res, 200, {
          ok: true,
          interim: liveSpeechState.interim,
          lines: liveSpeechState.lines,
          seq: liveSpeechState.seq
        });
      }
      transcribeAudioFileWithWindowsSpeech(chunkPath, (wavLines) => {
        try { fs.unlinkSync(chunkPath); } catch (e) {}
        if (Array.isArray(wavLines) && wavLines.length > 0) {
          liveSpeechState.lines = wavLines;
          liveSpeechState.interim = '';
          liveSpeechState.seq++;
        }
        return sendJson(res, 200, {
          ok: true,
          interim: liveSpeechState.interim,
          lines: liveSpeechState.lines,
          seq: liveSpeechState.seq
        });
      });
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/save-take') {
    stopNativeLiveSpeechWorker();
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ts = Date.now();
      const mode = req.headers['x-mode'] || 'full';
      const elapsed = Number(req.headers['x-elapsed'] || 0);
      const words = Number(req.headers['x-words'] || 85);
      const preset = req.headers['x-preset'] || 'auto';
      const trimSilence = req.headers['x-trim'] !== '0';
      const coldOpenTrim = req.headers['x-cold-open'] !== '0';
      const dynamicZoom = req.headers['x-dynamic-zoom'] === '1';
      const musicBed = req.headers['x-music-bed'] === '1';
      const avDelayMs = Number(req.headers['x-av-delay-ms'] || 0);
      const colorCaptions = req.headers['x-color-captions'] !== '0';
      const lensPolish = req.headers['x-lens-polish'] !== '0';
      const viralSfx = req.headers['x-viral-sfx'] === '1';
      const abBadgeMode = req.headers['x-ab-badge'] || 'off';
      const fontTheme = req.headers['x-font-theme'] || studioState.fontTheme || 'classic_poppins';
      const fontCase = req.headers['x-font-case'] || studioState.fontCase || 'default';
      const fontBacking = req.headers['x-font-backing'] || studioState.fontBacking || 'default';
      const fontScale = Number(req.headers['x-font-scale'] || studioState.fontScale || 100);
      studioState.fontTheme = fontTheme;
      studioState.fontCase = fontCase;
      studioState.fontBacking = fontBacking;
      studioState.fontScale = fontScale;
      const burnCaptions = req.headers['x-captions'] !== '0';
      const burnHookBanner = req.headers['x-burn-hook'] !== '0';
      const hookMode = req.headers['x-hook-mode'] || 'auto';
      const rawHookHeader = decodeURIComponent(req.headers['x-hook-banner'] || '').trim();
      const hookBannerX = Number(req.headers['x-hook-x'] || studioState.hookBannerX || 540);
      const hookBannerY = Number(req.headers['x-hook-y'] || studioState.hookBannerY || 335);
      const visualFormat = req.headers['x-format'] || studioState.visualFormat || 'illustration';
      const wpm = elapsed > 0 ? Math.round((words / elapsed) * 60) : 0;

      // Always clear any previous take's transcript before processing a new take
      studioState.freeRecordLines = [];
      studioState.lastWhisperPhrases = [];

      let freeLines = [];
      try {
        const rawFree = req.headers['x-free-lines'];
        if (rawFree) {
          const parsed = JSON.parse(decodeURIComponent(rawFree));
          if (Array.isArray(parsed)) freeLines = parsed.filter(Boolean);
        }
      } catch (e) {}

      // If client-side speech recognition returned empty (e.g. inside standalone Electron),
      // use the native Windows live speech buffer captured during the take
      if (mode === 'free' && freeLines.length === 0) {
        const liveCaptured = [
          ...liveSpeechState.lines,
          liveSpeechState.interim ? liveSpeechState.interim.trim() : ''
        ].filter(Boolean);
        if (liveCaptured.length > 0) {
          freeLines = liveCaptured;
        }
      }

      if (buf.length > 100) {
        fs.writeFileSync(path.join(scratchDir, 'latest_take.webm'), buf);
        fs.writeFileSync(path.join(scratchDir, `take_${ts}.webm`), buf);
        if (/^\d+$/.test(String(mode))) {
          fs.writeFileSync(path.join(scratchDir, `line_${mode}.webm`), buf);
        }
      }

      const finalizeTakeMastering = (resolvedFreeLines) => {
        freeLines = Array.isArray(resolvedFreeLines) ? resolvedFreeLines.filter(Boolean) : [];
        if (mode === 'free') {
          studioState.freeRecordLines = freeLines;
        }

        activeVaultFile = null;
        const linesForAnalysis = mode === 'free'
          ? freeLines.map((t) => ({ text: t }))
          : SCRIPT_LINES;
        const analyzed = analyzeVideoContentForHook(linesForAnalysis);
        const hookBannerText = (hookMode === 'manual' && rawHookHeader) ? rawHookHeader : analyzed.primaryHook;
        studioState.hookBannerText = hookBannerText;
        studioState.hookBannerX = hookBannerX;
        studioState.hookBannerY = hookBannerY;
        studioState.hookSuggestions = analyzed.suggestions;

        const meta = {
          timestamp: new Date().toISOString(),
          mode,
          visualFormat,
          episodeId: currentEpisodeId,
          elapsedSeconds: elapsed,
          wordCount: words,
          wpm,
          preset,
          trimSilence,
          coldOpenTrim,
          dynamicZoom,
          musicBed,
          avDelayMs,
          burnCaptions,
          burnHookBanner,
          hookMode,
          hookBannerText,
          hookBannerX,
          hookBannerY,
          freeLines,
          hookSuggestions: analyzed.suggestions,
          hasMedia: buf.length > 100,
          bytes: buf.length
        };

        fs.writeFileSync(path.join(scratchDir, 'latest_take_meta.json'), JSON.stringify(meta, null, 2));
        if (buf.length > 100) {
          processSingleTake(
            {
              inFile: 'latest_take.webm',
              outFile: 'latest_take_mastered.mp4',
              preset,
              trimSilence,
              coldOpenTrim,
              dynamicZoom,
              musicBed,
              avDelayMs,
              colorCaptions,
              lensPolish,
              viralSfx,
              abBadgeMode,
              fontTheme,
              fontCase,
              fontBacking,
              fontScale,
              burnCaptions,
              burnHookBanner,
              hookBannerText,
              hookBannerX,
              hookBannerY,
              saveToVault: true,
              mode,
              freeLines,
              visualFormat
            },
            (err, mp4Url, finalDur, audioProfile) => {
              return sendJson(res, 200, {
                ok: true,
                meta,
                freeLines,
                masteredMp4: err ? null : mp4Url,
                finalDuration: finalDur || elapsed,
                generatedHook: hookBannerText,
                hookSuggestions: analyzed.suggestions,
                audioProfile: audioProfile || AUTO_AUDIO_PROFILE,
                takeHistory: TAKE_HISTORY,
                lines: getLineBankStatus()
              });
            }
          );
          return;
        }
        return sendJson(res, 200, {
          ok: true,
          meta,
          freeLines,
          generatedHook: hookBannerText,
          hookSuggestions: analyzed.suggestions,
          takeHistory: TAKE_HISTORY,
          lines: getLineBankStatus()
        });
      };

      if (mode === 'free' && buf.length > 100) {
        transcribeAudioFileWithWindowsSpeech(path.join(scratchDir, 'latest_take.webm'), (wavLines) => {
          const wavWordCount = Array.isArray(wavLines) ? wavLines.join(' ').split(/\s+/).filter(Boolean).length : 0;
          const curWordCount = Array.isArray(freeLines) ? freeLines.join(' ').split(/\s+/).filter(Boolean).length : 0;
          finalizeTakeMastering(wavWordCount >= curWordCount && wavWordCount > 0 ? wavLines : freeLines);
        });
      } else {
        finalizeTakeMastering(freeLines);
      }
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/master-take') {
    req.resume();
    const preset = req.headers['x-preset'] || 'auto';
    const trimSilence = req.headers['x-trim'] !== '0';
    const coldOpenTrim = req.headers['x-cold-open'] !== '0';
    const dynamicZoom = req.headers['x-dynamic-zoom'] === '1';
    const musicBed = req.headers['x-music-bed'] === '1';
    const avDelayMs = Number(req.headers['x-av-delay-ms'] || 0);
    const colorCaptions = req.headers['x-color-captions'] !== '0';
    const lensPolish = req.headers['x-lens-polish'] !== '0';
    const viralSfx = req.headers['x-viral-sfx'] === '1';
    const abBadgeMode = req.headers['x-ab-badge'] || 'off';
    const fontTheme = req.headers['x-font-theme'] || studioState.fontTheme || 'classic_poppins';
    const fontCase = req.headers['x-font-case'] || studioState.fontCase || 'default';
    const fontBacking = req.headers['x-font-backing'] || studioState.fontBacking || 'default';
    const fontScale = Number(req.headers['x-font-scale'] || studioState.fontScale || 100);
    studioState.fontTheme = fontTheme;
    studioState.fontCase = fontCase;
    studioState.fontBacking = fontBacking;
    studioState.fontScale = fontScale;
    const burnCaptions = req.headers['x-captions'] !== '0';
    const burnHookBanner = req.headers['x-burn-hook'] !== '0';
    const hookMode = req.headers['x-hook-mode'] || 'manual';
    const rawHookHeader = decodeURIComponent(req.headers['x-hook-banner'] || '').trim();
    const hookBannerX = Number(req.headers['x-hook-x'] || studioState.hookBannerX || 540);
    const hookBannerY = Number(req.headers['x-hook-y'] || studioState.hookBannerY || 335);
    const mode = req.headers['x-mode'] || 'full';
    const visualFormat = req.headers['x-format'] || studioState.visualFormat || 'illustration';

    const hasFreeHeader = typeof req.headers['x-free-lines'] !== 'undefined';
    let freeLines = hasFreeHeader ? [] : (studioState.freeRecordLines || []);
    try {
      const rawFree = req.headers['x-free-lines'];
      if (rawFree) {
        const parsed = JSON.parse(decodeURIComponent(rawFree));
        if (Array.isArray(parsed)) freeLines = parsed.filter(Boolean);
      }
    } catch (e) {}

    const runMasterTakeWithLines = (resolvedLines) => {
      freeLines = Array.isArray(resolvedLines) ? resolvedLines.filter(Boolean) : [];
      if (mode === 'free') {
        studioState.freeRecordLines = freeLines;
      }
      const linesForAnalysis = (mode === 'free' && !activeVaultFile)
        ? freeLines.map((t) => ({ text: t }))
        : getActiveTranscriptForHookAnalysis();
      const analyzed = analyzeVideoContentForHook(linesForAnalysis);
      const hookBannerText = (hookMode === 'auto' && !rawHookHeader) ? analyzed.primaryHook : (rawHookHeader || analyzed.primaryHook);
      studioState.hookBannerText = hookBannerText;
      studioState.hookBannerX = hookBannerX;
      studioState.hookBannerY = hookBannerY;
      studioState.hookSuggestions = analyzed.suggestions;

      const forceIllustration = visualFormat === 'illustration' && req.headers['x-use-active'] === '0';
      if (!forceIllustration && activeVaultFile && ARCHIVED_VAULT_SOURCES[activeVaultFile]) {
        burnCleanMp4WithPhrases(
          {
            vaultKey: activeVaultFile,
            preset,
            burnCaptions,
            burnHookBanner,
            hookBannerText,
            hookBannerX,
            hookBannerY,
            musicBed,
            dynamicZoom,
            avDelayMs,
            colorCaptions,
            lensPolish,
            viralSfx,
            abBadgeMode,
            fontTheme,
            fontCase,
            fontBacking,
            fontScale
          },
          (err, mp4Url, finalDur) => {
            return sendJson(res, err ? 500 : 200, {
              ok: !err,
              freeLines,
              masteredMp4: mp4Url || null,
              finalDuration: finalDur || null,
              generatedHook: hookBannerText,
              hookSuggestions: analyzed.suggestions,
              takeHistory: TAKE_HISTORY,
              error: err ? 'Could not master take.' : null,
              lines: getLineBankStatus()
            });
          }
        );
        return;
      }

      processSingleTake(
        {
          inFile: 'latest_take.webm',
          outFile: 'latest_take_mastered.mp4',
          preset,
          trimSilence,
          coldOpenTrim,
          dynamicZoom,
          musicBed,
          avDelayMs,
          colorCaptions,
          lensPolish,
          viralSfx,
          abBadgeMode,
          fontTheme,
          fontCase,
          fontBacking,
          fontScale,
          burnCaptions,
          burnHookBanner,
          hookBannerText,
          hookBannerX,
          hookBannerY,
          saveToVault: false,
          mode,
          freeLines,
          visualFormat
        },
        (err, mp4Url, finalDur, audioProfile) => {
          return sendJson(res, err ? 500 : 200, {
            ok: !err,
            freeLines,
            masteredMp4: mp4Url || null,
            finalDuration: finalDur || null,
            generatedHook: hookBannerText,
            hookSuggestions: analyzed.suggestions,
            audioProfile: audioProfile || AUTO_AUDIO_PROFILE,
            takeHistory: TAKE_HISTORY,
            error: err ? 'Could not master take — please record a voiceover take first.' : null,
            lines: getLineBankStatus()
          });
        }
      );
    };

    if (mode === 'free' && !hasFreeHeader && freeLines.length === 0 && !activeVaultFile && fs.existsSync(path.join(scratchDir, 'latest_take.webm'))) {
      transcribeAudioFileWithWindowsSpeech(path.join(scratchDir, 'latest_take.webm'), (wavLines) => {
        runMasterTakeWithLines(wavLines);
      });
    } else {
      runMasterTakeWithLines(freeLines);
    }
    return;
  }


  if (req.method === 'POST' && cleanUrl === '/import-video') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (!buf || buf.length < 100) {
        return sendJson(res, 400, { ok: false, error: 'Empty video file' });
      }
      const rawName = decodeURIComponent(req.headers['x-filename'] || 'imported_clip.mp4');
      const ext = path.extname(rawName).toLowerCase() || '.mp4';
      const safeExt = ['.mp4', '.mov', '.webm', '.mkv'].includes(ext) ? ext : '.mp4';
      const importedFile = `imported_source${safeExt}`;
      const fullImported = path.join(scratchDir, importedFile);
      fs.writeFileSync(fullImported, buf);
      // Also copy to latest_take.webm so subsequent Re-Master calls work seamlessly
      try {
        fs.copyFileSync(fullImported, path.join(scratchDir, 'latest_take.webm'));
      } catch (e) {}

      activeVaultFile = null;
      studioState.freeRecordLines = [];
      studioState.lastWhisperPhrases = [];
      const preset = req.headers['x-preset'] || 'auto';
      const trimSilence = req.headers['x-trim'] !== '0';
      const coldOpenTrim = req.headers['x-cold-open'] !== '0';
      const dynamicZoom = req.headers['x-dynamic-zoom'] === '1';
      const musicBed = req.headers['x-music-bed'] === '1';
      const avDelayMs = Number(req.headers['x-av-delay-ms'] || 0);
      const burnCaptions = req.headers['x-captions'] !== '0';
      const burnHookBanner = req.headers['x-burn-hook'] !== '0';
      const rawHookHeader = decodeURIComponent(req.headers['x-hook-banner'] || '').trim();
      const hookBannerX = Number(req.headers['x-hook-x'] || studioState.hookBannerX || 540);
      const hookBannerY = Number(req.headers['x-hook-y'] || studioState.hookBannerY || 335);

      transcribeAudioFileWithWindowsSpeech(fullImported, (wavLines) => {
        const freeLines = Array.isArray(wavLines) ? wavLines.filter(Boolean) : [];
        studioState.freeRecordLines = freeLines;
        const analyzed = analyzeVideoContentForHook(freeLines.map((t) => ({ text: t })));
        const hookBannerText = rawHookHeader || analyzed.primaryHook || '';
        studioState.hookBannerText = hookBannerText;
        studioState.hookSuggestions = analyzed.suggestions;

        processSingleTake(
          {
            inFile: importedFile,
            outFile: 'latest_take_mastered.mp4',
            preset,
            trimSilence,
            coldOpenTrim,
            dynamicZoom,
            musicBed,
            avDelayMs,
            burnCaptions,
            burnHookBanner,
            hookBannerText,
            hookBannerX,
            hookBannerY,
            saveToVault: true,
            mode: 'free',
            freeLines,
            visualFormat: 'webcam'
          },
          (err, mp4Url, finalDur) => {
            return sendJson(res, err ? 500 : 200, {
              ok: !err,
              freeLines,
              masteredMp4: mp4Url || null,
              finalDuration: finalDur || null,
              generatedHook: hookBannerText,
              hookSuggestions: analyzed.suggestions,
              takeHistory: TAKE_HISTORY,
              error: err ? String(err.message || err) : null
            });
          }
        );
      });
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/stitch-lines') {
    req.resume();
    const preset = req.headers['x-preset'] || 'studio';
    const trimSilence = req.headers['x-trim'] !== '0';
    const burnCaptions = req.headers['x-captions'] !== '0';
    const burnHookBanner = req.headers['x-burn-hook'] !== '0';
    const hookBannerText = decodeURIComponent(req.headers['x-hook-banner'] || studioState.hookBannerText || '').trim();
    const hookBannerX = Number(req.headers['x-hook-x'] || studioState.hookBannerX || 540);
    const hookBannerY = Number(req.headers['x-hook-y'] || studioState.hookBannerY || 335);
    const visualFormat = req.headers['x-format'] || studioState.visualFormat || 'webcam';
    stitchAllFiveLines({ preset, trimSilence, burnCaptions, burnHookBanner, hookBannerText, hookBannerX, hookBannerY, visualFormat }, (err, mp4Url, finalDur) => {
      return sendJson(res, err ? 400 : 200, {
        ok: !err,
        masteredMp4: mp4Url || null,
        finalDuration: finalDur || null,
        error: err ? 'Stitch failed — ensure Lines L1–L5 are all recorded.' : null,
        lines: getLineBankStatus()
      });
    });
    return;
  }

  if (req.method === 'POST' && cleanUrl === '/upload-bg') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (!buf || buf.length < 64) {
        return sendJson(res, 400, { ok: false, error: 'Empty image buffer' });
      }
      const customBgPath = path.join(scratchDir, 'custom_bg.img');
      try {
        fs.writeFileSync(customBgPath, buf);
        return sendJson(res, 200, { ok: true, url: `/bg/custom?t=${Date.now()}` });
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: 'Failed to save custom background' });
      }
    });
    return;
  }

  if (cleanUrl === '/bg/custom') {
    req.resume();
    const customBgPath = path.join(scratchDir, 'custom_bg.img');
    const targetPath = fs.existsSync(customBgPath) ? customBgPath : path.join(imgRoot, 'studio.jpg');
    if (fs.existsSync(targetPath)) {
      const data = fs.readFileSync(targetPath);
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': data.length,
        'Cache-Control': 'no-store',
        'Connection': 'close'
      });
      res.end(data);
      return;
    }
  }

  if (BG_MAP[cleanUrl] && fs.existsSync(BG_MAP[cleanUrl])) {
    req.resume();
    const data = fs.readFileSync(BG_MAP[cleanUrl]);
    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Length': data.length,
      'Connection': 'close'
    });
    res.end(data);
    return;
  }

  
  if (cleanUrl.startsWith('/fonts/')) {
    req.resume();
    const file = path.basename(cleanUrl);
    const full = path.join(scratchDir, 'fonts', file);
    if (fs.existsSync(full)) {
      const ext = path.extname(full).toLowerCase();
      const data = fs.readFileSync(full);
      res.writeHead(200, {
        'Content-Type': MIME_MAP[ext] || 'font/ttf',
        'Content-Length': data.length,
        'Cache-Control': 'public, max-age=86400',
        'Connection': 'close'
      });
      res.end(data);
      return;
    }
  }

  if (cleanUrl.startsWith('/mediapipe/')) {
    req.resume();
    const file = path.basename(cleanUrl);
    const full = path.join(mpDir, file);
    if (fs.existsSync(full)) {
      const ext = path.extname(full);
      const data = fs.readFileSync(full);
      res.writeHead(200, {
        'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
        'Content-Length': data.length,
        'Connection': 'close'
      });
      res.end(data);
      return;
    }
  }

  if (cleanUrl.startsWith('/takes/')) {
    req.resume();
    const file = path.basename(cleanUrl);
    const full = path.join(scratchDir, file);
    if (fs.existsSync(full)) {
      const ext = path.extname(full);
      const stat = fs.statSync(full);
      const total = stat.size;
      const mime = MIME_MAP[ext] || 'video/mp4';
      const range = req.headers.range;
      if (range && !req.url.includes('download=1')) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10) || 0;
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunkLen = Math.max(0, end - start + 1);
        const buf = Buffer.alloc(chunkLen);
        const fd = fs.openSync(full, 'r');
        fs.readSync(fd, buf, 0, chunkLen, start);
        fs.closeSync(fd);
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkLen,
          'Content-Type': mime,
          'Connection': 'close'
        });
        res.end(buf);
        return;
      }
      const data = fs.readFileSync(full);
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': data.length,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': req.url.includes('download=1') ? `attachment; filename="${file}"` : 'inline',
        'Connection': 'close'
      });
      res.end(data);
      return;
    }
  }

  req.resume();
  const htmlBuf = fs.readFileSync(htmlPath);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': htmlBuf.length,
    'Cache-Control': 'no-store',
    'Connection': 'close'
  });
  res.end(htmlBuf);
});

server.listen(3100, '0.0.0.0', () => {
  console.log(`Creator Academy 2D Illustration & Teleprompter Studio listening on http://localhost:3100 (LAN: http://${getLanIp()}:3100)`);
});

function shutdownStudioServer() {
  stopNativeLiveSpeechWorker();
  if (warmWavSpeechWorker) {
    try { warmWavSpeechWorker.kill('SIGTERM'); } catch (e) {}
    warmWavSpeechWorker = null;
  }
  try { server.close(); } catch (e) {}
}

module.exports = { server, shutdownStudioServer };
