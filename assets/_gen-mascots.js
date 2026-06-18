/* Generates the full expression kit for nvurd / guru / adanana into assets/<char>/,
   mirroring munu's system: resting · happy · working · sleeping · asking + icon-16.
   Pure string/fs — run with `node`. */
const fs = require('fs')
const path = require('path')
const OUT = __dirname

const QMARK =
  'M8.09 -10.81 L7.86 -20.24 L12.46 -20.24 Q14.35 -20.24 15.45 -21.18 Q16.56 -22.12 16.56 -23.69 Q16.56 -25.30 15.43 -26.22 Q14.30 -27.14 12.42 -27.14 L4.83 -27.14 L4.83 -33.58 L11.96 -33.58 Q15.50 -33.58 18.08 -32.36 Q20.66 -31.14 22.06 -28.93 Q23.46 -26.72 23.46 -23.69 Q23.46 -20.79 22.26 -18.63 Q21.07 -16.47 18.90 -15.24 Q16.75 -14.03 13.84 -14.03 L13.84 -10.81 L8.09 -10.81 Z M10.31 0.23 Q8.74 0.23 7.80 -0.67 Q6.86 -1.57 6.86 -2.99 Q6.86 -4.46 7.80 -5.33 Q8.74 -6.21 10.31 -6.21 L11.69 -6.21 Q13.25 -6.21 14.19 -5.33 Q15.14 -4.46 15.14 -2.99 Q15.14 -1.52 14.19 -0.64 Q13.25 0.23 11.64 0.23 L10.31 0.23 Z'
const YN =
  'M3.70 2.20 L3.70 -16.60 L9.30 -16.60 L9.30 -14.30 L6.20 -14.30 L6.20 -0.10 L9.30 -0.10 L9.30 2.20 L3.70 2.20 Z M15.30 3.60 L16.86 -0.60 L12.72 -11.00 L15.36 -11.00 L17.48 -5.38 Q17.66 -4.88 17.84 -4.29 Q18.02 -3.70 18.10 -3.20 Q18.16 -3.70 18.33 -4.29 Q18.50 -4.88 18.68 -5.38 L20.64 -11.00 L23.28 -11.00 L17.92 3.60 L15.30 3.60 Z M25.20 2.20 L32.20 -16.60 L34.80 -16.60 L27.80 2.20 L25.20 2.20 Z M37.54 -0.00 L37.54 -11.00 L39.98 -11.00 L39.98 -8.94 Q40.18 -9.98 40.96 -10.59 Q41.74 -11.20 42.94 -11.20 Q44.56 -11.20 45.53 -10.12 Q46.50 -9.04 46.50 -7.22 L46.50 -0.00 L44.00 -0.00 L44.00 -6.92 Q44.00 -7.94 43.47 -8.49 Q42.94 -9.04 42.04 -9.04 Q41.10 -9.04 40.57 -8.48 Q40.04 -7.92 40.04 -6.88 L40.04 -0.00 L37.54 -0.00 Z M50.70 2.20 L50.70 -0.10 L53.80 -0.10 L53.80 -14.30 L50.70 -14.30 L50.70 -16.60 L56.30 -16.60 L56.30 2.20 L50.70 2.20 Z'

const star = (cx, cy, s, col) =>
  `<path d="M${cx} ${cy - 9 * s} C${cx + 2.6 * s} ${cy - 4 * s} ${cx + 2.6 * s} ${cy - 4 * s} ${cx + 7 * s} ${cy} C${cx + 2.6 * s} ${cy + 4 * s} ${cx + 2.6 * s} ${cy + 4 * s} ${cx} ${cy + 9 * s} C${cx - 2.6 * s} ${cy + 4 * s} ${cx - 2.6 * s} ${cy + 4 * s} ${cx - 7 * s} ${cy} C${cx - 2.6 * s} ${cy - 4 * s} ${cx - 2.6 * s} ${cy - 4 * s} ${cx} ${cy - 9 * s} Z" fill="${col}"/>`

