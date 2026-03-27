/* ═══ Proposal Lab — Main Module ═══ */

/* ─── State ─── */
let _labView = 'dashboard';    // 'dashboard' | 'challenge' | 'faculty' | 'team' | 'builder' | 'packages' | 'package-detail'
let _labStep = 0;              // Step in the journey: 0=select, 1=team, 2=concept, 3=keywords, 4=export
let _labKeywords = null;       // Cached keyword results
let _labAnalysis = null;       // Cached AI analysis for selected FA
let _labSelectedChallenge = null;
let _labSelectedFA = null;
let _labSelectedFaculty = [];  // array of faculty_id for team-first
let _labPrimaryFaculty = null; // faculty_id for faculty-first
let _labTeam = [];             // [{faculty_id, role}]
let _labTrack = 'aaii-led';
let _labEditingPkg = null;     // package object if editing
let _labAdvantages = [];       // selected advantage IDs
let _labExpandedChallenge = null; // for strength chart drill-down
let _labOptimizerState = null;    // cached optimizer output
let _labLockedAssignments = [];   // [{faculty_id, focus_area_id}]

/* ─── Advantages Data ─── */
let _advantagesData = null;
async function getAdvantages() {
  if (_advantagesData) return _advantagesData;
  try {
    const r = await fetch('/api/advantages');
    _advantagesData = await r.json();
  } catch {
    _advantagesData = { geographic: [], institutional: [], infrastructure: [] };
  }
  return _advantagesData;
}

/* ─── Main Render ─── */
async function renderProposalLab(container) {
  const L = await DataStore.buildLookups();
  const advs = await getAdvantages();
  const pkgCount = PackageStore.count();

  container.innerHTML = '';

  // Check for shared view
  const params = new URLSearchParams(window.location.search);
  if (params.get('pkg')) {
    renderSharedView(container, params.get('pkg'), L, advs);
    return;
  }

  // Handle entry from Opportunity Map
  if (window._labEntryContext) {
    const ctx = window._labEntryContext;
    window._labEntryContext = null;
    _labSelectedFA = ctx.faId;
    const fa = L.focusAreaById[ctx.faId];
    if (fa) _labSelectedChallenge = fa.challenge_id;
    // Pre-suggest a team
    const suggested = Strategy.suggestTeam(ctx.faId, L);
    _labTeam = Array.isArray(suggested) ? suggested.map(m => ({faculty_id: m.faculty_id, role: m.role})) : [];
    _labView = 'builder';
  }

  // Lab header
  const header = document.createElement('div');
  header.className = 'lab-header';
  header.innerHTML = `
    <div>
      <div class="lab-title-row">
        <span class="lab-title">Proposal Lab</span>
      </div>
      <div class="lab-subtitle">Build evidence-backed proposal teams for the DOE Genesis Mission</div>
    </div>
    <button class="lab-pkg-count" onclick="_labView='packages';renderProposalLab($('content'))">
      ${ICONS.clipboard}
      <span>Saved Packages (${pkgCount})</span>
    </button>
  `;
  container.appendChild(header);

  // Step indicator (shown when in builder or package-detail)
  if (['builder', 'package-detail'].includes(_labView)) {
    const steps = ['Opportunity', 'Team', 'Research', 'Keywords', 'Export'];
    const stepIcons = [ICONS.map, ICONS.users, ICONS.bulb, ICONS.key, ICONS.download];
    const currentStep = _labView === 'builder' ? 1 : (_labStep || 2);
    const indicator = document.createElement('div');
    indicator.className = 'step-indicator';
    let stepHtml = '';
    for (let i = 0; i < steps.length; i++) {
      const state = i < currentStep ? 'completed' : i === currentStep ? 'active' : 'pending';
      stepHtml += `<div class="step-item ${state}">
        <div class="step-dot">${state === 'completed' ? ICONS.check : stepIcons[i]}</div>
        <div class="step-name">${steps[i]}</div>
      </div>`;
      if (i < steps.length - 1) stepHtml += '<div class="step-line"></div>';
    }
    indicator.innerHTML = stepHtml;
    container.appendChild(indicator);
  }

  // Onboarding section (collapsible, only on dashboard view)
  if (_labView === 'dashboard' && !localStorage.getItem('genesis_lab_onboarded')) {
    const onboarding = document.createElement('div');
    onboarding.className = 'lab-onboarding';
    onboarding.innerHTML = `
      <div class="narrative-section" data-reveal="up" data-reveal-stagger>
        <div class="card narrative-block nb-cyan">
          <div class="narrative-bar" style="background:var(--cyan)"></div>
          <div>
            <h3>What is the Proposal Lab?</h3>
            <p>The Proposal Lab turns scoring data into actionable proposal teams. Using composite scores from four evaluation axes, seniority analysis, and departmental diversity, it suggests optimal team compositions for each DOE Genesis focus area. The platform has already identified ${pkgCount > 0 ? pkgCount + ' proposal packages and ' : ''}${L.stats.strongMatches} strong faculty matches across ${L.stats.totalFocusAreas} focus areas.</p>
          </div>
        </div>
        <div class="card narrative-block nb-orange">
          <div class="narrative-bar" style="background:var(--accent)"></div>
          <div>
            <h3>Three Ways to Build</h3>
            <p><strong>Challenge First:</strong> Pick a focus area and get a suggested team ranked by composite score and seniority. <strong>Faculty First:</strong> Find a researcher's strongest opportunities and their natural collaborators. <strong>Team First:</strong> Select collaborators and discover which focus areas they match best. Each path leads to a team builder where roles, members, and research concepts can be refined before saving.</p>
          </div>
        </div>
        <div class="card narrative-block nb-green">
          <div class="narrative-bar" style="background:var(--green)"></div>
          <div>
            <h3>From Package to Proposal</h3>
            <p>A proposal package captures the team, focus area, scoring evidence, UTEP competitive advantages, and an AI-generated research concept. Packages can be tagged by proposal track (AAII-Led, AAII-Supported, or Faculty-Led), shared with faculty via URL, or exported as a summary. The shared view gives recipients the evidence behind the recommendation and room to suggest adjustments.</p>
          </div>
        </div>
      </div>
      <button class="lab-dismiss-btn" onclick="localStorage.setItem('genesis_lab_onboarded','1');this.parentElement.remove()">
        Got it, hide this guide
      </button>
    `;
    container.appendChild(onboarding);
  } else if (_labView === 'dashboard' && localStorage.getItem('genesis_lab_onboarded')) {
    const showGuide = document.createElement('button');
    showGuide.className = 'lab-show-guide';
    showGuide.textContent = 'Show guide';
    showGuide.onclick = () => { localStorage.removeItem('genesis_lab_onboarded'); renderProposalLab($('content')); };
    container.appendChild(showGuide);
  }

  // Route to current view
  switch (_labView) {
    case 'dashboard':
      renderStrategyDashboard(container, L, advs);
      break;
    case 'challenge':
      renderChallengFirst(container, L, advs);
      break;
    case 'faculty':
      renderFacultyFirst(container, L, advs);
      break;
    case 'team':
      renderTeamFirst(container, L, advs);
      break;
    case 'builder':
      renderTeamBuilder(container, L, advs);
      break;
    case 'packages':
      renderPackageManager(container, L, advs);
      break;
    case 'package-detail':
      renderPackageDetail(container, L, advs);
      break;
    default:
      renderStrategyDashboard(container, L, advs);
  }
}


/* ═══════════════════════════════════════════════════════
   STRATEGY DASHBOARD
   ═══════════════════════════════════════════════════════ */

