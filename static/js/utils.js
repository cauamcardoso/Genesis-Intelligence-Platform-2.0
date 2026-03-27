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
  map: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  compass: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  key: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
  globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  fileText: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
};

// Helper: get initials from name
function getInitials(name) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// Helper: expandable text block (shows first N chars with Read more toggle)
function expandableText(text, maxLen = 200, id) {
  if (!text || text.length <= maxLen) return text || '';
  const eid = id || 'et-' + Math.random().toString(36).slice(2, 8);
  return `<span id="${eid}"><span class="et-short">${text.substring(0, maxLen)}... <a onclick="document.getElementById('${eid}').classList.add('et-open')" style="color:var(--accent);cursor:pointer;font-weight:600;font-size:10px">Read more</a></span><span class="et-full" style="display:none">${text} <a onclick="document.getElementById('${eid}').classList.remove('et-open')" style="color:var(--accent);cursor:pointer;font-weight:600;font-size:10px">Show less</a></span></span>`;
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

// Track badge helper
function trackBadge(track) {
  const TRACKS = {
    'aaii-led': { label: 'AAII-Led', cls: 'track-aaii-led' },
    'aaii-supported': { label: 'AAII-Supported', cls: 'track-aaii-supported' },
    'faculty-led': { label: 'Faculty-Led', cls: 'track-faculty-led' },
  };
  const t = TRACKS[track] || TRACKS['aaii-led'];
  return `<span class="track-badge ${t.cls}">${t.label}</span>`;
}

// Status badge helper
function statusBadge(status) {
  const STATUSES = {
    'draft': { label: 'Draft', cls: 'status-draft' },
    'ready': { label: 'Ready', cls: 'status-ready' },
    'shared': { label: 'Shared', cls: 'status-shared' },
  };
  const s = STATUSES[status] || STATUSES['draft'];
  return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}
