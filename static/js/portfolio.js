/* ═══ AAII Portfolio Optimizer ═══ */

/* ─── State ─── */
let _portfolioSize = 8;
let _portfolioResults = null;
let _portfolioLocked = [];    // [{faculty_id, focus_area_id}]
let _maxProposalsPerFaculty = 3;

/* ─── Portfolio Optimizer Core ─── */

const PortfolioOptimizer = {

  /** Phase 1: Filter to AAII-relevant focus areas */
  filterAAIIFocusAreas(L, minAAIIStrong = 2) {
    const eligible = [];
    for (const fa of L.focusAreas) {
      const opp = Strategy.computeAAIIOpportunityScore(fa.id, L);
      if (opp.aaiiStrongCount >= minAAIIStrong) {
        const challenge = L.challengeById[fa.challenge_id];
        eligible.push({
          ...opp,
          faTitle: fa.title,
          faDescription: fa.description || '',
          challengeId: fa.challenge_id,
          challengeTitle: challenge ? challenge.title : '',
        });
      }
    }
    return eligible.sort((a, b) => b.score - a.score);
  },

  /** Phase 3: Allocate faculty across all teams simultaneously */
  allocatePortfolio(L, selectedFAs, locked = [], config = {}) {
    const maxProposals = config.maxProposals || 3;
    const aaiiIds = new Set(Strategy.getAAIIFaculty(L).map(f => f.id));

    // Usage tracker: faculty_id -> { pi: faId|null, roles: [{faId, role}] }
    const usage = {};
    const initUsage = (fid) => { if (!usage[fid]) usage[fid] = { pi: null, roles: [] }; };

    const totalUsage = (fid) => usage[fid] ? usage[fid].roles.length : 0;
    const isOnTeam = (fid, faId) => usage[fid] && usage[fid].roles.some(r => r.faId === faId);

    // Teams: faId -> [{faculty_id, role, composite}]
    const teams = {};
    for (const fa of selectedFAs) teams[fa.faId] = [];

    // ═══ PASS 1: PI Assignment (AAII only) ═══
    const piPairs = [];
    for (const fa of selectedFAs) {
      const scores = L.topFacultyByFA[fa.faId] || [];
      for (const s of scores) {
        if (!aaiiIds.has(s.faculty_id)) continue;
        const f = L.facultyById[s.faculty_id];
        if (!f || !Strategy.canServeAs(f, 'pi')) continue;
        if (s.composite < 3) continue;
        const seniority = Strategy.seniorityScore(f, L);
        piPairs.push({
          fid: s.faculty_id, faId: fa.faId,
          composite: s.composite, seniority,
          piScore: s.composite + 0.4 * (seniority / 5),
        });
      }
    }

    // Apply locked PI assignments first
    for (const lock of locked) {
      initUsage(lock.faculty_id);
      const scores = L.topFacultyByFA[lock.focus_area_id] || [];
      const s = scores.find(sc => sc.faculty_id === lock.faculty_id);
      teams[lock.focus_area_id] = [{ faculty_id: lock.faculty_id, role: 'pi', composite: s ? s.composite : 0 }];
      usage[lock.faculty_id].pi = lock.focus_area_id;
      usage[lock.faculty_id].roles.push({ faId: lock.focus_area_id, role: 'pi' });
    }

    // Greedy PI assignment
    piPairs.sort((a, b) => b.piScore - a.piScore || b.seniority - a.seniority);
    for (const pair of piPairs) {
      initUsage(pair.fid);
      if (usage[pair.fid].pi !== null) continue;          // already PI somewhere
      if (teams[pair.faId] && teams[pair.faId].some(m => m.role === 'pi')) continue;  // FA has PI
      if (!teams[pair.faId]) continue;

      teams[pair.faId].push({ faculty_id: pair.fid, role: 'pi', composite: pair.composite });
      usage[pair.fid].pi = pair.faId;
      usage[pair.fid].roles.push({ faId: pair.faId, role: 'pi' });
    }

    // ═══ PASS 2: Co-PI Assignment ═══
    // Process weakest teams first to balance quality
    const fasByStrength = [...selectedFAs].sort((a, b) => {
      const aComp = teams[a.faId].length ? teams[a.faId][0].composite : 0;
      const bComp = teams[b.faId].length ? teams[b.faId][0].composite : 0;
      return aComp - bComp;
    });

    for (const fa of fasByStrength) {
      const team = teams[fa.faId];
      const existingDepts = new Set(team.map(m => (L.facultyById[m.faculty_id] || {}).department));
      const candidates = (L.topFacultyByFA[fa.faId] || [])
        .filter(s => s.composite >= 2.5)
        .filter(s => {
          initUsage(s.faculty_id);
          return !isOnTeam(s.faculty_id, fa.faId) && totalUsage(s.faculty_id) < maxProposals;
        })
        .filter(s => {
          const f = L.facultyById[s.faculty_id];
          return f && Strategy.canServeAs(f, 'co-pi');
        })
        .map(s => {
          const f = L.facultyById[s.faculty_id];
          return {
            ...s,
            copiScore: s.composite
              + (!existingDepts.has(f.department) ? 0.5 : 0)
              + (aaiiIds.has(s.faculty_id) ? 0.25 : 0),
          };
        })
        .sort((a, b) => b.copiScore - a.copiScore);

      for (const c of candidates.slice(0, 2)) {
        team.push({ faculty_id: c.faculty_id, role: 'co-pi', composite: c.composite });
        usage[c.faculty_id].roles.push({ faId: fa.faId, role: 'co-pi' });
        existingDepts.add((L.facultyById[c.faculty_id] || {}).department);
      }
    }

    // ═══ PASS 3: Contributor Fill ═══
    for (const fa of selectedFAs) {
      const team = teams[fa.faId];
      const existingDepts = new Set(team.map(m => (L.facultyById[m.faculty_id] || {}).department));

      const candidates = (L.topFacultyByFA[fa.faId] || [])
        .filter(s => s.composite >= 2)
        .filter(s => {
          initUsage(s.faculty_id);
          return !isOnTeam(s.faculty_id, fa.faId) && totalUsage(s.faculty_id) < maxProposals;
        })
        .map(s => ({
          ...s,
          contribScore: s.composite
            + (!existingDepts.has((L.facultyById[s.faculty_id] || {}).department) ? 0.3 : 0)
            + (aaiiIds.has(s.faculty_id) && totalUsage(s.faculty_id) === 0 ? 0.4 : 0),
        }))
        .sort((a, b) => b.contribScore - a.contribScore);

      for (const c of candidates) {
        if (team.length >= 5) break;
        team.push({ faculty_id: c.faculty_id, role: 'contributor', composite: c.composite });
        initUsage(c.faculty_id);
        usage[c.faculty_id].roles.push({ faId: fa.faId, role: 'contributor' });
      }
    }

    // ═══ PASS 4: Local Search (PI Swaps) ═══
    const faList = selectedFAs.map(f => f.faId);
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 20) {
      improved = false;
      iterations++;
      for (let i = 0; i < faList.length; i++) {
        for (let j = i + 1; j < faList.length; j++) {
          const piI = teams[faList[i]].find(m => m.role === 'pi');
          const piJ = teams[faList[j]].find(m => m.role === 'pi');
          if (!piI || !piJ) continue;
          // Check if either is locked
          if (locked.some(l => l.faculty_id === piI.faculty_id && l.focus_area_id === faList[i])) continue;
          if (locked.some(l => l.faculty_id === piJ.faculty_id && l.focus_area_id === faList[j])) continue;

          const scoresI = L.topFacultyByFA[faList[i]] || [];
          const scoresJ = L.topFacultyByFA[faList[j]] || [];
          const piIonJ = scoresJ.find(s => s.faculty_id === piI.faculty_id);
          const piJonI = scoresI.find(s => s.faculty_id === piJ.faculty_id);
          if (!piIonJ || !piJonI) continue;

          const current = piI.composite + piJ.composite;
          const swapped = piJonI.composite + piIonJ.composite;
          if (swapped > current + 0.2) {
            // Swap
            piI.composite = piJonI.composite;
            piJ.composite = piIonJ.composite;
            const tmpFid = piI.faculty_id;
            piI.faculty_id = piJ.faculty_id;
            piJ.faculty_id = tmpFid;
            improved = true;
          }
        }
      }
    }

    return { teams, usage };
  },

  /** Detect bottlenecks in the allocation */
  detectBottlenecks(usage, teams, L) {
    const alerts = [];
    const aaiiIds = new Set(Strategy.getAAIIFaculty(L).map(f => f.id));

    // Overloaded faculty
    for (const [fid, u] of Object.entries(usage)) {
      if (u.roles.length >= 3) {
        const f = L.facultyById[fid];
        alerts.push({
          type: 'overloaded',
          severity: u.roles.length >= 4 ? 'critical' : 'warning',
          facultyId: parseInt(fid),
          name: f ? f.name : 'Unknown',
          count: u.roles.length,
          message: `${f ? f.name : 'Unknown'} is assigned to ${u.roles.length} proposals`,
        });
      }
    }

    // FAs with no PI
    for (const [faId, team] of Object.entries(teams)) {
      if (!team.some(m => m.role === 'pi')) {
        alerts.push({
          type: 'no-pi',
          severity: 'critical',
          faId,
          message: `No AAII PI available for ${faId}`,
        });
      }
    }

    // Underutilized AAII faculty
    for (const f of Strategy.getAAIIFaculty(L)) {
      if (!usage[f.id] || usage[f.id].roles.length === 0) {
        alerts.push({
          type: 'unused',
          severity: 'info',
          facultyId: f.id,
          name: f.name,
          message: `${f.name} is not assigned to any proposal`,
        });
      }
    }

    return alerts;
  },

  /** Score the entire portfolio */
  scorePortfolio(teams, selectedFAs, L) {
    let totalComposite = 0;
    let weakest = Infinity;
    let weakestFA = '';
    const teamProfiles = {};

    for (const fa of selectedFAs) {
      const team = teams[fa.faId] || [];
      const profile = Strategy.computeTeamProfile(team, fa.faId, L);
      teamProfiles[fa.faId] = profile;
      totalComposite += profile.avgComposite;
      if (profile.avgComposite < weakest) {
        weakest = profile.avgComposite;
        weakestFA = fa.faId;
      }
    }

    const aaiiTotal = Strategy.getAAIIFaculty(L).length;
    const usedAAII = new Set();
    for (const fa of selectedFAs) {
      for (const m of (teams[fa.faId] || [])) {
        const f = L.facultyById[m.faculty_id];
        if (f && f.tier === 'AAII Affiliated') usedAAII.add(m.faculty_id);
      }
    }

    return {
      proposalCount: selectedFAs.length,
      totalComposite: Math.round(totalComposite * 10) / 10,
      avgComposite: Math.round((totalComposite / selectedFAs.length) * 10) / 10,
      weakestLink: Math.round(weakest * 10) / 10,
      weakestFA,
      aaiiUtilization: Math.round((usedAAII.size / aaiiTotal) * 100),
      aaiiUsed: usedAAII.size,
      aaiiTotal,
      teamProfiles,
    };
  },
};