function renderStrategyDashboard(container, L, advs) {
  const wrap = document.createElement('div');

  // Didactic intro (outside card, plain text)
  wrap.innerHTML = `
    <div style="margin-bottom:20px;padding-left:2px">
      <div style="font-size:14px;font-weight:700;color:#FFF;margin-bottom:6px">How the Proposal Lab Works</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.7;max-width:800px">The Proposal Lab takes the scoring and opportunity data from the Intelligence tab and turns it into actionable proposal teams. Start by selecting a high-opportunity focus area, then assemble the optimal team, generate AI-powered research directions, produce literature review keywords, and export a ready-to-share Word document for faculty.</div>
    </div>
    <div class="entry-cards" data-reveal="up" data-reveal-stagger>
      <div class="card entry-card" style="border-color:rgba(34,197,94,0.20);background:linear-gradient(180deg, rgba(14,21,52,0.9) 0%, rgba(34,197,94,0.08) 100%)" onclick="openIntelligenceTab('opportunity')">
        <div class="entry-card-icon" style="background:var(--grad-green)">${ICONS.map}</div>
        <h4>Start from Opportunities</h4>
        <p>View UTEP's top-ranked focus areas and jump directly into team building (recommended)</p>
      </div>
      <div class="card entry-card nc-orange" onclick="_labView='challenge';renderProposalLab($('content'))">
        <div class="entry-card-icon" style="background:var(--grad-orange)">${ICONS.target}</div>
        <h4>Challenge First</h4>
        <p>Pick a specific focus area and build the optimal team around it</p>
      </div>
      <div class="card entry-card nc-blue" onclick="_labView='faculty';renderProposalLab($('content'))">
        <div class="entry-card-icon" style="background:var(--grad-blue)">${ICONS.users}</div>
        <h4>Faculty First</h4>
        <p>Start from a researcher and find their strongest opportunities</p>
      </div>
      <div class="card entry-card nc-purple" onclick="_labView='team';renderProposalLab($('content'))">
        <div class="entry-card-icon" style="background:var(--grad-purple)">${ICONS.layers}</div>
        <h4>Team First</h4>
        <p>Select collaborators and discover which focus areas they match best</p>
      </div>
    </div>
  `;

  // Compute strategy data
  const strengths = Strategy.computeChallengeStrengths(L);
  if (!_labOptimizerState) {
    _labOptimizerState = Strategy.optimizePI(L, _labLockedAssignments);
  }
  const opt = _labOptimizerState;

  // Stats row
  wrap.innerHTML += `
    <div class="strat-stats" data-reveal="up">
      <div class="card strat-stat">
        <div class="strat-stat-value" style="color:var(--accent)">${opt.stats.proposalCount}</div>
        <div class="strat-stat-label">Optimal Proposals</div>
        <div class="strat-stat-sub">PI-constrained maximum</div>
      </div>
      <div class="card strat-stat">
        <div class="strat-stat-value" style="color:var(--cyan)">${opt.stats.facultyAssigned}</div>
        <div class="strat-stat-label">Faculty as PI</div>
        <div class="strat-stat-sub">of ${L.stats.totalFaculty} total</div>
      </div>
      <div class="card strat-stat">
        <div class="strat-stat-value" style="color:var(--green)">${opt.stats.coveragePct}%</div>
        <div class="strat-stat-label">FA Coverage</div>
        <div class="strat-stat-sub">${opt.stats.focusAreasCovered} of ${opt.stats.totalFocusAreas}</div>
      </div>
      <div class="card strat-stat">
        <div class="strat-stat-value" style="color:var(--purple)">${opt.stats.avgComposite}</div>
        <div class="strat-stat-label">Avg Composite</div>
        <div class="strat-stat-sub">across assigned PIs</div>
      </div>
    </div>
  `;

  // Two-column: Strength Index + PI Optimizer
  const grid = document.createElement('div');
  grid.className = 'grid-2';
  grid.setAttribute('data-reveal', 'up');

  // LEFT: UTEP Strength Index
  const strengthCard = document.createElement('div');
  strengthCard.className = 'card';
  strengthCard.innerHTML = `
    <div class="card-title">
      <div class="icon" style="background:var(--grad-green)">${ICONS.chart}</div>
      UTEP Strength by Challenge
    </div>
    <div class="strength-list" id="strength-list"></div>
  `;
  grid.appendChild(strengthCard);

  // RIGHT: PI Optimizer
  const optCard = document.createElement('div');
  optCard.className = 'card';
  optCard.innerHTML = `
    <div class="card-title">
      <div class="icon" style="background:var(--grad-orange)">${ICONS.zap}</div>
      PI Allocation Optimizer
      <span style="font-size:11px;color:var(--text3);font-weight:400;margin-left:auto">${opt.assignments.length} assignments</span>
    </div>
    <div class="optimizer-table-wrap" id="optimizer-list"></div>
  `;
  grid.appendChild(optCard);

  container.appendChild(wrap);
  container.appendChild(grid);

  // Render strength bars
  renderStrengthBars(strengths, L);
  // Render optimizer rows
  renderOptimizerRows(opt, L);
}

function renderStrengthBars(strengths, L) {
  const list = document.getElementById('strength-list');
  if (!list) return;

  let html = '';
  for (const c of strengths) {
    const tier = Strategy.strengthTier(c.strength);
    const pct = Math.min((c.strength / 5) * 100, 100);
    const isExpanded = _labExpandedChallenge === c.id;

    html += `
      <div class="strength-row${isExpanded ? ' expanded' : ''}" onclick="toggleStrengthExpand('${c.id}')">
        <div class="strength-code">${c.id}</div>
        <div class="strength-info">
          <div class="strength-name">${truncate(c.title, 40)}</div>
          <div class="strength-meta">${c.coveredFAs}/${c.focusAreaCount} FAs covered · ${c.totalFacultyStrong} strong matches</div>
        </div>
        <div class="strength-bar-wrap">
          <div class="strength-bar-bg"><div class="strength-bar-fill" style="width:${pct}%;background:${tier.color}"></div></div>
        </div>
        <div class="strength-score" style="color:${tier.color}">${c.strength}</div>
      </div>
    `;

    if (isExpanded) {
      html += '<div class="strength-fa-list">';
      for (const fa of c.faStrengths) {
        const faTier = Strategy.strengthTier(fa.strength);
        const faPct = Math.min((fa.strength / 5) * 100, 100);
        html += `
          <div class="strength-fa-row">
            <div class="strength-fa-id">${fa.id}</div>
            <div class="strength-fa-name">${truncate(fa.title, 35)}</div>
            <div class="strength-bar-wrap">
              <div class="strength-bar-bg"><div class="strength-bar-fill" style="width:${faPct}%;background:${faTier.color}"></div></div>
            </div>
            <div class="strength-score" style="color:${faTier.color};font-size:12px">${fa.strength}</div>
          </div>
        `;
      }
      html += '</div>';
    }
  }
  list.innerHTML = html;
}

function toggleStrengthExpand(challengeId) {
  _labExpandedChallenge = _labExpandedChallenge === challengeId ? null : challengeId;
  // Re-render just the strength bars
  const L = DataStore._lookups;
  if (L) {
    const strengths = Strategy.computeChallengeStrengths(L);
    renderStrengthBars(strengths, L);
  }
}

function renderOptimizerRows(opt, L) {
  const list = document.getElementById('optimizer-list');
  if (!list) return;

  const conflicts = PackageStore.findPIConflicts();
  let html = '';

  for (let i = 0; i < opt.assignments.length; i++) {
    const a = opt.assignments[i];
    const f = L.facultyById[a.faculty_id];
    const fa = L.focusAreaById[a.focus_area_id];
    if (!f || !fa) continue;

    const scoreColor = SCORE_TEXT[Math.round(a.composite)] || SCORE_TEXT[0];
    const hasConflict = conflicts[a.faculty_id];
    const lockIcon = a.locked
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';

    html += `
      <div class="opt-row${a.locked ? ' locked' : ''}${hasConflict ? ' conflict' : ''}"
           draggable="true"
           ondragstart="optDragStart(event,${i})"
           ondragover="optDragOver(event)"
           ondrop="optDrop(event,${i})"
           ondragend="optDragEnd(event)">
        <div class="opt-rank">${i + 1}</div>
        <div class="opt-faculty">
          <div>
            <div class="opt-faculty-name">${f.name}${hasConflict ? ' <span class="conflict-badge">PI Conflict</span>' : ''}</div>
            <div class="opt-faculty-dept">${f.department} · ${tierBadge(f.tier)}</div>
          </div>
        </div>
        <div class="opt-fa">
          <div class="opt-fa-id">${fa.id}</div>
          <div class="opt-fa-title">${truncate(fa.title, 30)}</div>
        </div>
        <div class="opt-score" style="color:${scoreColor}">${a.composite}</div>
        <button class="opt-lock${a.locked ? ' locked' : ''}" onclick="event.stopPropagation();toggleOptLock(${i})" title="${a.locked ? 'Unlock' : 'Lock'} this assignment">
          ${lockIcon}
        </button>
      </div>
    `;
  }

  list.innerHTML = html;
}

/* Optimizer drag-and-drop */
let _optDragIdx = null;

function optDragStart(e, idx) {
  _optDragIdx = idx;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function optDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}
function optDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (_optDragIdx === null || _optDragIdx === targetIdx) return;

  const opt = _labOptimizerState;
  if (!opt) return;

  // Swap the focus areas between two assignments
  const a = opt.assignments[_optDragIdx];
  const b = opt.assignments[targetIdx];

  // Lock both with swapped FAs and re-optimize
  _labLockedAssignments = opt.assignments
    .filter(x => x.locked)
    .map(x => ({ faculty_id: x.faculty_id, focus_area_id: x.focus_area_id }));

  // Remove old locks for these two
  _labLockedAssignments = _labLockedAssignments.filter(
    l => l.faculty_id !== a.faculty_id && l.faculty_id !== b.faculty_id
  );

  // Add swapped locks
  _labLockedAssignments.push({ faculty_id: a.faculty_id, focus_area_id: b.focus_area_id });
  _labLockedAssignments.push({ faculty_id: b.faculty_id, focus_area_id: a.focus_area_id });

  // Re-run optimizer
  const L = DataStore._lookups;
  _labOptimizerState = Strategy.optimizePI(L, _labLockedAssignments);
  renderProposalLab($('content'));
}
function optDragEnd(e) {
  _optDragIdx = null;
  document.querySelectorAll('.opt-row').forEach(r => {
    r.classList.remove('dragging', 'drag-over');
  });
}

function toggleOptLock(idx) {
  const opt = _labOptimizerState;
  if (!opt || !opt.assignments[idx]) return;

  const a = opt.assignments[idx];
  a.locked = !a.locked;

  // Rebuild locked list
  _labLockedAssignments = opt.assignments
    .filter(x => x.locked)
    .map(x => ({ faculty_id: x.faculty_id, focus_area_id: x.focus_area_id }));

  // Re-run optimizer
  const L = DataStore._lookups;
  _labOptimizerState = Strategy.optimizePI(L, _labLockedAssignments);
  renderProposalLab($('content'));
}


/* ═══════════════════════════════════════════════════════
   CHALLENGE-FIRST ENTRY POINT
   ═══════════════════════════════════════════════════════ */