// ---- characters -----------------------------------------------------------
const chars = {
  nvurd: {
    p: 'nv',
    accent: '#e07bc6',
    eye: ['#f6c2e9', '#e07bc6', '#b8458f'],
    eyeL: '#f6c2e9',
    glow: '#e07bc6',
    glowOp: 0.22,
    screen: ['#1f1b24', '#15131a', '#0d0c0f'],
    bevel: ['#473a47', '#241f29'],
    feetFill: '#161318',
    glowCy: 120,
    feet: [{ x: 100, y: 170 }, { x: 136, y: 170 }],
    feetW: 20, feetH: 32, feetRx: 10,
    body: { x: 59, y: 58, w: 138, h: 124, rx: 40 },
    sheen: { x: 73, y: 68, w: 110, h: 40, rx: 20 },
    shadow: { cx: 128, cy: 188, rx: 60, ry: 14 },
    eyes: { x1: 90, x2: 132, y: 94, w: 34, h: 46, rx: 16 },
    hl: [{ cx: 100, cy: 106 }, { cx: 142, cy: 106 }], hlr: 7,
    mouthCx: 128, smileY: 154, uy: 150, cursorY: 150, mw: 8, smirk: false,
    extraDefs: (p) =>
      `<linearGradient id="bow${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f29ad6"/><stop offset="1" stop-color="#cf5ca8"/></linearGradient>`,
    behind: '',
    under: (p) =>
      `<path d="M128 60 L93 51 Q83 60 93 69 Z" fill="url(#bow${p})"/><path d="M128 60 L163 51 Q173 60 163 69 Z" fill="url(#bow${p})"/>` +
      `<path d="M100 55 Q96 60 100 65" fill="none" stroke="#b8458f" stroke-width="2" opacity="0.5"/><path d="M156 55 Q160 60 156 65" fill="none" stroke="#b8458f" stroke-width="2" opacity="0.5"/>` +
      `<circle cx="128" cy="60" r="8.5" fill="#cf5ca8"/><circle cx="125" cy="57" r="2.8" fill="#fff" opacity="0.55"/>` +
      `<ellipse cx="83" cy="146" rx="11" ry="6.5" fill="#f29ad6" opacity="0.45" filter="url(#soft${p})"/><ellipse cx="173" cy="146" rx="11" ry="6.5" fill="#f29ad6" opacity="0.45" filter="url(#soft${p})"/>`,
    over: () =>
      `<g stroke="#f6c2e9" stroke-width="3" stroke-linecap="round" fill="none"><path d="M92 96 l-7 -6"/><path d="M91 104 l-8 -3"/><path d="M164 96 l7 -6"/><path d="M165 104 l8 -3"/></g>`,
    brows: '',
    hasBrows: false
  },

  guru: {
    p: 'gu',
    accent: '#4ade80',
    eye: ['#9bf3b8', '#4ade80', '#2a9c57'],
    eyeL: '#9bf3b8',
    glow: '#4ade80',
    glowOp: 0.16,
    screen: ['#1b1b23', '#131319', '#0c0c0e'],
    bevel: ['#3d3d49', '#20202b'],
    feetFill: '#141419',
    glowCy: 118,
    feet: [{ x: 98, y: 182 }, { x: 136, y: 182 }],
    feetW: 22, feetH: 32, feetRx: 11,
    body: { x: 54, y: 54, w: 148, h: 138, rx: 42 },
    sheen: { x: 68, y: 64, w: 120, h: 40, rx: 24 },
    shadow: { cx: 128, cy: 198, rx: 62, ry: 14 },
    eyes: { x1: 94, x2: 136, y: 106, w: 26, h: 31, rx: 12 },
    hl: [{ cx: 101, cy: 113 }, { cx: 143, cy: 113 }], hlr: 5,
    mouthCx: 128, smileY: 158, uy: 151, cursorY: 150, mw: 6.5, smirk: true,
    extraDefs: (p) =>
      `<linearGradient id="hair${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34343f"/><stop offset="1" stop-color="#222229"/></linearGradient>` +
      `<linearGradient id="beard${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a47"/><stop offset="1" stop-color="#23232d"/></linearGradient>`,
    behind: (p) =>
      `<path d="M119 57 Q121 46 128 46 Q135 46 137 57 Z" fill="url(#hair${p})"/><ellipse cx="128" cy="36" rx="15" ry="13" fill="url(#hair${p})"/>` +
      `<ellipse cx="123" cy="32" rx="4" ry="3.4" fill="#4a4a58" opacity="0.7"/><ellipse cx="128" cy="50" rx="12" ry="4.4" fill="none" stroke="#4ade80" stroke-width="3" opacity="0.9"/>`,
    under: (p) =>
      `<path d="M60 90 Q60 61 87 57 Q108 53 128 54 Q148 53 169 57 Q196 61 196 90 Q186 74 158 69 Q128 65 98 69 Q70 74 60 90 Z" fill="url(#hair${p})"/>` +
      `<path d="M82 144 C82 170 98 187 128 189 C158 187 174 170 174 144 C167 157 150 160 128 160 C106 160 89 157 82 144 Z" fill="url(#beard${p})"/>` +
      `<path d="M82 144 C89 157 106 160 128 160 C150 160 167 157 174 144" fill="none" stroke="#54545f" stroke-width="1.6" opacity="0.55"/>` +
      `<path d="M119 150 Q104 147 95 153 Q108 161 123 151 Z" fill="#34343f"/><path d="M137 150 Q152 147 161 153 Q148 161 133 151 Z" fill="#34343f"/>`,
    over: () =>
      `<g fill="none" stroke="#c2c9d2" stroke-width="2.6"><rect x="84" y="101" width="44" height="40" rx="15"/><rect x="128" y="101" width="44" height="40" rx="15"/><path d="M122 110 q6 -4 12 0"/><path d="M84 108 L62 103"/><path d="M172 108 L194 103"/></g>`,
    brows: '<path d="M86 97 Q100 90 116 96" fill="none" stroke="#2f2f3a" stroke-width="6.5" stroke-linecap="round"/><path d="M140 92 Q154 86 168 92" fill="none" stroke="#2f2f3a" stroke-width="6.5" stroke-linecap="round"/>',
    browsRaised: '<path d="M86 92 Q100 84 116 90" fill="none" stroke="#2f2f3a" stroke-width="6.5" stroke-linecap="round"/><path d="M140 87 Q154 80 168 87" fill="none" stroke="#2f2f3a" stroke-width="6.5" stroke-linecap="round"/>',
    hasBrows: true
  },

  adanana: {
    p: 'ad',
    accent: '#fbbf24',
    eye: ['#ffe08a', '#fbbf24', '#d18a09'],
    eyeL: '#ffe08a',
    glow: '#fbbf24',
    glowOp: 0.18,
    screen: ['#221e18', '#161310', '#0e0c09'],
    bevel: ['#4a4334', '#26221a'],
    feetFill: '#171410',
    glowCy: 120,
    feet: [{ x: 96, y: 182 }, { x: 138, y: 182 }],
    feetW: 22, feetH: 32, feetRx: 11,
    body: { x: 58, y: 58, w: 140, h: 138, rx: 50 },
    sheen: { x: 72, y: 68, w: 112, h: 44, rx: 24 },
    shadow: { cx: 128, cy: 198, rx: 60, ry: 14 },
    eyes: { x1: 84, x2: 136, y: 104, w: 36, h: 48, rx: 17 },
    hl: [{ cx: 95, cy: 117 }, { cx: 147, cy: 117 }], hlr: 7.5,
    mouthCx: 128, smileY: 163, uy: 159, cursorY: 158, mw: 8.5, smirk: false,
    extraDefs: (p) =>
      `<linearGradient id="leaf${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ee79a"/><stop offset="1" stop-color="#2fa45f"/></linearGradient>`,
    behind: '',
    under: (p) =>
      `<path d="M128 58 C126 40 132 30 142 26 C140 38 138 50 128 58 Z" fill="url(#leaf${p})"/><path d="M128 58 C130 44 126 36 118 32 C120 42 122 52 128 58 Z" fill="url(#leaf${p})" opacity="0.9"/>` +
      `<ellipse cx="78" cy="156" rx="11" ry="6.5" fill="#ff9e6b" opacity="0.4" filter="url(#soft${p})"/><ellipse cx="178" cy="156" rx="11" ry="6.5" fill="#ff9e6b" opacity="0.4" filter="url(#soft${p})"/>`,
    over: () =>
      `<g stroke="#ffe08a" stroke-width="3" stroke-linecap="round" fill="none"><path d="M86 104 l-7 -6"/><path d="M85 112 l-8 -3"/><path d="M170 104 l7 -6"/><path d="M171 112 l8 -3"/></g>`,
    brows: '',
    hasBrows: false
  }
}

