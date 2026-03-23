/* ═══ Utility Functions & Constants ═══ */

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

// Score colors for 0-5 scale
const SCORE_COLORS = [
  'transparent',                    // 0 - No match
  'rgba(255,255,255,0.08)',         // 1 - Minimal
  'rgba(66,153,225,0.3)',           // 2 - Tangential
  'rgba(66,153,225,0.6)',           // 3 - Moderate
  'rgba(255,130,0,0.6)',            // 4 - Strong
  'rgba(255,130,0,0.9)',            // 5 - Expert
];

const SCORE_BG = [
  'transparent',
  'rgba(255,255,255,0.06)',
  'rgba(66,153,225,0.15)',
  'rgba(66,153,225,0.25)',
  'rgba(255,130,0,0.2)',
  'rgba(255,130,0,0.35)',
];

const SCORE_TEXT = [
  'rgba(255,255,255,0.2)',
  'rgba(255,255,255,0.4)',
  'rgba(66,153,225,0.9)',
  '#4299E1',
  '#FF8200',
  '#FFB547',
];

const SCORE_LABELS = ['No Match','Minimal','Tangential','Moderate','Strong','Expert'];

const TIER_COLORS = {
  'AAII Affiliated': { bg: 'rgba(11,197,234,0.15)', color: '#0BC5EA', border: 'rgba(11,197,234,0.3)' },
  'Recommended': { bg: 'rgba(123,97,255,0.15)', color: '#7B61FF', border: 'rgba(123,97,255,0.3)' }
};

const TIER_AVATAR = {
  'AAII Affiliated': 'linear-gradient(135deg,#0952A5,#0BC5EA)',
  'Recommended': 'linear-gradient(135deg,#7B61FF,#0BC5EA)'
};

// SVG Icons
const ICONS = {
  target: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  grid: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  bulb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>',
  clipboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  layers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  zap: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
  book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
};

// Helper: get initials from name
function getInitials(name) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// Helper: truncate text
function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.substring(0, len) + '...' : text;
}

// Helper: format number
function fmtNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// Helper: create score badge
function scoreBadge(score, label) {
  const s = Math.round(score);
  return `<span class="score-chip" style="background:${SCORE_BG[s]||SCORE_BG[0]};color:${SCORE_TEXT[s]||SCORE_TEXT[0]}">${label ? label + ': ' : ''}${s}</span>`;
}

// Helper: create tier badge
function tierBadge(tier) {
  const t = TIER_COLORS[tier] || TIER_COLORS['Recommended'];
  return `<span class="badge" style="background:${t.bg};color:${t.color};border:1px solid ${t.border}">${tier}</span>`;
}

// Gradient colors for charts
const CHART_GRADIENTS = [
  '#FF8200','#F0932B','#E1A341','#0BC5EA','#4299E1',
  '#7B61FF','#01B574','#38B2AC','#ED64A6','#F6AD55'
];
