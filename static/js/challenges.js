/* ═══ Challenge Explorer Tab ═══ */

let _selectedChallenge = null;
let _selectedFA = null;

async function renderChallenges(container) {
  container.innerHTML = '<div class="loading">Loading challenges...</div>';
  const L = await DataStore.buildLookups();

  let html = `<div class="explorer-grid">`;

  // Left sidebar: challenge list
  html += `<div class="card ch-list">
    <div class="ch-list-title">${L.challenges.length} Challenges \u00B7 ${L.focusAreas.length} Focus Areas</div>`;

  for (const c of L.challenges) {
    const facCount = c.focus_areas.length;
    html += `<button class="ch-btn${_selectedChallenge === c.id ? ' active' : ''}" onclick="selectChallenge('${c.id}')">
      <span class="ch-code">${c.id}</span>
      <span class="ch-name-sm">${truncate(c.title, 45)}</span>
      <span class="ch-cnt" style="background:rgba(11,197,234,0.15);color:var(--cyan)">${facCount}</span>
    </button>`;
  }

  html += `</div>`;

  // Right panel: challenge detail
  html += `<div id="ch-detail">`;
  if (!_selectedChallenge) {
    _selectedChallenge = L.challenges[0].id;
  }
  html += renderChallengeDetail(L, _selectedChallenge);
  html += `</div>`;

  html += `</div>`;
  container.innerHTML = html;
}

function selectChallenge(cId) {
  _selectedChallenge = cId;
  _selectedFA = null;
  const L = DataStore._lookups;
  const detail = document.getElementById('ch-detail');
  if (detail && L) {
    detail.innerHTML = renderChallengeDetail(L, cId);
  }
  // Update sidebar active state
  document.querySelectorAll('.ch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.querySelector('.ch-code').textContent === cId);
  });
}

function selectFocusArea(faId) {
  _selectedFA = (_selectedFA === faId) ? null : faId;
  const L = DataStore._lookups;
  const detail = document.getElementById('ch-detail');
  if (detail && L) {
    detail.innerHTML = renderChallengeDetail(L, _selectedChallenge);
  }
}

function renderChallengeDetail(L, cId) {
  const c = L.challengeById[cId];
  if (!c) return '<p style="color:var(--text3)">Select a challenge</p>';

  let html = `<div class="card">
    <div class="ch-detail-head">
      <span class="code">${c.id}</span>
      <span class="title">${c.title}</span>
    </div>
    <div class="ch-detail-section">
      <h4>Participating Offices</h4>
      <p>${c.offices || 'N/A'}</p>
    </div>
    <div class="ch-detail-section">
      <h4>Focus Areas (${c.focus_areas.length})</h4>`;

  for (const fa of c.focus_areas) {
    const topFac = L.topFacultyByFA[fa.id] || [];
    const strongFac = topFac.filter(s => s.composite >= 3);
    const strongCount = strongFac.length;
    const isSelected = _selectedFA === fa.id;

    html += `<div class="fa-card${isSelected ? ' active' : ''}" onclick="selectFocusArea('${fa.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><span class="fa-card-id">${fa.id}</span><span class="fa-card-title">${fa.title}</span></div>
        <span class="badge" style="background:rgba(255,130,0,0.15);color:var(--accent);border:1px solid rgba(255,130,0,0.3)">${strongCount} match${strongCount !== 1 ? 'es' : ''}</span>
      </div>
      <div class="fa-card-desc" style="${isSelected ? '-webkit-line-clamp:none;overflow:visible' : ''}">${fa.description}</div>`;

    if (isSelected && strongFac.length > 0) {
      html += `<div style="margin-top:12px;border-top:1px solid var(--card-border);padding-top:10px">
        <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Faculty Matches (Composite >= 3)</div>`;

      for (const s of strongFac.slice(0, 15)) {
        const fac = L.facultyById[s.faculty_id];
        if (!fac) continue;
        const tc = TIER_COLORS[fac.tier] || TIER_COLORS['Recommended'];

        html += `<div class="fac-match-row">
          <span class="fac-match-id">${fac.name.split(' ').slice(-1)[0]}</span>
          <span style="font-size:10px;color:${tc.color};margin-right:4px">\u25CF</span>
          <span class="fac-match-title">${fac.name} - ${truncate(fac.department, 25)}</span>
          <div class="fac-match-scores">
            ${scoreBadge(s.faculty_fit, 'Fit')}
            ${scoreBadge(s.team_feasibility, 'Team')}
            ${scoreBadge(s.competitive_edge, 'Edge')}
            ${scoreBadge(s.partnership_readiness, 'Part')}
            <span class="score-chip" style="background:rgba(255,130,0,0.25);color:#FFB547;font-weight:800">\u03A3 ${s.composite}</span>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  html += `</div></div>`;
  return html;
}