function renderChallengFirst(container, L, advs) {
  const back = document.createElement('button');
  back.className = 'lab-back';
  back.innerHTML = '&larr; Back to Dashboard';
  back.onclick = () => { _labView = 'dashboard'; renderProposalLab($('content')); };
  container.appendChild(back);

  const grid = document.createElement('div');
  grid.className = 'explorer-grid';

  // Left sidebar: challenge list
  const sidebar = document.createElement('div');
  sidebar.className = 'card';
  sidebar.style.padding = '0';
  let sideHtml = '<div class="ch-list"><div class="ch-list-title">Challenges</div>';
  for (const c of L.challenges) {
    const isActive = _labSelectedChallenge === c.id;
    sideHtml += `
      <button class="ch-btn${isActive ? ' active' : ''}" onclick="labSelectChallenge('${c.id}')">
        <span class="ch-code">${c.id}</span>
        <span class="ch-name-sm">${truncate(c.title, 35)}</span>
        <span class="ch-cnt" style="background:rgba(255,255,255,0.04)">${c.focus_areas.length}</span>
      </button>`;
  }
  sideHtml += '</div>';
  sidebar.innerHTML = sideHtml;
  grid.appendChild(sidebar);

  // Right panel
  const detail = document.createElement('div');
  detail.id = 'lab-challenge-detail';

  if (_labSelectedChallenge) {
    renderChallengeDetail(detail, L, advs);
  } else {
    detail.innerHTML = '<div class="card" style="padding:40px;text-align:center"><p style="color:var(--text3)">Select a challenge to begin</p></div>';
  }
  grid.appendChild(detail);

  container.appendChild(grid);
}

function labSelectChallenge(cId) {
  _labSelectedChallenge = cId;
  _labSelectedFA = null;
  renderProposalLab($('content'));
}

function renderChallengeDetail(container, L, advs) {
  const c = L.challengeById[_labSelectedChallenge];
  if (!c) return;

  let html = `<div class="card" style="margin-bottom:12px">
    <div class="ch-detail-head">
      <span class="code">${c.id}</span>
      <span class="title">${c.title}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">`;

  for (const fa of c.focus_areas) {
    const isActive = _labSelectedFA === fa.id;
    const topFac = (L.topFacultyByFA[fa.id] || []).filter(s => s.composite >= 3);
    html += `
      <div class="fa-card${isActive ? ' active' : ''}" onclick="labSelectFA('${fa.id}')">
        <div class="fa-card-title"><span class="fa-card-id">${fa.id}</span>${fa.title}</div>
        <div class="fa-card-desc">${truncate(fa.description || '', 120)}</div>
        <div style="margin-top:6px;font-size:11px;color:var(--text3)">${topFac.length} strong matches</div>
      </div>`;
  }

  html += '</div></div>';

  // If FA selected, show suggested team
  if (_labSelectedFA) {
    const fa = L.focusAreaById[_labSelectedFA];
    const suggested = Strategy.suggestTeam(_labSelectedFA, L);

    html += `<div class="card">
      <div class="card-title">
        <div class="icon" style="background:var(--grad-orange)">${ICONS.users}</div>
        Suggested Team for ${fa.id}: ${truncate(fa.title, 40)}
      </div>
      <div style="margin-bottom:16px">`;

    for (const m of suggested) {
      const f = L.facultyById[m.faculty_id];
      if (!f) continue;
      const scoreColor = SCORE_TEXT[Math.round(m.composite)] || SCORE_TEXT[0];
      html += `
        <div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;background:rgba(255,255,255,0.02);margin-bottom:4px">
          <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]};width:32px;height:32px;font-size:11px">${getInitials(f.name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;color:#FFF">${f.name}</div>
            <div style="font-size:11px;color:var(--text3)">${f.department}</div>
          </div>
          <span class="role-badge role-${m.role}">${m.role.replace('-', ' ')}</span>
          <span style="font-size:14px;font-weight:800;color:${scoreColor}">${m.composite}</span>
        </div>`;
    }

    html += `</div>
      <button class="build-pkg-btn" onclick="labStartBuilder('${_labSelectedFA}', 'challenge')">
        ${ICONS.clipboard} Build Proposal Package
      </button>
    </div>`;
  }

  container.innerHTML = html;
}

function labSelectFA(faId) {
  _labSelectedFA = _labSelectedFA === faId ? null : faId;
  renderProposalLab($('content'));
}


/* ═══════════════════════════════════════════════════════
   FACULTY-FIRST ENTRY POINT
   ═══════════════════════════════════════════════════════ */

let _labFacSearch = '';

function renderFacultyFirst(container, L, advs) {
  const back = document.createElement('button');
  back.className = 'lab-back';
  back.innerHTML = '&larr; Back to Dashboard';
  back.onclick = () => { _labView = 'dashboard'; renderProposalLab($('content')); };
  container.appendChild(back);

  const wrap = document.createElement('div');

  // Search
  wrap.innerHTML = `
    <input class="fac-search" type="text" placeholder="Search faculty by name, department, or expertise..."
           value="${_labFacSearch}" oninput="_labFacSearch=this.value;renderFacFirstResults()" id="lab-fac-search">
    <div id="lab-fac-results"></div>
  `;
  container.appendChild(wrap);

  setTimeout(() => renderFacFirstResults(), 0);
}

function renderFacFirstResults() {
  const resultsEl = document.getElementById('lab-fac-results');
  if (!resultsEl) return;

  const L = DataStore._lookups;
  if (!L) return;

  const q = _labFacSearch.toLowerCase();

  if (_labPrimaryFaculty) {
    // Show this faculty's top matches
    const f = L.facultyById[_labPrimaryFaculty];
    if (!f) return;

    const topMatches = (L.topMatchesByFaculty[_labPrimaryFaculty] || [])
      .filter(s => s.composite >= 2.5)
      .slice(0, 12);

    let html = `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
          <div>
            <div class="fac-name">${f.name}</div>
            <div class="fac-dept">${f.department} · ${tierBadge(f.tier)}</div>
          </div>
          <button class="lab-back" style="margin:0;margin-left:auto" onclick="_labPrimaryFaculty=null;renderFacFirstResults()">Change</button>
        </div>
        <div class="section-title">Top Focus Area Matches</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">`;

    for (const s of topMatches) {
      const fa = L.focusAreaById[s.focus_area_id];
      if (!fa) continue;
      const scoreColor = SCORE_TEXT[Math.round(s.composite)] || SCORE_TEXT[0];

      // Find natural teammates
      const teammates = (L.topFacultyByFA[s.focus_area_id] || [])
        .filter(t => t.faculty_id !== _labPrimaryFaculty && t.composite >= 3)
        .slice(0, 3);
      const tmNames = teammates.map(t => {
        const tf = L.facultyById[t.faculty_id];
        return tf ? tf.name.split(' ').pop() : '';
      }).filter(Boolean).join(', ');

      html += `
        <div class="fa-card" onclick="labSelectFAFromFaculty('${s.focus_area_id}')" style="cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="fa-card-title"><span class="fa-card-id">${fa.id}</span>${truncate(fa.title, 45)}</div>
            <span style="font-size:16px;font-weight:800;color:${scoreColor}">${s.composite}</span>
          </div>
          ${tmNames ? `<div style="font-size:11px;color:var(--text3);margin-top:4px">Natural teammates: ${tmNames}</div>` : ''}
        </div>`;
    }

    html += '</div></div>';
    resultsEl.innerHTML = html;
    return;
  }

  // Show faculty search results
  let filtered = L.faculty;
  if (q.length >= 2) {
    filtered = L.faculty.filter(f => {
      const searchStr = `${f.name} ${f.department} ${(f.expertise_keywords || []).join(' ')}`.toLowerCase();
      return searchStr.includes(q);
    });
  }

  // Sort: AAII first, then by top composite
  filtered = filtered.slice().sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === 'AAII Affiliated' ? -1 : 1;
    const aTop = (L.topMatchesByFaculty[a.id] || [])[0];
    const bTop = (L.topMatchesByFaculty[b.id] || [])[0];
    return (bTop ? bTop.composite : 0) - (aTop ? aTop.composite : 0);
  }).slice(0, 30);

  let html = '<div class="fac-cards" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">';
  for (const f of filtered) {
    const topMatch = (L.topMatchesByFaculty[f.id] || [])[0];
    const topScore = topMatch ? topMatch.composite : 0;
    const scoreColor = SCORE_TEXT[Math.round(topScore)] || SCORE_TEXT[0];

    html += `
      <div class="card fac-card" onclick="_labPrimaryFaculty=${f.id};renderFacFirstResults()" style="cursor:pointer">
        <div class="fac-header">
          <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
          <div style="flex:1;min-width:0">
            <div class="fac-name">${f.name}</div>
            <div class="fac-dept">${f.department}</div>
          </div>
          <span style="font-size:16px;font-weight:800;color:${scoreColor}">${topScore}</span>
        </div>
      </div>`;
  }
  html += '</div>';
  resultsEl.innerHTML = html;
}

function labSelectFAFromFaculty(faId) {
  _labSelectedFA = faId;
  // Pre-populate team with this faculty as PI
  _labTeam = [{ faculty_id: _labPrimaryFaculty, role: 'pi' }];
  _labView = 'builder';
  renderProposalLab($('content'));
}


/* ═══════════════════════════════════════════════════════
   TEAM-FIRST ENTRY POINT
   ═══════════════════════════════════════════════════════ */

let _labTeamSearch = '';

function renderTeamFirst(container, L, advs) {
  const back = document.createElement('button');
  back.className = 'lab-back';
  back.innerHTML = '&larr; Back to Dashboard';
  back.onclick = () => { _labView = 'dashboard'; _labSelectedFaculty = []; renderProposalLab($('content')); };
  container.appendChild(back);

  const wrap = document.createElement('div');

  // Selected chips
  let chipsHtml = '<div class="chip-area">';
  for (const fid of _labSelectedFaculty) {
    const f = L.facultyById[fid];
    if (!f) continue;
    chipsHtml += `
      <span class="faculty-chip">
        ${f.name}
        <button class="faculty-chip-remove" onclick="labRemoveTeamFaculty(${fid})">&times;</button>
      </span>`;
  }
  if (!_labSelectedFaculty.length) {
    chipsHtml += '<span style="font-size:12px;color:var(--text3);font-style:italic">Select 2 or more faculty to find matching focus areas</span>';
  }
  chipsHtml += '</div>';

  wrap.innerHTML = `
    ${chipsHtml}
    <input class="fac-search" type="text" placeholder="Search faculty to add to team..."
           value="${_labTeamSearch}" oninput="_labTeamSearch=this.value;renderTeamFirstResults()" id="lab-team-search">
    <div id="lab-team-results"></div>
  `;
  container.appendChild(wrap);

  setTimeout(() => renderTeamFirstResults(), 0);
}