/* ─── Main Render ─── */

async function renderPortfolio(container) {
  container.innerHTML = '<div class="loading">Optimizing portfolio...</div>';
  const L = await DataStore.buildLookups();

  // Run optimization
  const eligible = PortfolioOptimizer.filterAAIIFocusAreas(L);
  const selected = eligible.slice(0, _portfolioSize);
  const { teams, usage } = PortfolioOptimizer.allocatePortfolio(L, selected, _portfolioLocked, { maxProposals: _maxProposalsPerFaculty });
  const alerts = PortfolioOptimizer.detectBottlenecks(usage, teams, L);
  const stats = PortfolioOptimizer.scorePortfolio(teams, selected, L);

  _portfolioResults = { eligible, selected, teams, usage, alerts, stats };

  let html = '';

  // ═══ HEADER ═══
  html += `<div style="margin-bottom:16px">
    <h2 style="font-size:20px;font-weight:800;color:#FFF;margin-bottom:6px">AAII Portfolio Optimizer</h2>
    <p style="font-size:13px;color:var(--text2);max-width:800px;line-height:1.7">Allocate ${Strategy.getAAIIFaculty(L).length} AAII faculty across the focus areas where Computer Science and AI capabilities create the greatest competitive advantage. The optimizer selects the best opportunities and distributes faculty to maximize total portfolio strength while respecting PI constraints.</p>
  </div>`;

  // ═══ CONTROLS ═══
  html += `<div class="card" style="padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;font-weight:600;color:var(--text2)">Portfolio Size:</span>
      <input type="range" min="3" max="${Math.min(12, eligible.length)}" value="${_portfolioSize}" class="portfolio-slider" oninput="document.getElementById('psize-val').textContent=this.value" onchange="_portfolioSize=parseInt(this.value);renderPortfolio($('content'))">
      <span id="psize-val" style="font-size:14px;font-weight:800;color:var(--accent);min-width:20px">${_portfolioSize}</span>
      <span style="font-size:11px;color:var(--text3)">proposals</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;font-weight:600;color:var(--text2)">Max roles per faculty:</span>
      <select onchange="_maxProposalsPerFaculty=parseInt(this.value);renderPortfolio($('content'))" style="padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text2);font-size:11px;font-family:var(--font)">
        <option value="2" ${_maxProposalsPerFaculty === 2 ? 'selected' : ''}>2 proposals</option>
        <option value="3" ${_maxProposalsPerFaculty === 3 ? 'selected' : ''}>3 proposals</option>
        <option value="4" ${_maxProposalsPerFaculty === 4 ? 'selected' : ''}>4 proposals</option>
      </select>
    </div>
    ${_portfolioLocked.length ? `<button onclick="_portfolioLocked=[];renderPortfolio($('content'))" style="padding:5px 12px;border-radius:var(--radius-sm);border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.08);color:#EF4444;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font)">Reset Locks (${_portfolioLocked.length})</button>` : ''}
    <div style="margin-left:auto;font-size:11px;color:var(--text3)">${eligible.length} eligible focus areas from ${L.focusAreas.length} total</div>
  </div>`;

  // ═══ STATS ROW ═══
  const stColor = stats.avgComposite >= 3.5 ? 'var(--green)' : stats.avgComposite >= 2.5 ? 'var(--cyan)' : 'var(--accent)';
  html += `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
    <div class="card" style="padding:12px 16px;border-top:3px solid var(--accent)">
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Proposals</div>
      <div style="font-size:22px;font-weight:800;color:#FFF">${stats.proposalCount}</div>
      <div style="font-size:10px;color:var(--text3)">focus areas selected</div>
    </div>
    <div class="card" style="padding:12px 16px;border-top:3px solid var(--cyan)">
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Total Composite</div>
      <div style="font-size:22px;font-weight:800;color:var(--cyan)">${stats.totalComposite}</div>
      <div style="font-size:10px;color:var(--text3)">across all teams</div>
    </div>
    <div class="card" style="padding:12px 16px;border-top:3px solid ${stColor}">
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Avg Strength</div>
      <div style="font-size:22px;font-weight:800;color:${stColor}">${stats.avgComposite}</div>
      <div style="font-size:10px;color:var(--text3)">per team</div>
    </div>
    <div class="card" style="padding:12px 16px;border-top:3px solid ${stats.weakestLink >= 3 ? 'var(--green)' : '#EF4444'}">
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Weakest Link</div>
      <div style="font-size:22px;font-weight:800;color:${stats.weakestLink >= 3 ? 'var(--green)' : '#EF4444'}">${stats.weakestLink}</div>
      <div style="font-size:10px;color:var(--text3)">${stats.weakestFA}</div>
    </div>
    <div class="card" style="padding:12px 16px;border-top:3px solid var(--purple)">
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">AAII Utilization</div>
      <div style="font-size:22px;font-weight:800;color:var(--purple)">${stats.aaiiUtilization}%</div>
      <div style="font-size:10px;color:var(--text3)">${stats.aaiiUsed} of ${stats.aaiiTotal} faculty</div>
    </div>
  </div>`;

  // ═══ BOTTLENECK ALERTS ═══
  const criticals = alerts.filter(a => a.severity === 'critical');
  const warnings = alerts.filter(a => a.severity === 'warning');
  if (criticals.length || warnings.length) {
    html += `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">`;
    for (const a of criticals) {
      html += `<div style="padding:8px 14px;border-radius:var(--radius-sm);background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);font-size:11px;color:#EF4444;font-weight:600">${a.message}</div>`;
    }
    for (const a of warnings) {
      html += `<div style="padding:8px 14px;border-radius:var(--radius-sm);background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);font-size:11px;color:#F59E0B;font-weight:600">${a.message}</div>`;
    }
    html += `</div>`;
  }

  // ═══ PROPOSAL CARDS (2-col grid) ═══
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">`;
  for (let idx = 0; idx < selected.length; idx++) {
    const fa = selected[idx];
    const team = teams[fa.faId] || [];
    const profile = stats.teamProfiles[fa.faId] || { avgComposite: 0 };
    const compColor = SCORE_TEXT[Math.round(profile.avgComposite)] || SCORE_TEXT[3];
    const piMember = team.find(m => m.role === 'pi');
    const isLocked = piMember && _portfolioLocked.some(l => l.faculty_id === piMember.faculty_id && l.focus_area_id === fa.faId);

    html += `<div class="card" style="padding:16px 18px;border-top:3px solid ${compColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--cyan)">${fa.faId}</div>
          <div style="font-size:13px;font-weight:700;color:#FFF;line-height:1.3;margin-top:2px">${fa.faTitle}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">${fa.challengeTitle}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${compColor}">${profile.avgComposite}</div>
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase">Composite</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">`;

    for (const m of team) {
      const f = L.facultyById[m.faculty_id];
      if (!f) continue;
      const roleColors = { 'pi': 'rgba(255,130,0,0.2)', 'co-pi': 'rgba(56,189,248,0.15)', 'contributor': 'rgba(255,255,255,0.06)' };
      const roleTextColors = { 'pi': 'var(--accent)', 'co-pi': 'var(--cyan)', 'contributor': 'var(--text3)' };
      const isAAII = f.tier === 'AAII Affiliated';
      const lockBtn = m.role === 'pi' ? `<button onclick="event.stopPropagation();togglePortfolioLock(${m.faculty_id},'${fa.faId}')" style="background:none;border:none;cursor:pointer;font-size:12px;color:${isLocked ? 'var(--accent)' : 'var(--text3)'};padding:2px" title="${isLocked ? 'Unlock PI' : 'Lock PI to this proposal'}">${isLocked ? '&#128274;' : '&#128275;'}</button>` : '';

      html += `<div style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;background:rgba(255,255,255,0.02)">
        <span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${roleColors[m.role]};color:${roleTextColors[m.role]};font-weight:700;min-width:28px;text-align:center">${m.role === 'co-pi' ? 'CoPI' : m.role.toUpperCase()}</span>
        <span style="font-size:11px;color:#FFF;font-weight:${m.role === 'pi' ? '700' : '400'};flex:1">${f.name}</span>
        <span style="font-size:10px;color:var(--text3)">${f.department === 'Computer Science' ? 'CS' : f.department.split(' ')[0]}</span>
        <span style="font-size:11px;font-weight:700;color:${SCORE_TEXT[Math.round(m.composite)] || SCORE_TEXT[3]}">${m.composite}</span>
        ${lockBtn}
      </div>`;
    }

    html += `</div></div>`;
  }
  html += `</div>`;

  // ═══ UTILIZATION MATRIX ═══
  const aaiiFaculty = Strategy.getAAIIFaculty(L).sort((a, b) => {
    const ua = usage[a.id] ? usage[a.id].roles.length : 0;
    const ub = usage[b.id] ? usage[b.id].roles.length : 0;
    return ub - ua;
  });

  html += `<div class="card" style="padding:16px 18px;margin-bottom:16px;overflow-x:auto">
    <div style="font-size:13px;font-weight:700;color:#FFF;margin-bottom:4px">Faculty Utilization Matrix</div>
    <div style="font-size:11px;color:var(--text2);margin-bottom:12px">Shows how each AAII faculty member is allocated across proposals. Rows highlighted in amber indicate faculty on 3+ proposals.</div>
    <table class="util-matrix">
      <thead><tr>
        <th style="text-align:left;min-width:140px">Faculty</th>
        <th style="text-align:left;min-width:80px">Dept</th>
        <th style="text-align:center;min-width:40px">#</th>`;
  for (const fa of selected) {
    html += `<th style="text-align:center;min-width:48px;font-size:9px">${fa.faId}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (const f of aaiiFaculty) {
    const u = usage[f.id] || { roles: [] };
    const count = u.roles.length;
    const rowBg = count >= 3 ? 'rgba(245,158,11,0.06)' : 'transparent';
    const isConstrained = f.constraints && f.constraints.max_role === 'contributor';

    html += `<tr style="background:${rowBg}">
      <td style="font-size:11px;font-weight:600;color:#FFF">${f.name}${isConstrained ? ' <span style="font-size:9px;color:#EF4444">(C)</span>' : ''}</td>
      <td style="font-size:10px;color:var(--text3)">${f.department === 'Computer Science' ? 'CS' : f.department.split(' ').map(w=>w[0]).join('')}</td>
      <td style="text-align:center;font-size:12px;font-weight:800;color:${count >= 3 ? '#F59E0B' : count > 0 ? '#FFF' : 'var(--text3)'}">${count}</td>`;

    for (const fa of selected) {
      const role = u.roles.find(r => r.faId === fa.faId);
      if (role) {
        const colors = { 'pi': { bg: 'rgba(255,130,0,0.2)', text: 'var(--accent)' }, 'co-pi': { bg: 'rgba(56,189,248,0.15)', text: 'var(--cyan)' }, 'contributor': { bg: 'rgba(255,255,255,0.06)', text: 'var(--text3)' } };
        const c = colors[role.role] || colors['contributor'];
        const label = role.role === 'pi' ? 'PI' : role.role === 'co-pi' ? 'Co' : 'C';
        html += `<td style="text-align:center"><span style="font-size:9px;padding:1px 4px;border-radius:3px;background:${c.bg};color:${c.text};font-weight:700">${label}</span></td>`;
      } else {
        html += `<td></td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  // ═══ ACTION BAR ═══
  html += `<div style="display:flex;gap:12px;align-items:center">
    <button onclick="portfolioSendToLab()" style="padding:10px 24px;border-radius:var(--radius-sm);border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.12);color:#22C55E;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:6px">${ICONS.clipboard} Send All to Proposal Lab</button>
    <span style="font-size:11px;color:var(--text3)">Creates ${selected.length} draft packages with pre-assigned teams</span>
  </div>`;

  container.innerHTML = html;
}


/* ─── Interactions ─── */

function togglePortfolioLock(facultyId, faId) {
  const idx = _portfolioLocked.findIndex(l => l.faculty_id === facultyId && l.focus_area_id === faId);
  if (idx >= 0) {
    _portfolioLocked.splice(idx, 1);
  } else {
    // Remove any other PI lock for this faculty (can only PI one)
    _portfolioLocked = _portfolioLocked.filter(l => l.faculty_id !== facultyId);
    _portfolioLocked.push({ faculty_id: facultyId, focus_area_id: faId });
  }
  renderPortfolio($('content'));
}

function portfolioSendToLab() {
  if (!_portfolioResults) return;
  const { selected, teams } = _portfolioResults;
  const L = DataStore._lookups;
  if (!L) return;

  let created = 0;
  for (const fa of selected) {
    const team = teams[fa.faId] || [];
    if (!team.length) continue;

    const faObj = L.focusAreaById[fa.faId];
    const concept = Strategy.generateConceptSeed(team, fa.faId, L, []);

    const pkg = PackageStore.createBlank({
      track: 'aaii-led',
      focus_area_id: fa.faId,
      challenge_id: fa.challengeId,
      team: team.map(m => ({ faculty_id: m.faculty_id, role: m.role })),
      concept_title: concept.title,
      concept_seed: concept.seed,
    });

    PackageStore.save(pkg);
    created++;
  }

  showToast(`${created} proposal packages created`);
  _labView = 'packages';
  switchTab('proposallab');
}