// ---- builders -------------------------------------------------------------
const defs = (c) => {
  const p = c.p
  return (
    `<defs>` +
    `<radialGradient id="glow${p}" cx="50%" cy="47%" r="56%"><stop offset="0" stop-color="${c.glow}" stop-opacity="${c.glowOp}"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="screen${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.screen[0]}"/><stop offset="0.5" stop-color="${c.screen[1]}"/><stop offset="1" stop-color="${c.screen[2]}"/></linearGradient>` +
    `<linearGradient id="bevel${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bevel[0]}"/><stop offset="1" stop-color="${c.bevel[1]}"/></linearGradient>` +
    `<linearGradient id="sheen${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="eye${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.eye[0]}"/><stop offset="0.5" stop-color="${c.eye[1]}"/><stop offset="1" stop-color="${c.eye[2]}"/></linearGradient>` +
    `<radialGradient id="hl${p}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.92"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>` +
    `<filter id="soft${p}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>` +
    `<filter id="feather${p}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.1"/></filter>` +
    (c.extraDefs ? c.extraDefs(p) : '') +
    `</defs>`
  )
}

const frame = (c) => {
  const p = c.p
  const f = c.feet
    .map(
      (ft) =>
        `<rect x="${ft.x}" y="${ft.y}" width="${c.feetW}" height="${c.feetH}" rx="${c.feetRx}" fill="${c.feetFill}" stroke="url(#bevel${p})" stroke-width="2.5"/>`
    )
    .join('')
  return (
    `<circle cx="128" cy="${c.glowCy}" r="132" fill="url(#glow${p})"/>` +
    (c.behind ? c.behind(p) : '') +
    f +
    `<rect x="${c.body.x}" y="${c.body.y}" width="${c.body.w}" height="${c.body.h}" rx="${c.body.rx}" fill="url(#screen${p})" stroke="url(#bevel${p})" stroke-width="3"/>` +
    `<rect x="${c.sheen.x}" y="${c.sheen.y}" width="${c.sheen.w}" height="${c.sheen.h}" rx="${c.sheen.rx}" fill="url(#sheen${p})"/>` +
    `<ellipse cx="${c.shadow.cx}" cy="${c.shadow.cy}" rx="${c.shadow.rx}" ry="${c.shadow.ry}" fill="#000" opacity="0.22" filter="url(#soft${p})"/>`
  )
}