function renderTeamFirstResults() {
  const resultsEl = document.getElementById('lab-team-results');
  if (!resultsEl) return;

  const L = DataStore._lookups;
  if (!L) return;

  let html = '';

  // If 2+ selected, show ranked FAs
  if (_labSelectedFaculty.length >= 2) {
    const ranked = Strategy.rankFocusAreasForTeam(_labSelectedFaculty, L);

    html += '<div class="card" style="margin-top:12px"><div class="card-title"><div class="icon" style="background:var(--grad-purple)">' + ICONS.target + '</div>Best Focus Areas for This Team</div>';
    html += '<div style="display:flex;flex-direction:column;gap:4px">';

    for (const r of ranked.slice(0, 15)) {
      const fa = L.focusAreaById[r.focus_area_id];
      if (!fa) continue;
      const scoreColor = SCORE_TEXT[Math.round(r.avgComposite)] || SCORE_TEXT[0];

      html += `
        <div class="fa-card" onclick="labSelectFAFromTeam('${r.focus_area_id}')" style="cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="fa-card-title"><span class="fa-card-id">${fa.id}</span>${truncate(fa.title, 45)}</div>
            <span style="font-size:16px;font-weight:800;color:${scoreColor}">${r.avgComposite}</span>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">${r.memberCount} members scoring · ${r.strongCount} with composite &ge; 2</div>
        </div>`;
    }

    html += '</div></div>';
  }

  // Faculty search grid
  const q = _labTeamSearch.toLowerCase();
  let filtered = L.faculty.filter(f => !_labSelectedFaculty.includes(f.id));
  if (q.length >= 2) {
    filtered = filtered.filter(f => {
      const searchStr = `${f.name} ${f.department} ${(f.expertise_keywords || []).join(' ')}`.toLowerCase();
      return searchStr.includes(q);
    });
  }
  filtered = filtered.slice(0, 20);

  html += '<div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">';
  for (const f of filtered) {
    html += `
      <div class="card" style="padding:10px 14px;cursor:pointer" onclick="labAddTeamFaculty(${f.id})">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]};width:28px;height:28px;font-size:10px">${getInitials(f.name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:#FFF">${f.name}</div>
            <div style="font-size:10px;color:var(--text3)">${f.department}</div>
          </div>
        </div>
      </div>`;
  }
  html += '</div>';

  resultsEl.innerHTML = html;
}

function labAddTeamFaculty(fid) {
  if (!_labSelectedFaculty.includes(fid) && _labSelectedFaculty.length < 6) {
    _labSelectedFaculty.push(fid);
    _labView = 'team';
    renderProposalLab($('content'));
  }
}

function labRemoveTeamFaculty(fid) {
  _labSelectedFaculty = _labSelectedFaculty.filter(id => id !== fid);
  _labView = 'team';
  renderProposalLab($('content'));
}

function labSelectFAFromTeam(faId) {
  _labSelectedFA = faId;
  // Convert selected faculty to team
  _labTeam = _labSelectedFaculty.map((fid, i) => ({
    faculty_id: fid,
    role: i === 0 ? 'pi' : (i <= 2 ? 'co-pi' : 'contributor'),
  }));
  _labView = 'builder';
  renderProposalLab($('content'));
}


/* ═══════════════════════════════════════════════════════
   TEAM BUILDER (Drag-and-Drop)
   ═══════════════════════════════════════════════════════ */

function labStartBuilder(faId, source) {
  _labSelectedFA = faId;
  const L = DataStore._lookups;
  if (L && !_labTeam.length) {
    _labTeam = Strategy.suggestTeam(faId, L);
  }
  _labView = 'builder';
  renderProposalLab($('content'));
}

function renderTeamBuilder(container, L, advs) {
  const fa = L.focusAreaById[_labSelectedFA];
  if (!fa) {
    _labView = 'dashboard';
    renderProposalLab(container);
    return;
  }

  const challenge = L.challengeById[fa.challenge_id];

  // Back button
  const back = document.createElement('button');
  back.className = 'lab-back';
  back.innerHTML = '&larr; Back';
  back.onclick = () => { _labView = 'dashboard'; _labTeam = []; _labAdvantages = []; renderProposalLab($('content')); };
  container.appendChild(back);

  // FA header
  const faHeader = document.createElement('div');
  faHeader.className = 'card';
  faHeader.style.marginBottom = '12px';
  faHeader.innerHTML = `
    <div class="ch-detail-head">
      <span class="code">${fa.id}</span>
      <span class="title">${fa.title}</span>
    </div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">${challenge ? challenge.title : ''}</div>
    <div style="font-size:13px;color:var(--text2);margin-top:8px;line-height:1.6">${fa.description || ''}</div>
  `;
  container.appendChild(faHeader);

  // Two-column: Pool + Team zone / Live profile
  const layout = document.createElement('div');
  layout.className = 'tb-layout';

  // LEFT: Faculty pool
  const left = document.createElement('div');
  left.className = 'tb-left';

  const poolCard = document.createElement('div');
  poolCard.className = 'card';
  poolCard.style.padding = '12px';

  const teamFacultyIds = new Set(_labTeam.map(m => m.faculty_id));
  const poolFaculty = (L.topFacultyByFA[_labSelectedFA] || [])
    .filter(s => s.composite >= 2)
    .slice(0, 30);

  let poolHtml = `
    <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.10em;margin-bottom:8px;padding:0 4px">
      Available Faculty <span style="font-weight:400">(${poolFaculty.length})</span>
    </div>
    <div class="tb-pool">`;

  for (const s of poolFaculty) {
    const f = L.facultyById[s.faculty_id];
    if (!f) continue;
    const inTeam = teamFacultyIds.has(s.faculty_id);
    const scoreColor = SCORE_TEXT[Math.round(s.composite)] || SCORE_TEXT[0];
    const seniority = Strategy.seniorityScore(f, L);
    const isConstrained = f.constraints && f.constraints.max_role === 'contributor';
    const seniorBadge = seniority >= 4 ? '<span class="seniority-badge">Senior</span>' : '';
    const constraintBadge = isConstrained ? '<span class="constraint-badge-sm">Contributor only</span>' : '';

    poolHtml += `
      <div class="tb-pool-card${inTeam ? ' in-team' : ''}"
           draggable="${inTeam ? 'false' : 'true'}"
           ondragstart="tbDragStart(event,${s.faculty_id})"
           ${!inTeam ? `onclick="tbAddToTeam(${s.faculty_id})"` : ''}>
        <div class="tb-pool-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
        <div class="tb-pool-info">
          <div class="tb-pool-name">${f.name} ${seniorBadge}${constraintBadge}</div>
          <div class="tb-pool-dept">${f.department}</div>
        </div>
        <div class="tb-pool-score" style="color:${scoreColor};background:${SCORE_BG[Math.round(s.composite)]}">${s.composite}</div>
      </div>`;
  }
  poolHtml += '</div>';
  poolCard.innerHTML = poolHtml;
  left.appendChild(poolCard);
  layout.appendChild(left);

  // RIGHT: Team zone + Live profile
  const right = document.createElement('div');
  right.className = 'tb-right';

  // Team zone
  const teamZone = document.createElement('div');
  teamZone.className = 'card tb-zone';

  const roles = ['pi', 'co-pi', 'co-pi', 'contributor', 'contributor'];
  const roleLabels = { 'pi': 'PI', 'co-pi': 'Co-PI', 'contributor': 'Contributor' };

  let teamHtml = '<div class="tb-zone-title">Team Composition</div>';

  for (let i = 0; i < Math.max(roles.length, _labTeam.length + 1); i++) {
    const member = _labTeam[i];
    const role = member ? member.role : (roles[i] || 'contributor');
    const label = roleLabels[role] || 'Member';

    if (member) {
      const f = L.facultyById[member.faculty_id];
      if (!f) continue;
      const allScores = L.scoresByFaculty[member.faculty_id] || [];
      const score = allScores.find(s => s.focus_area_id === _labSelectedFA);
      const composite = score ? score.composite : 0;
      const scoreColor = SCORE_TEXT[Math.round(composite)] || SCORE_TEXT[0];

      teamHtml += `
        <div class="tb-slot filled"
             ondragover="tbSlotDragOver(event)" ondrop="tbSlotDrop(event,${i})" ondragleave="tbSlotDragLeave(event)">
          <span class="role-badge role-${role}">${label}</span>
          <div class="tb-slot-member">
            <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]};width:28px;height:28px;font-size:10px">${getInitials(f.name)}</div>
            <div>
              <div class="tb-slot-name">${f.name}</div>
              <div class="tb-slot-dept">${f.department}</div>
            </div>
          </div>
          <span class="tb-slot-score" style="color:${scoreColor}">${composite}</span>
          <button class="tb-slot-remove" onclick="tbRemoveFromTeam(${i})">&times;</button>
        </div>`;
    } else if (i < 5) {
      teamHtml += `
        <div class="tb-slot"
             ondragover="tbSlotDragOver(event)" ondrop="tbSlotDrop(event,${i})" ondragleave="tbSlotDragLeave(event)">
          <span class="tb-slot-label">${label}</span>
          <span class="tb-slot-empty">Drop faculty here or click from pool</span>
        </div>`;
    }
  }

  teamZone.innerHTML = teamHtml;
  right.appendChild(teamZone);

  // Live scoring profile
  const profile = Strategy.computeTeamProfile(_labTeam, _labSelectedFA, L);
  const profileCard = document.createElement('div');
  profileCard.className = 'card live-profile';

  const axes = [
    { label: 'Faculty Fit', value: profile.avgFit, color: 'var(--cyan)' },
    { label: 'Competitive Edge', value: profile.avgEdge, color: 'var(--accent)' },
    { label: 'Team Feasibility', value: profile.avgTeam, color: 'var(--green)' },
    { label: 'Partnership Ready', value: profile.avgPartner, color: 'var(--purple)' },
  ];

  let profileHtml = '<div class="live-profile-title">Team Scoring Profile</div>';
  for (const ax of axes) {
    const pct = Math.min((ax.value / 5) * 100, 100);
    profileHtml += `
      <div class="live-bar-row">
        <div class="live-bar-label">${ax.label}</div>
        <div class="live-bar-track"><div class="live-bar-fill" style="width:${pct}%;background:${ax.color}"></div></div>
        <div class="live-bar-value" style="color:${ax.color}">${ax.value}</div>
      </div>`;
  }

  const compositeColor = SCORE_TEXT[Math.round(profile.avgComposite)] || SCORE_TEXT[3];
  profileHtml += `
    <div class="live-composite">
      <div class="live-composite-value" style="color:${compositeColor}">${profile.avgComposite}</div>
      <div class="live-composite-label">Team Composite</div>
    </div>
    <div class="live-diversity">
      ${profile.departments.map(d => `<span class="live-dept-dot">${d}</span>`).join('')}
    </div>`;

  profileCard.innerHTML = profileHtml;
  right.appendChild(profileCard);

  layout.appendChild(right);
  container.appendChild(layout);

  // Track selector + Build button
  const bottom = document.createElement('div');
  bottom.style.marginTop = '16px';
  bottom.innerHTML = `
    <div class="card" style="padding:20px 28px">
      <div class="section-title" style="margin-bottom:12px">Proposal Track</div>
      <div class="track-selector">
        <div class="track-option${_labTrack === 'aaii-led' ? ' selected' : ''}" onclick="_labTrack='aaii-led';renderProposalLab($('content'))">
          <div class="track-option-label" style="color:var(--accent)">AAII-Led</div>
          <div class="track-option-desc">AAII leads the proposal team and coordinates the research direction</div>
        </div>
        <div class="track-option${_labTrack === 'aaii-supported' ? ' selected' : ''}" onclick="_labTrack='aaii-supported';renderProposalLab($('content'))">
          <div class="track-option-label" style="color:var(--cyan)">AAII-Supported</div>
          <div class="track-option-desc">Faculty leads the research. AAII provides infrastructure and coordination support</div>
        </div>
        <div class="track-option${_labTrack === 'faculty-led' ? ' selected' : ''}" onclick="_labTrack='faculty-led';renderProposalLab($('content'))">
          <div class="track-option-label" style="color:var(--purple)">Faculty-Led</div>
          <div class="track-option-desc">Faculty-driven proposal. AAII participates as a contributing partner</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <button class="build-pkg-btn" onclick="labBuildPackage()" ${_labTeam.length === 0 ? 'disabled' : ''}>
          ${ICONS.clipboard} Save Proposal Package
        </button>
        <span style="font-size:12px;color:var(--text3)">${_labTeam.length} team member${_labTeam.length !== 1 ? 's' : ''} · ${profile.departmentCount} department${profile.departmentCount !== 1 ? 's' : ''}</span>
      </div>
    </div>`;
  container.appendChild(bottom);
}

