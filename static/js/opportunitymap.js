/* ═══ Opportunity Map - Focus Area Opportunity Ranking ═══ */

let _oppSort = 'opportunity'; // 'opportunity' | 'strength' | 'pipool' | 'diversity'

async function renderOpportunityMap(container) {
  container.innerHTML = '<div class="loading">Loading Opportunity Map...</div>';
  const L = await DataStore.buildLookups();

  // Compute opportunities
  const opportunities = Strategy.computeFocusAreaOpportunities(L);

  // Summary stats
  const highOpp = opportunities.filter(o => o.tier === 'High Opportunity').length;
  const modOpp = opportunities.filter(o => o.tier === 'Moderate').length;
  const gaps = opportunities.filter(o => o.tier === 'Gap').length;
  const topChallenge = opportunities.length > 0 ? opportunities[0].challengeTitle : 'N/A';

  let html = '';

  // ═══ HEADER ═══
  html += `<div style="margin-bottom:20px">
    <h2 style="font-size:20px;font-weight:800;color:#FFF;margin-bottom:6px">Opportunity Map</h2>
    <p style="font-size:13px;color:var(--text2);max-width:700px;line-height:1.6">Focus areas ranked by team-building potential. Higher-ranked areas have stronger faculty matches, available PIs, departmental diversity, and senior researchers. Gap areas indicate where external partners may be needed.</p>
  </div>`;

  // ═══ SUMMARY CARDS ═══
  html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    <div class="card" style="padding:16px 18px;border-top:3px solid var(--green)">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">High Opportunity</div>
      <div style="font-size:24px;font-weight:800;color:#FFF">${highOpp}</div>
      <div style="font-size:11px;color:var(--text3)">Focus areas with strong potential</div>
    </div>
    <div class="card" style="padding:16px 18px;border-top:3px solid var(--cyan)">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Moderate</div>
      <div style="font-size:24px;font-weight:800;color:#FFF">${modOpp}</div>
      <div style="font-size:11px;color:var(--text3)">Viable with targeted recruitment</div>
    </div>
    <div class="card" style="padding:16px 18px;border-top:3px solid rgba(255,130,0,0.6)">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Coverage Gaps</div>
      <div style="font-size:24px;font-weight:800;color:#FFF">${gaps}</div>
      <div style="font-size:11px;color:var(--text3)">External partners needed</div>
    </div>
    <div class="card" style="padding:16px 18px;border-top:3px solid var(--purple)">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Top Challenge</div>
      <div style="font-size:13px;font-weight:700;color:#FFF;margin-top:4px;line-height:1.3">${topChallenge}</div>
    </div>
  </div>`;

  // ═══ FILTER + SORT BAR ═══
  html += `<div class="filter-row" id="opp-filters" style="margin-bottom:8px">
    <button class="filter-btn active" onclick="oppFilter('all')">All (${opportunities.length})</button>
    <button class="filter-btn" onclick="oppFilter('High Opportunity')">High (${highOpp})</button>
    <button class="filter-btn" onclick="oppFilter('Moderate')">Moderate (${modOpp})</button>
    <button class="filter-btn" onclick="oppFilter('Weak')">Weak (${opportunities.filter(o=>o.tier==='Weak').length})</button>
    <button class="filter-btn" onclick="oppFilter('Gap')">Gaps (${gaps})</button>
    <div class="filter-sep"></div>
    <select id="opp-challenge-filter" onchange="oppFilterChallenge(this.value)" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text2);font-size:11px;font-family:var(--font)">
      <option value="all">All Challenges</option>
      ${L.challenges.map(c => `<option value="${c.id}">${c.id}: ${truncate(c.title, 40)}</option>`).join('')}
    </select>
    <div class="filter-sep"></div>
    <select id="opp-sort" onchange="oppChangeSort(this.value)" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text2);font-size:11px;font-family:var(--font)">
      <option value="opportunity" ${_oppSort==='opportunity'?'selected':''}>Sort: Overall Opportunity Score</option>
      <option value="strength" ${_oppSort==='strength'?'selected':''}>Sort: Faculty Strength (highest first)</option>
      <option value="pipool" ${_oppSort==='pipool'?'selected':''}>Sort: PI Availability</option>
      <option value="diversity" ${_oppSort==='diversity'?'selected':''}>Sort: Department Diversity</option>
    </select>
  </div>`;

  // ═══ COLUMN HEADERS ═══
  html += `<div style="display:grid;grid-template-columns:50px 1fr 110px 60px 60px 60px 120px;gap:10px;padding:4px 18px;font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">
    <div>ID</div><div>Focus Area</div><div>Strength</div><div style="text-align:center">PIs</div><div style="text-align:center">Depts</div><div style="text-align:center">Senior</div><div style="text-align:right">Tier</div>
  </div>`;

  // ═══ OPPORTUNITY ROWS ═══
  html += `<div id="opp-list">`;
  html += renderOppRows(opportunities, L);
  html += `</div>`;

  container.innerHTML = html;

  // Store data for filtering
  window._oppData = opportunities;
  window._oppLookups = L;
  window._oppTierFilter = 'all';
  window._oppChallengeFilter = 'all';
}

function renderOppRows(opportunities, L) {
  let html = '';
  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    const tierColors = {
      'High Opportunity': { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', border: 'rgba(34,197,94,0.25)' },
      'Moderate': { bg: 'rgba(56,189,248,0.12)', color: '#38BDF8', border: 'rgba(56,189,248,0.25)' },
      'Weak': { bg: 'rgba(255,130,0,0.12)', color: '#FF8200', border: 'rgba(255,130,0,0.25)' },
      'Gap': { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
    };
    const tc = tierColors[opp.tier] || tierColors['Weak'];
    const strengthPct = Math.min(100, (opp.strength / 5) * 100).toFixed(0);
    const strengthColor = opp.strength >= 3.5 ? '#22C55E' : opp.strength >= 2.5 ? '#38BDF8' : opp.strength >= 1.5 ? '#FF8200' : '#EF4444';

    html += `<div class="card opp-row" data-tier="${opp.tier}" data-challenge="${opp.challengeId}" style="padding:14px 18px;margin-bottom:6px;cursor:pointer;transition:all 0.2s" onclick="toggleOppDetail('opp-detail-${i}', this)">
      <div style="display:grid;grid-template-columns:50px 1fr 110px 60px 60px 60px 120px;gap:10px;align-items:center">
        <div style="font-size:12px;font-weight:700;color:var(--cyan)">${opp.faId}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#FFF;line-height:1.3">${truncate(opp.faTitle, 70)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${opp.challengeTitle}</div>
        </div>
        <div>
          <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${strengthPct}%;background:${strengthColor};border-radius:3px;transition:width 0.6s ease"></div>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:3px">Strength: ${opp.strength.toFixed(1)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:800;color:#FFF">${opp.piPool}</div>
          <div style="font-size:10px;color:var(--text3)">PIs</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:800;color:#FFF">${opp.deptDiversity}</div>
          <div style="font-size:10px;color:var(--text3)">Depts</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:800;color:#FFF">${opp.seniorityDepth}</div>
          <div style="font-size:10px;color:var(--text3)">Senior</div>
        </div>
        <div style="text-align:right">
          <span class="badge" style="background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};font-size:10px;padding:2px 8px">${opp.tier}</span>
        </div>
      </div>
      <div id="opp-detail-${i}" class="opp-detail" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid var(--card-border)">
        ${renderOppDetail(opp, L)}
      </div>
    </div>`;
  }

  if (opportunities.length === 0) {
    html += `<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No focus areas match the current filters.</div>`;
  }

  return html;
}

function renderOppDetail(opp, L) {
  let html = '';
  const fa = L.focusAreaById[opp.faId];

  if (fa && fa.description) {
    html += `<div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px;max-width:800px">${expandableText(fa.description, 250)}</div>`;
  }

  // Faculty pool
  html += `<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Top Faculty Candidates</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;margin-bottom:12px">`;

  for (const fac of opp.topFaculty.slice(0, 8)) {
    const f = L.facultyById[fac.faculty_id];
    if (!f) continue;
    const tierCol = TIER_COLORS[f.tier] || TIER_COLORS['Recommended'];
    const seniority = Strategy.seniorityScore(f, L);
    const canPI = Strategy.canServeAs(f, 'pi');
    const canCoPI = Strategy.canServeAs(f, 'co-pi');

    html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--card-border)">
      <div style="width:30px;height:30px;border-radius:var(--radius-sm);background:${TIER_AVATAR[f.tier]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#FFF;flex-shrink:0">${getInitials(f.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:#FFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
        <div style="font-size:10px;color:var(--text3)">${f.department}${seniority >= 4 ? ' <span style="color:var(--accent);font-weight:700">Senior</span>' : ''}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        ${scoreBadge(fac.composite, '')}
        ${canPI ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(34,197,94,0.15);color:#22C55E;font-weight:700">PI</span>' : canCoPI ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(56,189,248,0.15);color:#38BDF8;font-weight:700">Co-PI</span>' : ''}
      </div>
    </div>`;
  }
  html += `</div>`;

  // Action button
  if (opp.tier !== 'Gap') {
    html += `<button onclick="event.stopPropagation();openProposalLabFromOpportunity('${opp.faId}')" style="padding:8px 20px;border-radius:var(--radius-sm);border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#22C55E;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all 0.2s" onmouseover="this.style.background='rgba(34,197,94,0.18)'" onmouseout="this.style.background='rgba(34,197,94,0.1)'">${ICONS.arrowRight} Build Team in Proposal Lab</button>`;
  } else {
    html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:var(--radius-sm);background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15)">
      <span style="font-size:12px;color:#EF4444;font-weight:600">${ICONS.globe} External Partner Needed</span>
      <span style="font-size:11px;color:var(--text3)">No UTEP faculty scored >= 3 for this focus area. Consider national lab or industry partners.</span>
    </div>`;
  }

  return html;
}

function toggleOppDetail(detailId, rowEl) {
  const detail = document.getElementById(detailId);
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  // Close all others
  document.querySelectorAll('.opp-detail').forEach(d => { d.style.display = 'none'; });
  document.querySelectorAll('.opp-row').forEach(r => { r.style.borderColor = ''; });
  if (!isOpen) {
    detail.style.display = 'block';
    rowEl.style.borderColor = 'rgba(255,130,0,0.25)';
  }
}

function oppFilter(tier) {
  window._oppTierFilter = tier;
  applyOppFilters();
  // Update filter button state
  document.querySelectorAll('#opp-filters .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase().startsWith(tier === 'all' ? 'all' : tier.toLowerCase()));
  });
}

function oppFilterChallenge(challengeId) {
  window._oppChallengeFilter = challengeId;
  applyOppFilters();
}

function oppChangeSort(sortBy) {
  _oppSort = sortBy;
  applyOppFilters();
}

function applyOppFilters() {
  let filtered = window._oppData || [];
  if (window._oppTierFilter !== 'all') {
    filtered = filtered.filter(o => o.tier === window._oppTierFilter);
  }
  if (window._oppChallengeFilter !== 'all') {
    filtered = filtered.filter(o => o.challengeId === window._oppChallengeFilter);
  }
  // Apply sort
  filtered = [...filtered].sort((a, b) => {
    switch (_oppSort) {
      case 'strength': return b.strength - a.strength;
      case 'pipool': return b.piPool - a.piPool;
      case 'diversity': return b.deptDiversity - a.deptDiversity;
      default: return b.opportunityScore - a.opportunityScore;
    }
  });
  const listEl = document.getElementById('opp-list');
  if (listEl) {
    listEl.innerHTML = renderOppRows(filtered, window._oppLookups);
  }
}