const eyeCenters = (c) => {
  const e = c.eyes
  return [
    { cx: e.x1 + e.w / 2, cy: e.y + e.h / 2, x: e.x1 },
    { cx: e.x2 + e.w / 2, cy: e.y + e.h / 2, x: e.x2 }
  ]
}

const eyesOpen = (c, work) => {
  const p = c.p, e = c.eyes
  const y = work ? e.y + 3 : e.y
  const h = work ? e.h - 7 : e.h
  let s = ''
  ;[e.x1, e.x2].forEach((x, i) => {
    s += `<rect x="${x}" y="${y}" width="${e.w}" height="${h}" rx="${e.rx}" fill="url(#eye${p})"/>`
    if (!work)
      s += `<path d="M${x + 6} ${y + h - 9} q${(e.w - 12) / 2} 7 ${e.w - 12} 0" fill="none" stroke="${c.eyeL}" stroke-width="2.4" opacity="0.4" filter="url(#feather${p})"/>`
    const hl = c.hl[i]
    s += `<circle cx="${hl.cx}" cy="${hl.cy}" r="${c.hlr}" fill="url(#hl${p})"/>`
    s += `<circle cx="${x + e.w * 0.72}" cy="${y + h * 0.66}" r="2.6" fill="#fff" opacity="0.5"/>`
  })
  return s
}

const eyesArc = (c, up) => {
  let s = ''
  eyeCenters(c).forEach((e) => {
    const a = Math.round(e.cx === e.cx ? c.eyes.w * 0.5 : 0)
    const sw = Math.max(5, Math.round(c.eyes.w * 0.22))
    if (up)
      s += `<path d="M${e.cx - a} ${e.cy + Math.round(a * 0.38)} Q${e.cx} ${e.cy - Math.round(a * 0.85)} ${e.cx + a} ${e.cy + Math.round(a * 0.38)}" fill="none" stroke="${c.accent}" stroke-width="${sw}" stroke-linecap="round"/>`
    else
      s += `<path d="M${e.cx - a} ${e.cy - 2} Q${e.cx} ${e.cy + Math.round(a * 0.72)} ${e.cx + a} ${e.cy - 2}" fill="none" stroke="${c.accent}" stroke-width="${sw}" stroke-linecap="round"/>`
  })
  return s
}