/* Team builder drag-and-drop */
let _tbDragFacultyId = null;

function tbDragStart(e, fid) {
  _tbDragFacultyId = fid;
  e.dataTransfer.effectAllowed = 'move';
}

function tbSlotDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function tbSlotDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function tbSlotDrop(e, slotIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (_tbDragFacultyId === null) return;

  const roles = ['pi', 'co-pi', 'co-pi', 'contributor', 'contributor'];
  const role = roles[slotIdx] || 'contributor';

  // Remove if already in team
  _labTeam = _labTeam.filter(m => m.faculty_id !== _tbDragFacultyId);

  // Insert at position
  _labTeam.splice(slotIdx, 0, { faculty_id: _tbDragFacultyId, role });

  // Ensure only one PI
  let piCount = 0;
  for (const m of _labTeam) {
    if (m.role === 'pi') piCount++;
    if (piCount > 1) m.role = 'co-pi';
  }

  _tbDragFacultyId = null;
  renderProposalLab($('content'));
}

function tbAddToTeam(fid) {
  if (_labTeam.find(m => m.faculty_id === fid)) return;
  const L = DataStore._lookups;
  const f = L ? L.facultyById[fid] : null;
  let role = _labTeam.length === 0 ? 'pi' : (_labTeam.length <= 2 ? 'co-pi' : 'contributor');
  // Enforce constraints
  if (f && !Strategy.canServeAs(f, role)) {
    role = 'contributor';
    showToast(`${f.name} can only serve as Contributor (${f.constraints.reason})`);
  }
  _labTeam.push({ faculty_id: fid, role });
  renderProposalLab($('content'));
}

function tbRemoveFromTeam(idx) {
  _labTeam.splice(idx, 1);
  // Reassign PI if removed
  if (_labTeam.length > 0 && !_labTeam.find(m => m.role === 'pi')) {
    _labTeam[0].role = 'pi';
  }
  renderProposalLab($('content'));
}


/* ═══════════════════════════════════════════════════════
   BUILD & SAVE PACKAGE
   ═══════════════════════════════════════════════════════ */

function labBuildPackage() {
  const L = DataStore._lookups;
  if (!L || !_labSelectedFA || !_labTeam.length) return;

  const fa = L.focusAreaById[_labSelectedFA];
  const concept = Strategy.generateConceptSeed(_labTeam, _labSelectedFA, L, _labAdvantages);

  const pkg = PackageStore.createBlank({
    track: _labTrack,
    focus_area_id: _labSelectedFA,
    challenge_id: fa ? fa.challenge_id : null,
    team: [..._labTeam],
    concept_title: concept.title,
    concept_seed: concept.seed,
    advantages: [..._labAdvantages],
  });

  PackageStore.save(pkg);
  _labEditingPkg = pkg;
  _labView = 'package-detail';
  showToast('Package saved');
  renderProposalLab($('content'));
}


/* ═══════════════════════════════════════════════════════
   PACKAGE DETAIL VIEW
   ═══════════════════════════════════════════════════════ */

