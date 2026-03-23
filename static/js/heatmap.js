/* ═══ Scoring Matrix (Heatmap) Tab ═══ */

let _hmChallenge = 'summary';
let _hmSort = 'score';
let _hmTierFilter = 'all';
let _hmTooltip = null;

async function renderHeatmap(container) {
  container.innerHTML = '<div class="loading">Loading scoring matrix...</div>';
  const L = await DataStore.buildLookups();

  let html = '';

  // Controls
  html += `<div class="card" style="margin-bottom:16px">
    <div class="card-title"><div class="icon" style="background:var(--grad-purple)">${ICONS.grid}</div>Scoring Matrix</div>
    <div class="hm-controls">
      <span class="hm-lbl">View:</span>
      <select class="hm-challenge-select" id="hm-challenge-sel" onchange="_hmChallenge=this.value;rebuildHeatmap()">
        <option value="summary"${_hmChallenge==='summary'?' selected':''}>Challenge Summary (21 columns)</option>`;

  for (const c of L.challenges) {
    html += `<option value="${c.id}"${_hmChallenge===c.id?' selected':''}>${c.id}: ${truncate(c.title, 50)} (${c.focus_areas.length} FAs)</option>`;
  }

  html += `</select>
      <div class="hm-sep"></div>
      <span class="hm-lbl">Sort:</span>
      <button class="hm-btn${_hmSort==='score'?' active-sort':''}" onclick="_hmSort='score';rebuildHeatmap()">By Score</button>
      <button class="hm-btn${_hmSort==='name'?' active-sort':''}" onclick="_hmSort='name';rebuildHeatmap()">By Name</button>
      <div class="hm-sep"></div>
      <span class="hm-lbl">Tier:</span>
      <button class="hm-btn${_hmTierFilter==='all'?' active-filter':''}" onclick="_hmTierFilter='all';rebuildHeatmap()">All</button>
      <button class="hm-btn${_hmTierFilter==='AAII Affiliated'?' active-filter':''}" onclick="_hmTierFilter='AAII Affiliated';rebuildHeatmap()">AAII</button>
      <button class="hm-btn${_hmTierFilter==='Recommended'?' active-filter':''}" onclick="_hmTierFilter='Recommended';rebuildHeatmap()">Recommended</button>
    </div>

    <div class="legend-row">`;
  for (let s = 0; s <= 5; s++) {
    html += `<div class="legend-item">
      <div class="legend-swatch" style="background:${SCORE_COLORS[s]};border:1px solid rgba(255,255,255,0.15)"></div>
      <span>${s} ${SCORE_LABELS[s]}</span>
    </div>`;
  }
  html += `</div>
  </div>`;

  html += `<div class="card" style="padding:8px"><div class="hm-wrap" id="hm-wrap"></div></div>`;

  container.innerHTML = html;

  // Tooltip element
  if (!_hmTooltip) {
    _hmTooltip = document.createElement('div');
    _hmTooltip.className = 'hm-tooltip';
    _hmTooltip.style.display = 'none';
    document.body.appendChild(_hmTooltip);
  }

  rebuildHeatmap();
}