const smileGlow = (c) =>
  `<ellipse cx="${c.mouthCx}" cy="${c.smileY + 2}" rx="22" ry="7" fill="${c.accent}" opacity="0.14" filter="url(#soft${c.p})"/>`

const smile = (c, big) => {
  const cx = c.mouthCx, y = c.smileY, w = c.mw
  let d
  if (c.smirk)
    d = big
      ? `M${cx - 16} ${y + 1} Q${cx + 2} ${y + 15} ${cx + 18} ${y - 5}`
      : `M${cx - 14} ${y + 3} Q${cx + 2} ${y + 11} ${cx + 16} ${y - 3}`
  else
    d = big
      ? `M${cx - 18} ${y - 2} Q${cx} ${y + 18} ${cx + 18} ${y - 2}`
      : `M${cx - 14} ${y} Q${cx} ${y + 13} ${cx + 14} ${y}`
  return smileGlow(c) + `<path d="${d}" fill="none" stroke="${c.accent}" stroke-width="${w}" stroke-linecap="round"/>`
}

const underscore = (c) =>
  `<rect x="${c.mouthCx - 11}" y="${c.uy}" width="22" height="8" rx="4" fill="${c.accent}"/>`

const cursorBlock = (c) =>
  `<rect x="${c.mouthCx - 20}" y="${c.cursorY}" width="40" height="10" rx="5" fill="${c.accent}"><animate attributeName="opacity" values="1;1;1;1;0.1;1" keyTimes="0;0.55;0.7;0.78;0.86;1" dur="1.7s" repeatCount="indefinite"/></rect>`

const workingDots = (c) => {
  const cx = c.mouthCx, y = c.cursorY + 23
  return [0, 1, 2]
    .map(
      (i) =>
        `<circle cx="${cx - 20 + i * 20}" cy="${y}" r="4.6" fill="${c.eyeL}"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.5s" begin="${(i * 0.22).toFixed(2)}s" repeatCount="indefinite"/></circle>`
    )
    .join('')
}

const sparkles = (c) => star(72, 84, 1, c.eyeL) + star(186, 76, 0.85, c.eyeL)

const zzz = (c) =>
  `<path d="M168 96 h12 l-12 13 h12" stroke-width="3.4" fill="none" stroke="${c.eyeL}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="M188 78 h9 l-9 10 h9" stroke-width="2.8" fill="none" stroke="${c.eyeL}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>` +
  `<path d="M204 62 h7 l-7 8 h7" stroke-width="2.3" fill="none" stroke="${c.eyeL}" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`

const askBrowsGirl = (c) => {
  let s = ''
  eyeCenters(c).forEach((e) => {
    s += `<path d="M${e.cx - 13} ${c.eyes.y - 2} Q${e.cx} ${c.eyes.y - 10} ${e.cx + 13} ${c.eyes.y - 4}" fill="none" stroke="${c.accent}" stroke-width="5" stroke-linecap="round"/>`
  })
  return s
}

const askExtras = (c) =>
  `<circle cx="128" cy="${c.glowCy}" r="82" fill="none" stroke="#fbbf24" stroke-width="2.4" opacity="0"><animate attributeName="r" values="72;104" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.45;0" dur="2s" repeatCount="indefinite"/></circle>` +
  `<circle cx="128" cy="26" r="19" fill="#fbbf24" opacity="0.13" filter="url(#soft${c.p})"/>` +
  `<path d="${QMARK}" transform="translate(113.86,41.67)" fill="#fbbf24" fill-rule="evenodd"/>` +
  `<rect x="92" y="220" width="72" height="26" rx="8" fill="#0c0c0e" stroke="#26262e" stroke-width="2"/>` +
  `<path d="${YN}" transform="translate(98,239.5)" fill="${c.eyeL}" fill-rule="evenodd"/>`

const open = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img">`