function renderPackageDetail(container, L, advs) {
  const pkg = _labEditingPkg;
  if (!pkg) {
    _labView = 'packages';
    renderProposalLab(container);
    return;
  }

  const fa = L.focusAreaById[pkg.focus_area_id];
  const challenge = fa ? L.challengeById[fa.challenge_id] : null;
  const profile = Strategy.computeTeamProfile(pkg.team, pkg.focus_area_id, L);

  // Back button
  const back = document.createElement('button');
  back.className = 'lab-back';
  back.innerHTML = '&larr; Back to Packages';
  back.onclick = () => { _labView = 'packages'; renderProposalLab($('content')); };
  container.appendChild(back);

  const card = document.createElement('div');
  card.className = 'card pkg-card';

  // Header
  let html = `
    <div class="pkg-header">
      <div class="pkg-badges">
        ${trackBadge(pkg.track)}
        ${statusBadge(pkg.status)}
      </div>
      <div class="pkg-challenge">${challenge ? challenge.id + ': ' + challenge.title : ''}</div>
      <div class="pkg-fa-title">${fa ? fa.id + ': ' + fa.title : 'Unknown Focus Area'}</div>
      <div class="pkg-fa-desc">${fa ? truncate(fa.description || '', 200) : ''}</div>
    </div>`;

  // Team
  html += '<div class="pkg-team"><div class="pkg-team-title">Team</div><div class="pkg-team-grid">';
  for (const m of pkg.team) {
    const f = L.facultyById[m.faculty_id];
    if (!f) continue;
    const allScores = L.scoresByFaculty[m.faculty_id] || [];
    const score = allScores.find(s => s.focus_area_id === pkg.focus_area_id);
    const composite = score ? score.composite : 0;
    const scoreColor = SCORE_TEXT[Math.round(composite)] || SCORE_TEXT[0];

    html += `
      <div class="pkg-member">
        <div class="pkg-member-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
        <div class="pkg-member-info">
          <div class="pkg-member-name">${f.name} <span class="role-badge role-${m.role}">${m.role.replace('-', ' ')}</span></div>
          <div class="pkg-member-dept">${f.department}</div>
        </div>
        <div class="pkg-member-score" style="color:${scoreColor}">${composite}</div>
      </div>`;
  }
  html += '</div></div>';

  // Scoring profile + Advantages
  const axes = [
    { label: 'Faculty Fit', value: profile.avgFit, color: 'var(--cyan)' },
    { label: 'Competitive Edge', value: profile.avgEdge, color: 'var(--accent)' },
    { label: 'Team Feasibility', value: profile.avgTeam, color: 'var(--green)' },
    { label: 'Partnership Ready', value: profile.avgPartner, color: 'var(--purple)' },
  ];

  html += '<div class="pkg-scoring"><div class="pkg-scoring-bars">';
  html += '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.10em;margin-bottom:12px">Scoring Profile</div>';
  for (const ax of axes) {
    const pct = Math.min((ax.value / 5) * 100, 100);
    html += `
      <div class="live-bar-row">
        <div class="live-bar-label">${ax.label}</div>
        <div class="live-bar-track"><div class="live-bar-fill" style="width:${pct}%;background:${ax.color}"></div></div>
        <div class="live-bar-value" style="color:${ax.color}">${ax.value}</div>
      </div>`;
  }
  const compositeColor = SCORE_TEXT[Math.round(profile.avgComposite)] || SCORE_TEXT[3];
  html += `<div style="text-align:center;margin-top:12px"><span style="font-size:28px;font-weight:800;color:${compositeColor}">${profile.avgComposite}</span><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px">Team Composite</div></div>`;
  html += '</div>';

  // Advantages
  html += '<div class="pkg-scoring-advs">';
  html += '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.10em;margin-bottom:6px">UTEP Advantages</div>';
  html += '<div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:12px;padding:8px 10px;background:rgba(56,189,248,0.04);border-left:2px solid var(--cyan);border-radius:0 var(--radius-sm) var(--radius-sm) 0">Selected advantages are included in the exported Word document and provided as context when generating AI research directions. Check the items that strengthen this specific proposal.</div>';
  const selectedCount = (pkg.advantages || []).length;
  html += `<div style="font-size:10px;color:var(--accent);margin-bottom:8px">${selectedCount} selected</div>`;
  const advCategories = [
    { label: 'Geographic', items: advs.geographic || [] },
    { label: 'Institutional', items: advs.institutional || [] },
    { label: 'Infrastructure', items: advs.infrastructure || [] },
  ];
  for (const cat of advCategories) {
    html += `<div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px;margin-top:8px">${cat.label}</div>`;
    for (const adv of cat.items) {
      const isSelected = (pkg.advantages || []).includes(adv.id);
      html += `
        <div class="adv-item${isSelected ? ' selected' : ''}" onclick="togglePkgAdvantage('${adv.id}')" title="${escapeHtml(adv.description)}">
          <div class="adv-check">${isSelected ? '&#10003;' : ''}</div>
          <div>
            <div class="adv-item-title">${adv.title}</div>
            <div style="font-size:10px;color:var(--text3);line-height:1.4;margin-top:2px">${adv.description ? adv.description.substring(0, 80) + (adv.description.length > 80 ? '...' : '') : ''}</div>
          </div>
        </div>`;
    }
  }
  html += '</div></div>';

  // Concept
  html += `
    <div class="pkg-concept">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px">
        <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.10em">Research Concept</div>
        <div style="display:flex;gap:6px">
          ${pkg.concept_directions ? `<button onclick="showDirectionsModal(_labEditingPkg.concept_directions, DataStore._lookups.focusAreaById[_labEditingPkg.focus_area_id], DataStore._lookups.challengeById[DataStore._lookups.focusAreaById[_labEditingPkg.focus_area_id]?.challenge_id])" style="padding:6px 14px;border-radius:var(--radius-sm);border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.08);color:var(--cyan);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font)">${ICONS.bulb} View Directions</button>` : ''}
          <button class="generate-concept-btn" id="generate-concept-btn" onclick="labGenerateConcept()">
            ${ICONS.zap} Generate Research Directions
          </button>
        </div>
      </div>
      <input class="pkg-concept-title-input" type="text" value="${escapeHtml(pkg.concept_title)}" placeholder="Concept title..." onchange="updatePkgField('concept_title',this.value)">
      <textarea class="pkg-concept-seed" id="pkg-concept-textarea" onchange="updatePkgField('concept_seed',this.value)" placeholder="Research concept description..." style="min-height:200px;font-size:12px;line-height:1.7">${escapeHtml(pkg.concept_seed)}</textarea>
      <textarea class="pkg-notes" onchange="updatePkgField('notes',this.value)" placeholder="Curator notes (internal, not shared)...">${escapeHtml(pkg.notes || '')}</textarea>
    </div>`;

  // ─── Keywords Section ───
  html += `
    <div class="pkg-keywords">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.10em">Literature Review Keywords</div>
        <button class="generate-concept-btn" id="generate-keywords-btn" onclick="labGenerateKeywords()">
          ${ICONS.key} Generate Keywords
        </button>
      </div>
      <div class="lab-didactic" style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:12px;padding:10px 14px;background:rgba(139,92,246,0.04);border-left:3px solid var(--purple);border-radius:0 var(--radius-sm) var(--radius-sm) 0">
        Keywords help the team conduct targeted literature reviews. Intersection keywords are particularly valuable as they represent the unique space where this team's combined expertise meets the challenge requirements.
      </div>
      <div id="keywords-display">${renderKeywordsDisplay(pkg.keywords)}</div>
    </div>`;

  // Actions
  html += `
    <div class="pkg-actions">
      <button class="pkg-btn pkg-btn-primary" onclick="labExportDocx()">
        ${ICONS.download} Export to Word
      </button>
      <button class="pkg-btn" onclick="labEditTeam()">
        ${ICONS.users} Edit Team
      </button>
      <button class="pkg-btn" onclick="labCopyShareLink()">
        ${ICONS.link} Copy Share Link
      </button>
      <select style="padding:6px 10px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);color:var(--text2);font-size:12px;font-family:var(--font)" onchange="updatePkgField('status',this.value)">
        <option value="draft" ${pkg.status === 'draft' ? 'selected' : ''}>Draft</option>
        <option value="ready" ${pkg.status === 'ready' ? 'selected' : ''}>Ready</option>
        <option value="shared" ${pkg.status === 'shared' ? 'selected' : ''}>Shared</option>
      </select>
      <button class="pkg-btn pkg-btn-danger" onclick="labDeletePackage('${pkg.id}')" style="margin-left:auto">
        &times; Delete
      </button>
    </div>`;

  card.innerHTML = html;
  container.appendChild(card);
}

function togglePkgAdvantage(advId) {
  if (!_labEditingPkg) return;
  const advs = _labEditingPkg.advantages || [];
  const idx = advs.indexOf(advId);
  if (idx >= 0) advs.splice(idx, 1);
  else advs.push(advId);
  _labEditingPkg.advantages = advs;
  PackageStore.save(_labEditingPkg);
  renderProposalLab($('content'));
}

function updatePkgField(field, value) {
  if (!_labEditingPkg) return;
  _labEditingPkg[field] = value;
  PackageStore.save(_labEditingPkg);
}

function labEditTeam() {
  if (!_labEditingPkg) return;
  _labSelectedFA = _labEditingPkg.focus_area_id;
  _labTeam = [..._labEditingPkg.team];
  _labTrack = _labEditingPkg.track;
  _labAdvantages = [...(_labEditingPkg.advantages || [])];
  _labView = 'builder';
  renderProposalLab($('content'));
}

async function labGenerateConcept() {
  if (!_labEditingPkg) return;
  const L = DataStore._lookups;
  if (!L) return;

  const pkg = _labEditingPkg;
  const fa = L.focusAreaById[pkg.focus_area_id];
  const challenge = fa ? L.challengeById[fa.challenge_id] : null;
  const advs = await getAdvantages();

  // Gather team member details
  const teamData = pkg.team.map(m => {
    const f = L.facultyById[m.faculty_id];
    if (!f) return null;
    return {
      name: f.name,
      department: f.department,
      title: f.title || '',
      expertise_keywords: f.expertise_keywords || [],
      scholar_metrics: f.scholar_metrics || {},
      role: m.role,
    };
  }).filter(Boolean);

  // Gather selected advantages as text
  const allAdvs = [...(advs.geographic || []), ...(advs.institutional || []), ...(advs.infrastructure || [])];
  const selectedAdvs = allAdvs.filter(a => (pkg.advantages || []).includes(a.id)).map(a => a.title);

  // UI loading state
  const btn = document.getElementById('generate-concept-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = ICONS.zap + ' Generating...'; }

  try {
    const resp = await fetch('/api/generate-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus_area: fa ? { title: fa.title, description: fa.description } : {},
        challenge: challenge ? { title: challenge.title } : {},
        team: teamData,
        advantages: selectedAdvs,
      }),
    });

    const data = await resp.json();
    if (data.error) {
      showToast('Error: ' + data.error);
      return;
    }

    // Handle structured JSON response
    if (data.directions) {
      pkg.concept_directions = data.directions;
      pkg.concept_seed = data.directions.map((d, i) => `${i + 1}. ${d.title}\n${d.approach}\n${d.team_rationale}`).join('\n\n');
      pkg.concept_title = data.directions[0]?.title || (fa ? fa.title : pkg.concept_title);
    } else if (data.concepts) {
      pkg.concept_seed = data.concepts;
      pkg.concept_title = fa ? fa.title : pkg.concept_title;
    }
    PackageStore.save(pkg);

    // Show visual modal if structured data available
    if (pkg.concept_directions) {
      showDirectionsModal(pkg.concept_directions, fa, challenge);
    }

    // Update textarea
    const textarea = document.getElementById('pkg-concept-textarea');
    if (textarea) textarea.value = pkg.concept_seed;

    showToast('Research directions generated');
  } catch (e) {
    showToast('Failed to generate concepts. Check your connection.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = ICONS.zap + ' Generate Research Directions'; }
  }
}

function labCopyShareLink() {
  if (!_labEditingPkg) return;
  const encoded = PackageStore.encodeForURL(_labEditingPkg);
  const url = `${window.location.origin}${window.location.pathname}?pkg=${encoded}`;
  navigator.clipboard.writeText(url).then(() => showToast('Share link copied to clipboard'));
}