function rebuildHeatmap() {
  const L = DataStore._lookups;
  if (!L) return;

  const wrap = document.getElementById('hm-wrap');
  if (!wrap) return;

  // Filter faculty
  let faculty = L.faculty.filter(f =>
    _hmTierFilter === 'all' || f.tier === _hmTierFilter
  );

  // Determine columns
  let columns = [];
  if (_hmChallenge === 'summary') {
    // One column per challenge, value = max composite across focus areas
    columns = L.challenges.map(c => ({
      id: c.id,
      label: c.id,
      title: c.title
    }));
  } else {
    // Focus areas within selected challenge
    const c = L.challengeById[_hmChallenge];
    if (c) {
      columns = c.focus_areas.map(fa => ({
        id: fa.id,
        label: fa.letter || fa.id.split('-')[1],
        title: fa.title
      }));
    }
  }

  // Build cell values
  const cellValues = {};  // `${fid}-${colId}` -> {composite, faculty_fit, ...}

  for (const f of faculty) {
    const fScores = L.scoresByFaculty[f.id] || [];

    for (const col of columns) {
      let cellScore;

      if (_hmChallenge === 'summary') {
        // Max composite across all focus areas in this challenge
        const challenge = L.challengeById[col.id];
        const faIds = new Set(challenge.focus_areas.map(fa => fa.id));
        const relevant = fScores.filter(s => faIds.has(s.focus_area_id));
        if (relevant.length > 0) {
          relevant.sort((a, b) => b.composite - a.composite);
          cellScore = relevant[0];
        }
      } else {
        cellScore = fScores.find(s => s.focus_area_id === col.id);
      }

      const key = `${f.id}-${col.id}`;
      cellValues[key] = cellScore || null;
    }
  }

  // Compute totals for sorting
  const facultyTotals = {};
  for (const f of faculty) {
    let total = 0;
    for (const col of columns) {
      const cv = cellValues[`${f.id}-${col.id}`];
      if (cv) total += cv.composite;
    }
    facultyTotals[f.id] = total;
  }

  // Sort faculty
  if (_hmSort === 'score') {
    faculty.sort((a, b) => (facultyTotals[b.id] || 0) - (facultyTotals[a.id] || 0));
  } else {
    faculty.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Filter out faculty with all zeros
  faculty = faculty.filter(f => (facultyTotals[f.id] || 0) > 0);

  // Build table HTML
  let html = '<table class="hm-table"><thead><tr>';
  html += '<th>Faculty</th>';
  for (const col of columns) {
    if (_hmChallenge === 'summary') {
      html += `<th title="${col.title}">${col.label}</th>`;
    } else {
      html += `<th title="${col.title}"><div class="th-label">${col.label}</div></th>`;
    }
  }
  html += '<th>Total</th></tr></thead><tbody>';

  for (const f of faculty) {
    const tc = TIER_COLORS[f.tier] || TIER_COLORS['Recommended'];
    html += `<tr><td style="background:var(--bg2)">
      <span class="hm-name">${f.name}</span>
      <span style="color:${tc.color};font-size:11px;margin-left:4px">\u25CF</span>
      <br/><span class="hm-dept">${truncate(f.department, 25)}</span>
    </td>`;

    const total = facultyTotals[f.id] || 0;

    for (const col of columns) {
      const cv = cellValues[`${f.id}-${col.id}`];
      const score = cv ? Math.round(cv.composite) : 0;
      const display = score > 0 ? score : '';
      const bg = SCORE_COLORS[Math.min(score, 5)];
      const color = SCORE_TEXT[Math.min(score, 5)];

      html += `<td><div class="hm-cell" style="background:${bg};color:${color}"
        data-fid="${f.id}" data-col="${col.id}"
        onmouseenter="showTooltip(event,${f.id},'${col.id}')"
        onmouseleave="hideTooltip()">${display}</div></td>`;
    }

    html += `<td class="hm-total" style="color:var(--accent)">${total.toFixed(1)}</td></tr>`;
  }

  html += '</tbody></table>';

  if (faculty.length === 0) {
    html = '<p style="color:var(--text3);padding:20px;text-align:center">No faculty with non-zero scores for this view.</p>';
  }

  wrap.innerHTML = html;
}

function showTooltip(event, fid, colId) {
  const L = DataStore._lookups;
  if (!L || !_hmTooltip) return;

  const fac = L.facultyById[fid];
  const fScores = L.scoresByFaculty[fid] || [];

  let title = '';
  let faLabel = '';
  let cellScore = null;

  if (_hmChallenge === 'summary') {
    const challenge = L.challengeById[colId];
    title = challenge ? challenge.title : colId;
    faLabel = colId;
    const faIds = new Set(challenge.focus_areas.map(fa => fa.id));
    const relevant = fScores.filter(s => faIds.has(s.focus_area_id));
    if (relevant.length > 0) {
      relevant.sort((a, b) => b.composite - a.composite);
      cellScore = relevant[0];
      faLabel = `Best: ${cellScore.focus_area_id}`;
    }
  } else {
    const fa = L.focusAreaById[colId];
    title = fa ? fa.title : colId;
    faLabel = colId;
    cellScore = fScores.find(s => s.focus_area_id === colId);
  }

  if (!cellScore) {
    _hmTooltip.style.display = 'none';
    return;
  }

  _hmTooltip.innerHTML = `
    <div class="tt-title">${fac ? fac.name : 'Faculty'}</div>
    <div class="tt-fa">${faLabel}: ${truncate(title, 50)}</div>
    <div class="tt-row"><span class="tt-label">Faculty Fit</span><span class="tt-value">${cellScore.faculty_fit}/5</span></div>
    <div class="tt-row"><span class="tt-label">Team Feasibility</span><span class="tt-value">${cellScore.team_feasibility}/5</span></div>
    <div class="tt-row"><span class="tt-label">Competitive Edge</span><span class="tt-value">${cellScore.competitive_edge}/5</span></div>
    <div class="tt-row"><span class="tt-label">Partnership Ready</span><span class="tt-value">${cellScore.partnership_readiness}/5</span></div>
    <div class="tt-row tt-composite"><span>Composite</span><span>${cellScore.composite}/5</span></div>`;

  _hmTooltip.style.display = 'block';

  const rect = event.target.getBoundingClientRect();
  let left = rect.right + 10;
  let top = rect.top - 30;

  if (left + 280 > window.innerWidth) left = rect.left - 290;
  if (top + 150 > window.innerHeight) top = window.innerHeight - 160;
  if (top < 0) top = 10;

  _hmTooltip.style.left = left + 'px';
  _hmTooltip.style.top = top + 'px';
}

function hideTooltip() {
  if (_hmTooltip) _hmTooltip.style.display = 'none';
}