const build = (c, kind) => {
  const u = c.under ? c.under(c.p) : ''
  const o = c.over ? c.over() : ''
  let body
  if (kind === 'resting')
    body = u + (c.hasBrows ? c.brows : '') + eyesOpen(c) + o + smile(c, false)
  else if (kind === 'happy')
    body = u + (c.hasBrows ? c.brows : '') + eyesArc(c, true) + o + smile(c, true) + sparkles(c)
  else if (kind === 'working')
    body = u + (c.hasBrows ? c.brows : '') + eyesOpen(c, true) + o + cursorBlock(c) + workingDots(c) + star(190, 72, 0.8, c.eyeL)
  else if (kind === 'sleeping')
    body = u + (c.hasBrows ? c.brows : '') + eyesArc(c, false) + o + underscore(c) + zzz(c)
  else if (kind === 'asking')
    body = u + (c.hasBrows ? c.browsRaised : askBrowsGirl(c)) + eyesOpen(c) + o + underscore(c) + askExtras(c)
  return open + defs(c) + frame(c) + body + `</svg>`
}

const icon16 = (c) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" role="img"><rect x="1" y="1" width="14" height="14" rx="4" fill="#0d0d0f" stroke="#3a3a46" stroke-width="1"/>` +
  `<rect x="5" y="6" width="2" height="3.4" rx="0.6" fill="${c.accent}"/><rect x="9" y="6" width="2" height="3.4" rx="0.6" fill="${c.accent}"/><rect x="5" y="11" width="6" height="2" rx="0.8" fill="${c.accent}"/></svg>`

const restingInner = (c) => {
  const u = c.under ? c.under(c.p) : ''
  const o = c.over ? c.over() : ''
  return frame(c) + u + (c.hasBrows ? c.brows : '') + eyesOpen(c) + o + smile(c, false)
}

const chip = (c) =>
  `<rect x="20" y="20" width="216" height="216" rx="52" fill="url(#screen${c.p})" stroke="url(#bevel${c.p})" stroke-width="4"/>` +
  `<rect x="36" y="32" width="184" height="60" rx="34" fill="url(#sheen${c.p})"/>` +
  `<ellipse cx="128" cy="206" rx="80" ry="16" fill="#000" opacity="0.20" filter="url(#soft${c.p})"/>`

const iconSVG = (c) => {
  const u = c.under ? c.under(c.p) : ''
  const o = c.over ? c.over() : ''
  const face = (c.behind ? c.behind(c.p) : '') + u + (c.hasBrows ? c.brows : '') + eyesOpen(c) + o + smile(c, false)
  return open + defs(c) + chip(c) + `<g transform="translate(128,132) scale(1.1) translate(-128,-120)">` + face + `</g></svg>`
}

const wordmarkSVG = (c, name) => {
  const charW = 40, fs = 60, tx = 150
  const cur = tx + name.length * charW + 8
  const w = cur + 40
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="150" viewBox="0 0 ${w} 150" role="img">` +
    defs(c) +
    `<g transform="translate(2,8) scale(0.52)">` + restingInner(c) + `</g>` +
    `<text x="${tx}" y="96" font-family="'JetBrains Mono','Cascadia Mono','SF Mono',monospace" font-size="${fs}" font-weight="800" letter-spacing="-1" fill="#e8e8ed">${name}</text>` +
    `<rect x="${cur}" y="50" width="20" height="46" rx="4" fill="${c.accent}"><animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.5;0.52;0.98;1" dur="1.3s" repeatCount="indefinite"/></rect>` +
    `</svg>`
  )
}

const KINDS = { resting: '', happy: '-happy', working: '-working', sleeping: '-sleeping', asking: '-asking' }

for (const name of Object.keys(chars)) {
  const c = chars[name]
  const dir = path.join(OUT, name)
  fs.mkdirSync(dir, { recursive: true })
  for (const [kind, suffix] of Object.entries(KINDS)) {
    fs.writeFileSync(path.join(dir, `${name}${suffix}.svg`), build(c, kind))
  }
  fs.writeFileSync(path.join(dir, `${name}-icon.svg`), iconSVG(c))
  fs.writeFileSync(path.join(dir, `${name}-icon-16.svg`), icon16(c))
  fs.writeFileSync(path.join(dir, `${name}-wordmark.svg`), wordmarkSVG(c, name))
  console.log('wrote', name)
}