function labExportSummary() {
  if (!_labEditingPkg) return;
  const L = DataStore._lookups;
  const pkg = _labEditingPkg;
  const fa = L.focusAreaById[pkg.focus_area_id];
  const challenge = fa ? L.challengeById[fa.challenge_id] : null;
  const profile = Strategy.computeTeamProfile(pkg.team, pkg.focus_area_id, L);

  let md = `# Proposal Package: ${pkg.concept_title || 'Untitled'}\n\n`;
  md += `**Track:** ${pkg.track}\n`;
  md += `**Challenge:** ${challenge ? challenge.id + ' - ' + challenge.title : 'N/A'}\n`;
  md += `**Focus Area:** ${fa ? fa.id + ' - ' + fa.title : 'N/A'}\n\n`;
  md += `## Team (Composite: ${profile.avgComposite})\n\n`;

  for (const m of pkg.team) {
    const f = L.facultyById[m.faculty_id];
    if (!f) continue;
    md += `- **${f.name}** (${m.role.toUpperCase()}) - ${f.department}\n`;
  }

  md += `\n## Research Concept\n\n${pkg.concept_seed}\n`;
  if (pkg.notes) md += `\n## Notes\n\n${pkg.notes}\n`;

  navigator.clipboard.writeText(md).then(() => showToast('Summary copied to clipboard'));
}

function labDeletePackage(pkgId) {
  if (confirm('Delete this proposal package?')) {
    PackageStore.delete(pkgId);
    _labEditingPkg = null;
    _labView = 'packages';
    renderProposalLab($('content'));
  }
}


/* ═══════════════════════════════════════════════════════
   PACKAGE MANAGER
   ═══════════════════════════════════════════════════════ */

let _pkgFilterTrack = 'all';
let _pkgFilterStatus = 'all';

function renderPackageManager(container, L, advs) {
  const back = document.createElement('button');
  back.className = 'lab-back';
  back.innerHTML = '&larr; Back to Dashboard';
  back.onclick = () => { _labView = 'dashboard'; renderProposalLab($('content')); };
  container.appendChild(back);

  let pkgs = PackageStore.list();
  const trackCounts = PackageStore.countByTrack();
  const statusCounts = PackageStore.countByStatus();
  const conflicts = PackageStore.findPIConflicts();

  // Stats bar
  const stats = document.createElement('div');
  stats.className = 'pkg-mgmt-stats';
  stats.innerHTML = `
    <strong>${pkgs.length} Packages</strong>
    <span>${trackCounts['aaii-led']} AAII-Led</span>
    <span>${trackCounts['aaii-supported']} Supported</span>
    <span>${trackCounts['faculty-led']} Faculty-Led</span>
    <span class="filter-sep"></span>
    <span>${statusCounts.draft} Draft</span>
    <span>${statusCounts.ready} Ready</span>
    <span>${statusCounts.shared} Shared</span>
    ${Object.keys(conflicts).length ? `<span class="conflict-badge">${Object.keys(conflicts).length} PI Conflict${Object.keys(conflicts).length > 1 ? 's' : ''}</span>` : ''}
  `;
  container.appendChild(stats);

  // Filters
  const filters = document.createElement('div');
  filters.className = 'filter-row';
  filters.innerHTML = `
    <button class="filter-btn${_pkgFilterTrack === 'all' ? ' active' : ''}" onclick="_pkgFilterTrack='all';renderProposalLab($('content'))">All Tracks</button>
    <button class="filter-btn${_pkgFilterTrack === 'aaii-led' ? ' active' : ''}" onclick="_pkgFilterTrack='aaii-led';renderProposalLab($('content'))">AAII-Led</button>
    <button class="filter-btn${_pkgFilterTrack === 'aaii-supported' ? ' active' : ''}" onclick="_pkgFilterTrack='aaii-supported';renderProposalLab($('content'))">Supported</button>
    <button class="filter-btn${_pkgFilterTrack === 'faculty-led' ? ' active' : ''}" onclick="_pkgFilterTrack='faculty-led';renderProposalLab($('content'))">Faculty-Led</button>
    <div class="filter-sep"></div>
    <button class="filter-btn${_pkgFilterStatus === 'all' ? ' active' : ''}" onclick="_pkgFilterStatus='all';renderProposalLab($('content'))">All Status</button>
    <button class="filter-btn${_pkgFilterStatus === 'draft' ? ' active' : ''}" onclick="_pkgFilterStatus='draft';renderProposalLab($('content'))">Draft</button>
    <button class="filter-btn${_pkgFilterStatus === 'ready' ? ' active' : ''}" onclick="_pkgFilterStatus='ready';renderProposalLab($('content'))">Ready</button>
    <button class="filter-btn${_pkgFilterStatus === 'shared' ? ' active' : ''}" onclick="_pkgFilterStatus='shared';renderProposalLab($('content'))">Shared</button>
  `;
  container.appendChild(filters);

  // Apply filters
  if (_pkgFilterTrack !== 'all') pkgs = pkgs.filter(p => p.track === _pkgFilterTrack);
  if (_pkgFilterStatus !== 'all') pkgs = pkgs.filter(p => p.status === _pkgFilterStatus);

  if (!pkgs.length) {
    container.innerHTML += '<div class="card" style="padding:40px;text-align:center"><p style="color:var(--text3)">No packages yet. Use the entry points above to build your first proposal package.</p></div>';
    return;
  }

  // Package grid
  const grid = document.createElement('div');
  grid.className = 'pkg-grid';

  for (const pkg of pkgs) {
    const fa = L.focusAreaById[pkg.focus_area_id];
    const profile = Strategy.computeTeamProfile(pkg.team, pkg.focus_area_id, L);
    const compositeColor = SCORE_TEXT[Math.round(profile.avgComposite)] || SCORE_TEXT[3];

    const teamNames = pkg.team.map(m => {
      const f = L.facultyById[m.faculty_id];
      return f ? (m.role === 'pi' ? f.name + ' (PI)' : f.name.split(' ').pop()) : '';
    }).filter(Boolean).join(', ');

    const pi = pkg.team.find(m => m.role === 'pi');
    const hasConflict = pi && conflicts[pi.faculty_id];

    const pkgCard = document.createElement('div');
    pkgCard.className = 'card pkg-summary';
    pkgCard.onclick = () => { _labEditingPkg = pkg; _labView = 'package-detail'; renderProposalLab($('content')); };
    pkgCard.innerHTML = `
      <div class="pkg-summary-badges">
        ${trackBadge(pkg.track)}
        ${statusBadge(pkg.status)}
        ${hasConflict ? '<span class="conflict-badge">PI Conflict</span>' : ''}
      </div>
      <div class="pkg-summary-fa">${fa ? fa.id + ': ' + truncate(fa.title, 35) : 'Unknown FA'}</div>
      <div class="pkg-summary-team">${teamNames}</div>
      <div class="pkg-summary-footer">
        <span>${new Date(pkg.updated).toLocaleDateString()}</span>
        <span class="pkg-summary-composite" style="color:${compositeColor}">${profile.avgComposite}</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--card-border)">
        <button onclick="event.stopPropagation();_labEditingPkg=PackageStore.get('${pkg.id}');_labView='package-detail';renderProposalLab($('content'))" style="flex:1;padding:5px;border-radius:var(--radius-sm);border:1px solid rgba(56,189,248,0.2);background:rgba(56,189,248,0.06);color:var(--cyan);font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)">${ICONS.fileText} Edit</button>
        <button onclick="event.stopPropagation();if(confirm('Delete this package?')){PackageStore.delete('${pkg.id}');renderProposalLab($('content'))}" style="padding:5px 10px;border-radius:var(--radius-sm);border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.06);color:#EF4444;font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)">&times;</button>
      </div>
    `;
    grid.appendChild(pkgCard);
  }

  container.appendChild(grid);
}


/* ═══════════════════════════════════════════════════════
   SHARED VIEW (Read-Only)
   ═══════════════════════════════════════════════════════ */

function renderSharedView(container, encoded, L, advs) {
  const pkg = PackageStore.decodeFromURL(encoded);
  if (!pkg) {
    container.innerHTML = '<div class="card" style="padding:40px;text-align:center"><p style="color:var(--text3)">Invalid or expired package link.</p></div>';
    return;
  }

  const fa = L.focusAreaById[pkg.focus_area_id];
  const challenge = fa ? L.challengeById[fa.challenge_id] : null;
  const profile = Strategy.computeTeamProfile(pkg.team, pkg.focus_area_id, L);

  // Header
  container.innerHTML = `
    <div class="shared-header">
      <div class="shared-label">AAII x Genesis 2.0</div>
      <div class="shared-title">Proposal Recommendation</div>
      <div class="shared-subtitle">${challenge ? challenge.title : ''}</div>
    </div>`;

  // Reuse package detail rendering (read-only version)
  _labEditingPkg = pkg;
  renderPackageDetail(container, L, advs);

  // Evidence panel
  const evidence = document.createElement('div');
  evidence.className = 'evidence-panel';
  let evHtml = '<div class="card" style="margin-top:16px"><div class="card-title"><div class="icon" style="background:var(--grad-blue)">' + ICONS.book + '</div>Evidence & Faculty Profiles</div>';

  for (const m of pkg.team) {
    const f = L.facultyById[m.faculty_id];
    if (!f) continue;
    const allScores = L.scoresByFaculty[m.faculty_id] || [];
    const score = allScores.find(s => s.focus_area_id === pkg.focus_area_id);

    evHtml += `
      <div class="evidence-member card" style="margin-bottom:8px">
        <div class="evidence-member-header">
          <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
          <div>
            <div class="fac-name">${f.name} <span class="role-badge role-${m.role}">${m.role.replace('-', ' ')}</span></div>
            <div class="fac-dept">${f.department} · ${f.title || ''}</div>
          </div>
        </div>
        <div class="evidence-member-bio">${truncate(f.bio || '', 300)}</div>
        <div class="evidence-keywords">${(f.expertise_keywords || []).slice(0, 8).map(k => `<span class="evidence-kw">${k}</span>`).join('')}</div>
        ${score ? `<div style="display:flex;gap:4px;flex-wrap:wrap">
          ${scoreBadge(score.faculty_fit, 'Fit')}
          ${scoreBadge(score.competitive_edge, 'Edge')}
          ${scoreBadge(score.team_feasibility, 'Team')}
          ${scoreBadge(score.partnership_readiness, 'Partner')}
          ${scoreBadge(score.composite, 'Composite')}
        </div>` : ''}
      </div>`;
  }

  evHtml += '</div>';
  evidence.innerHTML = evHtml;
  container.appendChild(evidence);
}


