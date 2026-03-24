/* ═══ Challenge Explorer Tab ═══ */

let _selectedChallenge = null;
let _selectedFA = null;
let _chSearch = '';

async function renderChallenges(container) {
  container.innerHTML = '<div class="loading">Loading challenges...</div>';
  const L = await DataStore.buildLookups();
  const strengths = Strategy.computeChallengeStrengths(L);
  const strengthMap = {};
  for (const s of strengths) strengthMap[s.id] = s;

  // Coverage stats
  const totalFAs = L.focusAreas.length;
  const coveredFAs = L.focusAreas.filter(fa => {
    const top = L.topFacultyByFA[fa.id] || [];
    return top.some(s => s.composite >= 3);
  }).length;

  let html = '';

  // ═══ HEADER ═══
  html += `<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
    <div>
      <h2 style="font-size:20px;font-weight:800;color:#FFF;margin-bottom:4px">Challenges & Focus Areas</h2>
      <p style="font-size:13px;color:var(--text2);max-width:600px;line-height:1.6">The DOE Genesis Mission (DE-FOA-0003612) spans ${L.challenges.length} challenges and ${totalFAs} focus areas. Each challenge card below shows UTEP's strength and coverage for that area. Click to explore focus areas and faculty matches.</p>
    </div>
    <div style="display:flex;gap:12px;align-items:center">
      <div class="card" style="padding:10px 16px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:var(--green)">${coveredFAs}</div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Covered</div>
      </div>
      <div class="card" style="padding:10px 16px;text-align:center">
        <div style="font-size:18px;font-weight:800;color:var(--accent)">${totalFAs - coveredFAs}</div>
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Gaps</div>
      </div>
    </div>
  </div>`;

  // ═══ SEARCH ═══
  html += `<input class="fac-search" type="text" placeholder="Search challenges, focus areas, or offices..." value="${_chSearch}" oninput="_chSearch=this.value;renderChallenges($('content'))" style="max-width:400px;margin-bottom:16px">`;

  // ═══ CHALLENGE CARDS ═══
  html += `<div class="ch-card-grid">`;

  for (const c of L.challenges) {
    const str = strengthMap[c.id] || { strength: 0, totalFacultyStrong: 0, coveredFAs: 0 };
    const tier = Strategy.strengthTier(str.strength);
    const pct = Math.min((str.strength / 5) * 100, 100);
    const isExpanded = _selectedChallenge === c.id;

    // Filter by search
    if (_chSearch) {
      const q = _chSearch.toLowerCase();
      const match = c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.offices || '').toLowerCase().includes(q) ||
        c.focus_areas.some(fa => fa.title.toLowerCase().includes(q) || fa.description.toLowerCase().includes(q));
      if (!match) continue;
    }

    html += `<div class="card ch-explorer-card${isExpanded ? ' expanded' : ''}" onclick="toggleChallengeExpand('${c.id}')">
      <div class="ch-card-header">
        <div class="ch-card-code" style="color:${tier.color}">${c.id}</div>
        <div class="ch-card-info">
          <div class="ch-card-title">${c.title}</div>
          <div class="ch-card-meta">${c.offices || ''}</div>
        </div>
        <div class="ch-card-stats">
          <span class="ch-card-fa-count">${c.focus_areas.length} FAs</span>
          <span class="ch-card-match-count" style="color:${tier.color}">${str.totalFacultyStrong} matches</span>
        </div>
        <div class="ch-card-strength">
          <div class="ch-card-bar"><div class="ch-card-bar-fill" style="width:${pct}%;background:${tier.color}"></div></div>
          <span style="font-size:11px;font-weight:700;color:${tier.color}">${str.strength}</span>
        </div>
        <div class="ch-card-chevron">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</div>
      </div>`;

    // Expanded: Focus Areas
    if (isExpanded) {
      html += `<div class="ch-card-body" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--card-border)">`;

      for (const fa of c.focus_areas) {
        const topFac = L.topFacultyByFA[fa.id] || [];
        const strongFac = topFac.filter(s => s.composite >= 3);
        const strongCount = strongFac.length;
        const isFASelected = _selectedFA === fa.id;
        const faStrength = (str.faStrengths || []).find(f => f.id === fa.id);
        const faScore = faStrength ? faStrength.strength : 0;
        const faTier = Strategy.strengthTier(faScore);

        html += `<div class="fa-accordion${isFASelected ? ' open' : ''}" onclick="event.stopPropagation();toggleFAExpand('${fa.id}')">
          <div class="fa-accordion-header">
            <span class="fa-accordion-id" style="color:var(--cyan)">${fa.id}</span>
            <span class="fa-accordion-title">${fa.title}</span>
            <span class="fa-accordion-badge" style="background:${faTier.bg};color:${faTier.color}">${strongCount} match${strongCount !== 1 ? 'es' : ''}</span>
            <span class="fa-accordion-chevron">${isFASelected ? ICONS.chevronDown : ICONS.chevronRight}</span>
          </div>`;

        if (isFASelected) {
          html += `<div class="fa-accordion-body">
            <div class="fa-accordion-desc">${fa.description}</div>`;

          if (strongFac.length > 0) {
            html += `<div class="fa-faculty-list">
              <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Top Faculty Matches</div>`;

            for (const s of strongFac.slice(0, 10)) {
              const fac = L.facultyById[s.faculty_id];
              if (!fac) continue;
              html += `<div class="fac-match-row">
                <span class="fac-match-id" style="min-width:40px">${getInitials(fac.name)}</span>
                <span class="fac-match-title">${fac.name} <span style="color:var(--text3)">${fac.department}</span></span>
                <div class="fac-match-scores">
                  ${scoreBadge(s.composite, '')}
                </div>
              </div>`;
            }
            html += `</div>`;
          } else {
            html += `<div style="font-size:11px;color:var(--text3);padding:8px 0">${ICONS.globe} No strong UTEP matches. External partners may be needed.</div>`;
          }

          // Action button
          if (strongCount > 0) {
            html += `<button onclick="event.stopPropagation();openProposalLabFromOpportunity('${fa.id}')" style="margin-top:8px;padding:6px 14px;border-radius:var(--radius-sm);border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);color:#22C55E;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font)">${ICONS.arrowRight} Build Team</button>`;
          }

          html += `</div>`;
        }

        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function toggleChallengeExpand(cId) {
  _selectedChallenge = _selectedChallenge === cId ? null : cId;
  _selectedFA = null;
  renderChallenges($('content'));
}

function toggleFAExpand(faId) {
  _selectedFA = _selectedFA === faId ? null : faId;
  const L = DataStore._lookups;
  if (L) renderChallenges($('content'));
}
