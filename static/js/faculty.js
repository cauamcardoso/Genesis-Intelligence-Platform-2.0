/* ═══ Faculty Explorer Tab ═══ */

let _facFilter = 'all';
let _facSearch = '';
let _facExpanded = null;

async function renderFaculty(container) {
  container.innerHTML = '<div class="loading">Loading faculty...</div>';
  const L = await DataStore.buildLookups();

  let html = '';

  // Search and filters
  html += `<input class="fac-search" type="text" placeholder="Search by name, department, or expertise..."
    value="${_facSearch}" oninput="_facSearch=this.value;renderFacultyCards();" id="fac-search-input"/>`;

  html += `<div class="filter-row">
    <span class="hm-lbl">Filter:</span>
    <button class="filter-btn${_facFilter==='all'?' active':''}" onclick="_facFilter='all';renderFacultyCards()">All (${L.stats.totalFaculty})</button>
    <button class="filter-btn${_facFilter==='AAII Affiliated'?' active':''}" onclick="_facFilter='AAII Affiliated';renderFacultyCards()">AAII Affiliated (${L.stats.aaiiCount})</button>
    <button class="filter-btn${_facFilter==='Recommended'?' active':''}" onclick="_facFilter='Recommended';renderFacultyCards()">Recommended (${L.stats.recCount})</button>
  </div>`;

  html += `<div id="fac-cards-container" class="fac-cards"></div>`;

  container.innerHTML = html;
  renderFacultyCards();
}

function renderFacultyCards() {
  const L = DataStore._lookups;
  if (!L) return;

  const container = document.getElementById('fac-cards-container');
  if (!container) return;

  const search = _facSearch.toLowerCase();

  let filtered = L.faculty.filter(f => {
    if (_facFilter !== 'all' && f.tier !== _facFilter) return false;
    if (search) {
      const searchText = (f.name + ' ' + f.department + ' ' +
        (f.expertise_keywords || []).join(' ') + ' ' + f.bio).toLowerCase();
      return searchText.includes(search);
    }
    return true;
  });

  // Sort by highest composite score descending
  filtered.sort((a, b) => {
    const aTop = (L.topMatchesByFaculty[a.id] || [])[0];
    const bTop = (L.topMatchesByFaculty[b.id] || [])[0];
    const aScore = aTop?.composite || 0;
    const bScore = bTop?.composite || 0;
    // Faculty with matches >= 3 come first
    const aStrong = aScore >= 3 ? 1 : 0;
    const bStrong = bScore >= 3 ? 1 : 0;
    if (aStrong !== bStrong) return bStrong - aStrong;
    return bScore - aScore;
  });

  let html = '';

  if (filtered.length === 0) {
    html = '<p style="color:var(--text3);padding:20px">No faculty match the current search criteria.</p>';
  }

  for (const f of filtered) {
    const tc = TIER_COLORS[f.tier] || TIER_COLORS['Recommended'];
    const allMatches = (L.topMatchesByFaculty[f.id] || []);
    const strongMatches = allMatches.filter(m => m.composite >= 3);
    const topMatches = strongMatches.slice(0, 6);
    const isExpanded = _facExpanded === f.id;
    const keywords = (f.expertise_keywords || []).slice(0, 5).join(', ');

    html += `<div class="card fac-card" onclick="toggleFaculty(${f.id})">
      <div class="fac-header">
        <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="fac-name">${f.name} ${tierBadge(f.tier)}</div>
          <div class="fac-dept">${f.department || 'Department N/A'}</div>
        </div>
      </div>`;

    if (keywords) {
      html += `<div class="fac-expertise">${truncate(keywords, 120)}</div>`;
    }

    // Top matches
    if (topMatches.length > 0) {
      html += `<div class="fac-matches">`;
      for (const m of topMatches) {
        const fa = L.focusAreaById[m.focus_area_id];
        html += `<span class="fac-chip" style="background:${SCORE_BG[Math.round(m.composite)]};color:${SCORE_TEXT[Math.round(m.composite)]}">${m.focus_area_id} (${m.composite})</span>`;
      }
      html += `</div>`;
    }

    // Expanded detail
    if (isExpanded) {
      html += `<div class="fac-detail">`;

      if (f.bio) {
        html += `<div class="fac-bio">${truncate(f.bio, 400)}</div>`;
      }

      if (f.scholar_metrics && Object.keys(f.scholar_metrics).length) {
        html += `<div class="fac-metrics">`;
        if (f.scholar_metrics.h_index) html += `<span class="fac-metric">h-index: <strong>${f.scholar_metrics.h_index}</strong></span>`;
        if (f.scholar_metrics.citations) html += `<span class="fac-metric">Citations: <strong>${fmtNum(f.scholar_metrics.citations)}</strong></span>`;
        html += `</div>`;
      }

      const detailStrong = allMatches.filter(s => s.composite >= 3);
      const detailBelow = allMatches.filter(s => s.composite > 0 && s.composite < 3).slice(0, 10);
      if (detailStrong.length > 0) {
        html += `<div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Focus Area Matches (Composite >= 3)</div>`;
        html += `<div class="fac-all-matches">`;
        for (const m of detailStrong) {
          const fa = L.focusAreaById[m.focus_area_id];
          html += `<div class="fac-match-row">
            <span class="fac-match-id">${m.focus_area_id}</span>
            <span class="fac-match-title">${fa ? truncate(fa.title, 40) : m.focus_area_id}</span>
            <div class="fac-match-scores">
              ${scoreBadge(m.faculty_fit, 'F')}
              ${scoreBadge(m.team_feasibility, 'T')}
              ${scoreBadge(m.competitive_edge, 'E')}
              ${scoreBadge(m.partnership_readiness, 'P')}
              <span class="score-chip" style="background:rgba(255,130,0,0.25);color:#FFB547;font-weight:800">${m.composite}</span>
            </div>
          </div>`;
        }
        html += `</div>`;
      }

      if (detailBelow.length > 0) {
        html += `<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin:12px 0 6px">Below Threshold (Composite < 3)</div>`;
        html += `<div class="fac-all-matches" style="opacity:0.6">`;
        for (const m of detailBelow) {
          const fa = L.focusAreaById[m.focus_area_id];
          html += `<div class="fac-match-row">
            <span class="fac-match-id">${m.focus_area_id}</span>
            <span class="fac-match-title">${fa ? truncate(fa.title, 40) : m.focus_area_id}</span>
            <div class="fac-match-scores">
              ${scoreBadge(m.faculty_fit, 'F')}
              ${scoreBadge(m.team_feasibility, 'T')}
              ${scoreBadge(m.competitive_edge, 'E')}
              ${scoreBadge(m.partnership_readiness, 'P')}
              <span class="score-chip" style="background:rgba(255,130,0,0.25);color:#FFB547;font-weight:800">${m.composite}</span>
            </div>
          </div>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `</div>`;
  }

  container.innerHTML = html;

  // Update filter button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isAll = btn.textContent.startsWith('All');
    const isAAII = btn.textContent.startsWith('AAII');
    const isRec = btn.textContent.startsWith('Rec');
    btn.classList.toggle('active',
      (_facFilter === 'all' && isAll) ||
      (_facFilter === 'AAII Affiliated' && isAAII) ||
      (_facFilter === 'Recommended' && isRec)
    );
  });
}

function toggleFaculty(fid) {
  _facExpanded = (_facExpanded === fid) ? null : fid;
  renderFacultyCards();
}