/* ═══════════════════════════════════════════════════════
   RESEARCH DIRECTIONS MODAL
   ═══════════════════════════════════════════════════════ */

let _dirModalPage = 0;

function showDirectionsModal(directions, fa, challenge) {
  if (!directions || !directions.length) return;
  _dirModalPage = 0;

  const existing = document.getElementById('dir-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dir-modal-overlay';
  overlay.className = 'fac-modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeDirectionsModal(); };

  const colors = ['var(--cyan)', 'var(--accent)', 'var(--green)'];
  const bgColors = ['rgba(56,189,248,0.06)', 'rgba(255,130,0,0.06)', 'rgba(34,197,94,0.06)'];

  let html = `<div class="dir-modal">
    <button class="fac-modal-close" onclick="closeDirectionsModal()">&times;</button>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">AI-Generated Research Directions</div>
      <div style="font-size:15px;font-weight:800;color:#FFF">${fa ? fa.title : ''}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">${challenge ? challenge.title : ''}</div>
    </div>
    <div style="display:flex;justify-content:center;gap:8px;margin-bottom:20px">`;

  for (let i = 0; i < directions.length; i++) {
    html += `<button class="dir-nav-btn${i === 0 ? ' active' : ''}" onclick="switchDirectionPage(${i})" style="padding:8px 20px;border-radius:20px;border:1px solid ${colors[i]}40;background:${i === 0 ? bgColors[i] : 'transparent'};color:${colors[i]};font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);transition:all 0.2s">Direction ${i + 1}</button>`;
  }
  html += `</div>`;

  for (let i = 0; i < directions.length; i++) {
    const d = directions[i];
    const c = colors[i % colors.length];
    const bg = bgColors[i % bgColors.length];

    html += `<div class="dir-page" id="dir-page-${i}" style="display:${i === 0 ? 'block' : 'none'}">
      <div style="border-top:3px solid ${c};border-radius:var(--radius);background:${bg};padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;color:#FFF;margin-bottom:16px">${d.title || 'Research Direction ' + (i+1)}</h3>

        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Technical Approach</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">${d.approach || ''}</div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Why This Team</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">${d.team_rationale || ''}</div>
        </div>

        ${d.key_questions && d.key_questions.length ? `<div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Key Research Questions</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${d.key_questions.map(q => `<div style="display:flex;gap:8px;font-size:12px;color:var(--text2);line-height:1.5"><span style="color:${c};flex-shrink:0">?</span>${q}</div>`).join('')}
          </div>
        </div>` : ''}

        ${d.potential_impact ? `<div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Potential Impact</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">${d.potential_impact}</div>
        </div>` : ''}

        ${d.suggested_next_steps && d.suggested_next_steps.length ? `<div>
          <div style="font-size:10px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Suggested Next Steps</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${d.suggested_next_steps.map((s, j) => `<div style="display:flex;gap:8px;font-size:12px;color:var(--text2);line-height:1.5"><span style="color:${c};font-weight:800;flex-shrink:0">${j+1}.</span>${s}</div>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>`;
  }

  html += `</div>`;
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

function switchDirectionPage(idx) {
  _dirModalPage = idx;
  document.querySelectorAll('.dir-page').forEach((p, i) => { p.style.display = i === idx ? 'block' : 'none'; });
  document.querySelectorAll('.dir-nav-btn').forEach((b, i) => { b.classList.toggle('active', i === idx); b.style.background = i === idx ? ['rgba(56,189,248,0.06)','rgba(255,130,0,0.06)','rgba(34,197,94,0.06)'][i] : 'transparent'; });
}

function closeDirectionsModal() {
  const overlay = document.getElementById('dir-modal-overlay');
  if (overlay) overlay.remove();
}


/* ═══════════════════════════════════════════════════════
   KEYWORD GENERATION
   ═══════════════════════════════════════════════════════ */

function renderKeywordsDisplay(keywords) {
  if (!keywords || (!keywords.core_topics && !keywords.expertise_intersections)) {
    return '<div style="font-size:12px;color:var(--text3);padding:12px;text-align:center">Click "Generate Keywords" to create structured keyword sets for this team and focus area.</div>';
  }

  const categories = [
    { key: 'core_topics', label: 'Core Topics', color: 'var(--cyan)', bg: 'rgba(56,189,248,0.10)' },
    { key: 'expertise_intersections', label: 'Expertise Intersections', color: 'var(--accent)', bg: 'rgba(255,130,0,0.10)' },
    { key: 'methodological', label: 'Methodological', color: 'var(--green)', bg: 'rgba(34,197,94,0.10)' },
    { key: 'application_domains', label: 'Application Domains', color: 'var(--purple)', bg: 'rgba(139,92,246,0.10)' },
  ];

  let html = '<div class="keywords-grid">';
  for (const cat of categories) {
    const kws = keywords[cat.key] || [];
    if (!kws.length) continue;
    html += `<div class="keyword-category">
      <div class="keyword-cat-label" style="color:${cat.color}">${cat.label}</div>
      <div class="keyword-tags">
        ${kws.map(k => `<span class="keyword-tag" style="background:${cat.bg};color:${cat.color};border:1px solid ${cat.color}30">${k}</span>`).join('')}
      </div>
    </div>`;
  }
  html += '</div>';

  // Search strings
  const searches = keywords.search_strings || [];
  if (searches.length) {
    html += `<div style="margin-top:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Suggested Search Strings</div>
      <div class="search-strings">
        ${searches.map(s => `<div class="search-string-chip" onclick="navigator.clipboard.writeText(this.textContent.trim());showToast('Copied to clipboard')">${s}</div>`).join('')}
      </div>
    </div>`;
  }

  return html;
}

async function labGenerateKeywords() {
  if (!_labEditingPkg) return;
  const L = DataStore._lookups;
  if (!L) return;

  const pkg = _labEditingPkg;
  const fa = L.focusAreaById[pkg.focus_area_id];
  const challenge = fa ? L.challengeById[fa.challenge_id] : null;

  const teamData = pkg.team.map(m => {
    const f = L.facultyById[m.faculty_id];
    if (!f) return null;
    return {
      name: f.name,
      department: f.department,
      title: f.title || '',
      expertise_keywords: f.expertise_keywords || [],
      scholar_metrics: f.scholar_metrics || {},
      role: m.role,
    };
  }).filter(Boolean);

  const btn = document.getElementById('generate-keywords-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = ICONS.key + ' Generating...'; }

  try {
    const resp = await fetch('/api/generate-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus_area: fa ? { id: fa.id, title: fa.title, description: fa.description } : {},
        challenge: challenge ? { title: challenge.title } : {},
        team: teamData,
      }),
    });

    const data = await resp.json();
    if (data.error) {
      showToast('Error: ' + data.error);
      return;
    }

    // Save keywords to package
    pkg.keywords = data;
    PackageStore.save(pkg);
    _labKeywords = data;

    // Update display
    const display = document.getElementById('keywords-display');
    if (display) display.innerHTML = renderKeywordsDisplay(data);

    showToast('Keywords generated');
  } catch (e) {
    showToast('Failed to generate keywords. Check your connection.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = ICONS.key + ' Generate Keywords'; }
  }
}


/* ═══════════════════════════════════════════════════════
   WORD DOCUMENT EXPORT
   ═══════════════════════════════════════════════════════ */

async function labExportDocx() {
  if (!_labEditingPkg) return;
  const L = DataStore._lookups;
  if (!L) return;

  const pkg = _labEditingPkg;
  const fa = L.focusAreaById[pkg.focus_area_id];
  const challenge = fa ? L.challengeById[fa.challenge_id] : null;
  const profile = Strategy.computeTeamProfile(pkg.team, pkg.focus_area_id, L);
  const advs = await getAdvantages();

  // Build team data with full info
  const teamData = pkg.team.map(m => {
    const f = L.facultyById[m.faculty_id];
    if (!f) return null;
    const allScores = L.scoresByFaculty[m.faculty_id] || [];
    const score = allScores.find(s => s.focus_area_id === pkg.focus_area_id);
    return {
      name: f.name,
      role: m.role,
      department: f.department,
      title: f.title || '',
      expertise_keywords: f.expertise_keywords || [],
      composite: score ? score.composite : 0,
    };
  }).filter(Boolean);

  // Build advantages text
  const allAdvs = [...(advs.geographic || []), ...(advs.institutional || []), ...(advs.infrastructure || [])];
  const selectedAdvs = allAdvs.filter(a => (pkg.advantages || []).includes(a.id)).map(a => a.title);

  showToast('Generating Word document...');

  try {
    const resp = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus_area: fa ? { id: fa.id, title: fa.title, description: fa.description } : {},
        challenge: challenge ? { id: challenge.id, title: challenge.title } : {},
        team: teamData,
        track: pkg.track,
        concepts: pkg.concept_seed || '',
        keywords: pkg.keywords || {},
        advantages: selectedAdvs,
        scoring: {
          faculty_fit: profile.avgFit,
          competitive_edge: profile.avgEdge,
          team_feasibility: profile.avgTeam,
          partnership_readiness: profile.avgPartner,
          composite: profile.avgComposite,
        },
      }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      showToast('Export failed: ' + (err.error || 'Unknown error'));
      return;
    }

    // Download the file
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Genesis_Proposal_${fa ? fa.id : 'package'}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Word document downloaded');
  } catch (e) {
    showToast('Export failed. Check your connection.');
  }
}


/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'lab-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
