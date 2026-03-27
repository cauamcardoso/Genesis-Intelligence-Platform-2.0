/* ═══ AAII Portfolio Optimizer v2 — Interactive ═══ */

/* ─── State ─── */
let _pfSize = 8;
let _pfFAs = [];               // Selected FA objects [{faId, faTitle, ...}]
let _pfTeams = {};             // faId -> [{faculty_id, role}]
let _pfLocked = [];            // [{faculty_id, focus_area_id}]
let _pfExpanded = null;        // Which card is expanded for editing
let _pfDragFaculty = null;     // Drag state
let _pfInitialized = false;
const _pfMandatory = ['C20-A', 'C20-B', 'C20-C'];  // Always included
const _pfMaxTeams = 2;         // Max proposals per faculty

// Faculty role preferences (by ID)
// Prefer PI or Co-PI: Chris Kiekintveld(7), Palvi Aggarwal(24), Monika Akbar(22),
//   Shahriar Hossain(27), Olac Fuentes(23), Deepak Tosh(8)
// Prefer Co-PI or Contributor: Anantaa Kotal(2), Aritran Piplai(3), Sajedul Talukder(26)
const _pfPreferPI = new Set([7, 24, 22, 27, 23, 8]);
const _pfPreferCoPI = new Set([2, 3, 26]);

/* ─── Optimizer Core ─── */

const PFOptimizer = {

  filterEligibleFAs(L, minAAIIStrong = 2) {
    const eligible = [];
    for (const fa of L.focusAreas) {
      const opp = Strategy.computeAAIIOpportunityScore(fa.id, L);
      const isMandatory = _pfMandatory.includes(fa.id);
      if (opp.aaiiStrongCount >= minAAIIStrong || isMandatory) {
        const ch = L.challengeById[fa.challenge_id];
        eligible.push({
          ...opp,
          faTitle: fa.title,
          faDescription: fa.description || '',
          challengeId: fa.challenge_id,
          challengeTitle: ch ? ch.title : '',
          mandatory: isMandatory,
        });
      }
    }
    return eligible.sort((a, b) => {
      if (a.mandatory && !b.mandatory) return -1;
      if (!a.mandatory && b.mandatory) return 1;
      return b.score - a.score;
    });
  },

  allocate(L, selectedFAs, locked = []) {
    const aaiiIds = new Set(Strategy.getAAIIFaculty(L).map(f => f.id));
    const usage = {};
    const init = (fid) => { if (!usage[fid]) usage[fid] = []; };
    const count = (fid) => (usage[fid] || []).length;
    const onTeam = (fid, faId) => (usage[fid] || []).some(r => r.faId === faId);
    const teams = {};
    for (const fa of selectedFAs) teams[fa.faId] = [];

    // Locked PIs first
    for (const lock of locked) {
      init(lock.faculty_id);
      teams[lock.focus_area_id] = [{ faculty_id: lock.faculty_id, role: 'pi' }];
      usage[lock.faculty_id].push({ faId: lock.focus_area_id, role: 'pi' });
    }

    // Pass 0: PREFERRED PI faculty get first pick (ensures they lead proposals)
    const preferredPIPairs = [];
    for (const fa of selectedFAs) {
      if (teams[fa.faId]?.some(m => m.role === 'pi')) continue; // already has locked PI
      for (const s of (L.topFacultyByFA[fa.faId] || [])) {
        if (!_pfPreferPI.has(s.faculty_id)) continue;
        const f = L.facultyById[s.faculty_id];
        if (!f || !Strategy.canServeAs(f, 'pi') || s.composite < 2.5) continue;
        const sen = Strategy.seniorityScore(f, L);
        preferredPIPairs.push({
          fid: s.faculty_id, faId: fa.faId, composite: s.composite,
          score: s.composite + 0.4 * (sen / 5),
        });
      }
    }
    preferredPIPairs.sort((a, b) => b.score - a.score);
    for (const p of preferredPIPairs) {
      init(p.fid);
      if (usage[p.fid].some(r => r.role === 'pi')) continue; // already PI somewhere
      if (count(p.fid) >= _pfMaxTeams) continue;
      if (teams[p.faId]?.some(m => m.role === 'pi')) continue; // FA already has PI
      if (!teams[p.faId]) continue;
      teams[p.faId].push({ faculty_id: p.fid, role: 'pi' });
      usage[p.fid].push({ faId: p.faId, role: 'pi' });
    }

    // Pass 1: Remaining PIs (general pool, AAII preferred)
    const piPairs = [];
    for (const fa of selectedFAs) {
      if (teams[fa.faId]?.some(m => m.role === 'pi')) continue; // already has PI
      for (const s of (L.topFacultyByFA[fa.faId] || [])) {
        const f = L.facultyById[s.faculty_id];
        if (!f || !Strategy.canServeAs(f, 'pi') || s.composite < 2.5) continue;
        const sen = Strategy.seniorityScore(f, L);
        piPairs.push({
          fid: s.faculty_id, faId: fa.faId, composite: s.composite, seniority: sen,
          score: s.composite + 0.4 * (sen / 5) + (aaiiIds.has(s.faculty_id) ? 0.3 : 0),
        });
      }
    }
    piPairs.sort((a, b) => b.score - a.score);
    for (const p of piPairs) {
      init(p.fid);
      if (usage[p.fid].some(r => r.role === 'pi')) continue;
      if (count(p.fid) >= _pfMaxTeams) continue;
      if (teams[p.faId]?.some(m => m.role === 'pi')) continue;
      if (!teams[p.faId]) continue;
      teams[p.faId].push({ faculty_id: p.fid, role: 'pi' });
      usage[p.fid].push({ faId: p.faId, role: 'pi' });
    }

    // Pass 2: Co-PI (weakest teams first)
    const byWeakest = [...selectedFAs].sort((a, b) => {
      const ac = teams[a.faId]?.[0]?.faculty_id ? 1 : 0;
      const bc = teams[b.faId]?.[0]?.faculty_id ? 1 : 0;
      return ac - bc;
    });
    for (const fa of byWeakest) {
      const team = teams[fa.faId];
      const depts = new Set(team.map(m => (L.facultyById[m.faculty_id] || {}).department));
      const cands = (L.topFacultyByFA[fa.faId] || [])
        .filter(s => s.composite >= 2.5 && !onTeam(s.faculty_id, fa.faId))
        .filter(s => { init(s.faculty_id); return count(s.faculty_id) < _pfMaxTeams; })
        .filter(s => Strategy.canServeAs(L.facultyById[s.faculty_id], 'co-pi'))
        .map(s => ({ ...s, sc: s.composite + (!depts.has((L.facultyById[s.faculty_id] || {}).department) ? 0.4 : 0) + (aaiiIds.has(s.faculty_id) ? 0.2 : 0) + (_pfPreferPI.has(s.faculty_id) || _pfPreferCoPI.has(s.faculty_id) ? 0.3 : 0) }))
        .sort((a, b) => b.sc - a.sc);
      for (const c of cands.slice(0, 2)) {
        team.push({ faculty_id: c.faculty_id, role: 'co-pi' });
        usage[c.faculty_id].push({ faId: fa.faId, role: 'co-pi' });
      }
    }

    // Pass 3: Contributors
    for (const fa of selectedFAs) {
      const team = teams[fa.faId];
      const cands = (L.topFacultyByFA[fa.faId] || [])
        .filter(s => s.composite >= 2 && !onTeam(s.faculty_id, fa.faId))
        .filter(s => { init(s.faculty_id); return count(s.faculty_id) < _pfMaxTeams; })
        .sort((a, b) => b.composite - a.composite);
      for (const c of cands) {
        if (team.length >= 5) break;
        team.push({ faculty_id: c.faculty_id, role: 'contributor' });
        init(c.faculty_id);
        usage[c.faculty_id].push({ faId: fa.faId, role: 'contributor' });
      }
    }

    return teams;
  },

  computeStats(teams, fas, L) {
    let total = 0, weakest = 99, weakestFA = '';
    const profiles = {};
    for (const fa of fas) {
      const t = teams[fa.faId] || [];
      const p = Strategy.computeTeamProfile(t, fa.faId, L);
      profiles[fa.faId] = p;
      total += p.avgComposite;
      if (p.avgComposite < weakest) { weakest = p.avgComposite; weakestFA = fa.faId; }
    }
    // Usage
    const allAAII = Strategy.getAAIIFaculty(L);
    const used = new Set();
    const usageCounts = {};
    for (const fa of fas) {
      for (const m of (teams[fa.faId] || [])) {
        const f = L.facultyById[m.faculty_id];
        if (f && f.tier === 'AAII Affiliated') used.add(m.faculty_id);
        usageCounts[m.faculty_id] = (usageCounts[m.faculty_id] || 0) + 1;
      }
    }
    // Alerts
    const alerts = [];
    for (const fa of fas) {
      if (!(teams[fa.faId] || []).some(m => m.role === 'pi')) {
        alerts.push({ type: 'no-pi', severity: 'critical', faId: fa.faId, message: `${fa.faId} has no PI assigned` });
      }
    }
    for (const [fid, cnt] of Object.entries(usageCounts)) {
      if (cnt > _pfMaxTeams) {
        const f = L.facultyById[fid];
        alerts.push({ type: 'overloaded', severity: 'warning', message: `${f ? f.name : fid} is on ${cnt} teams (max ${_pfMaxTeams})` });
      }
    }
    return {
      count: fas.length, total: Math.round(total * 10) / 10,
      avg: fas.length ? Math.round((total / fas.length) * 10) / 10 : 0,
      weakest: Math.round(weakest * 10) / 10, weakestFA,
      utilPct: Math.round((used.size / allAAII.length) * 100),
      utilUsed: used.size, utilTotal: allAAII.length,
      profiles, alerts, usageCounts,
    };
  },
};


/* ─── Main Render ─── */

async function renderPortfolio(container) {
  container.innerHTML = '<div class="loading">Loading portfolio...</div>';
  const L = await DataStore.buildLookups();

  // Initial optimization on first load or re-optimize
  if (!_pfInitialized) {
    const eligible = PFOptimizer.filterEligibleFAs(L);
    // Mandatory + top N
    const mandatory = eligible.filter(f => f.mandatory);
    let others = eligible.filter(f => !f.mandatory).slice(0, Math.max(1, _pfSize - mandatory.length));
    let selected = [...mandatory, ...others];

    // Senior/preferred faculty recovery: ensure their best FAs are in the portfolio
    const selectedFAIds = new Set(selected.map(f => f.faId));
    const seniorAAII = Strategy.getAAIIFaculty(L).filter(f => Strategy.seniorityScore(f, L) >= 4 || _pfPreferPI.has(f.id));
    for (const sf of seniorAAII) {
      // Check if this faculty already has a strong match in the portfolio
      const matches = (L.topMatchesByFaculty[sf.id] || []).filter(s => s.composite >= 3);
      if (!matches.length) continue;
      const hasStrongInPortfolio = matches.some(m => selectedFAIds.has(m.focus_area_id));
      if (hasStrongInPortfolio) continue; // already has a good FA in portfolio

      // Their best FA is not in the portfolio; try to add it
      const bestFA = matches[0].focus_area_id;
      const eligibleFA = eligible.find(e => e.faId === bestFA);
      if (!eligibleFA) continue;

      if (selected.length >= _pfSize) {
        // Swap the weakest non-mandatory FA
        const weakestIdx = selected.reduce((wi, f, i) => {
          if (f.mandatory) return wi;
          return (wi === -1 || f.score < selected[wi].score) ? i : wi;
        }, -1);
        if (weakestIdx >= 0) {
          const oldFaId = selected[weakestIdx].faId;
          selected[weakestIdx] = eligibleFA;
          selectedFAIds.delete(oldFaId);
          selectedFAIds.add(bestFA);
        }
      } else {
        selected.push(eligibleFA);
        selectedFAIds.add(bestFA);
      }
    }

    _pfFAs = selected;
    _pfTeams = PFOptimizer.allocate(L, _pfFAs, _pfLocked);

    // Post-allocation fix: promote preferred-PI faculty stuck as contributors
    for (const prefId of _pfPreferPI) {
      let currentRole = null, currentFA = null;
      for (const [faId, team] of Object.entries(_pfTeams)) {
        const m = team.find(t => t.faculty_id === prefId);
        if (m) { currentRole = m.role; currentFA = faId; break; }
      }
      // If they're a contributor, try to promote to co-pi
      if (currentRole === 'contributor' && currentFA) {
        const team = _pfTeams[currentFA];
        const idx = team.findIndex(m => m.faculty_id === prefId);
        if (idx >= 0) team[idx].role = 'co-pi';
      }
      // If they're not assigned anywhere, find their best FA and add as co-pi
      if (!currentRole) {
        const matches = (L.topMatchesByFaculty[prefId] || []).filter(s => s.composite >= 2.5);
        for (const m of matches) {
          if (_pfTeams[m.focus_area_id] && _pfTeams[m.focus_area_id].length < 5) {
            _pfTeams[m.focus_area_id].push({ faculty_id: prefId, role: 'co-pi' });
            break;
          }
        }
      }
    }

    _pfInitialized = true;
  }

  const stats = PFOptimizer.computeStats(_pfTeams, _pfFAs, L);
  const eligible = PFOptimizer.filterEligibleFAs(L);
  const usedFAIds = new Set(_pfFAs.map(f => f.faId));

  // Compute overall opportunity scores for comparison
  const overallOpps = Strategy.computeFocusAreaOpportunities(L);
  const overallMap = {};
  for (const o of overallOpps) overallMap[o.faId] = o;

  // Portfolio-level strength comparison
  let totalOverallStrength = 0;
  for (const fa of _pfFAs) {
    const ov = overallMap[fa.faId];
    if (ov) totalOverallStrength += ov.strength;
  }
  const avgOverallStrength = _pfFAs.length ? Math.round((totalOverallStrength / _pfFAs.length) * 10) / 10 : 0;

  let html = '';

  // ═══ HEADER ═══
  html += `<div style="margin-bottom:14px">
    <h2 style="font-size:20px;font-weight:800;color:#FFF;margin-bottom:4px">AAII Portfolio Optimizer</h2>
    <p style="font-size:12px;color:var(--text2);max-width:800px;line-height:1.6">Allocate AAII faculty across proposals to maximize total portfolio strength. C20-A, C20-B, and C20-C are mandatory. Click any proposal card to expand and edit its team. Each faculty member can appear on at most ${_pfMaxTeams} proposals.</p>
  </div>`;

  // ═══ CONTROLS ═══
  html += `<div class="card" style="padding:12px 18px;margin-bottom:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;font-weight:600;color:var(--text2)">Size:</span>
      <input type="range" min="3" max="${Math.min(15, eligible.length)}" value="${_pfSize}" class="portfolio-slider" oninput="document.getElementById('pf-sz').textContent=this.value" onchange="_pfSize=parseInt(this.value);pfReoptimize()">
      <span id="pf-sz" style="font-size:13px;font-weight:800;color:var(--accent)">${_pfSize}</span>
    </div>
    <button onclick="pfReoptimize()" style="padding:5px 14px;border-radius:var(--radius-sm);border:1px solid rgba(255,130,0,0.3);background:rgba(255,130,0,0.08);color:var(--accent);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font)">${ICONS.zap} Re-optimize</button>
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:11px;font-weight:600;color:var(--text2)">Add:</span>
      <select id="pf-add-fa" style="padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:rgba(255,255,255,0.03);color:var(--text2);font-size:10px;font-family:var(--font);max-width:250px">
        <option value="">Select focus area to add...</option>
        ${eligible.filter(f => !usedFAIds.has(f.faId)).map(f => `<option value="${f.faId}">${f.faId}: ${truncate(f.faTitle, 40)} (${f.strength})</option>`).join('')}
      </select>
      <button onclick="pfAddProposal()" style="padding:4px 10px;border-radius:var(--radius-sm);border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);color:#22C55E;font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font)">+ Add</button>
    </div>
    <span style="font-size:10px;color:var(--text3);margin-left:auto">${eligible.length} eligible FAs</span>
  </div>`;

  // ═══ STATS ═══
  const sc = stats.avg >= 3.5 ? 'var(--green)' : stats.avg >= 2.5 ? 'var(--cyan)' : 'var(--accent)';
  const osc = avgOverallStrength >= 3.5 ? 'var(--green)' : avgOverallStrength >= 2.5 ? 'var(--cyan)' : 'var(--accent)';
  html += `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:10px">
    <div class="card" style="padding:10px 14px;border-top:3px solid var(--accent)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Proposals</div><div style="font-size:20px;font-weight:800;color:#FFF">${stats.count}</div></div>
    <div class="card" style="padding:10px 14px;border-top:3px solid var(--cyan)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">AAII Team Avg</div><div style="font-size:20px;font-weight:800;color:var(--cyan)">${stats.avg}</div><div style="font-size:8px;color:var(--text3)">AAII faculty only</div></div>
    <div class="card" style="padding:10px 14px;border-top:3px solid ${osc}"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Overall Strength</div><div style="font-size:20px;font-weight:800;color:${osc}">${avgOverallStrength}</div><div style="font-size:8px;color:var(--text3)">All UTEP faculty</div></div>
    <div class="card" style="padding:10px 14px;border-top:3px solid ${stats.weakest >= 3 ? 'var(--green)' : '#EF4444'}"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Weakest</div><div style="font-size:20px;font-weight:800;color:${stats.weakest >= 3 ? 'var(--green)' : '#EF4444'}">${stats.weakest}</div><div style="font-size:9px;color:var(--text3)">${stats.weakestFA}</div></div>
    <div class="card" style="padding:10px 14px;border-top:3px solid var(--purple)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">AAII Used</div><div style="font-size:20px;font-weight:800;color:var(--purple)">${stats.utilPct}%</div><div style="font-size:9px;color:var(--text3)">${stats.utilUsed}/${stats.utilTotal}</div></div>
    <div class="card" style="padding:10px 14px;border-top:3px solid var(--green)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Total Composite</div><div style="font-size:20px;font-weight:800;color:var(--green)">${stats.total}</div></div>
  </div>`;

  // ═══ STRENGTH IMPLICATIONS PANEL ═══
  html += `<div class="card" style="padding:12px 16px;margin-bottom:14px;border-left:3px solid var(--cyan)">
    <div style="font-size:11px;font-weight:700;color:#FFF;margin-bottom:6px">Strength vs. Feasibility Trade-offs</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:10px">Each proposal below shows two metrics: <strong style="color:var(--cyan)">AAII Team Composite</strong> (based on AAII-led teams) and <strong style="color:var(--green)">Overall Opportunity Strength</strong> (based on all UTEP faculty). When AAII Composite is lower than Overall Strength, it means stronger non-AAII faculty exist for that focus area. Consider recruiting them as Co-PIs or Contributors to close the gap.</div>
    <div style="display:flex;gap:16px;font-size:10px;flex-wrap:wrap">`;

  // Show which proposals have the biggest gap between AAII and overall
  const gaps_arr = [];
  for (const fa of _pfFAs) {
    const ov = overallMap[fa.faId];
    const prof = stats.profiles[fa.faId] || { avgComposite: 0 };
    const gap = (ov ? ov.strength : 0) - prof.avgComposite;
    if (gap > 0.3) gaps_arr.push({ faId: fa.faId, gap: Math.round(gap * 10) / 10, overall: ov ? ov.strength : 0, aaii: prof.avgComposite });
  }
  gaps_arr.sort((a, b) => b.gap - a.gap);

  if (gaps_arr.length) {
    // For each gap, find recommended non-AAII faculty to close it
    for (const g of gaps_arr.slice(0, 4)) {
      const currentTeamIds = new Set((_pfTeams[g.faId] || []).map(m => m.faculty_id));
      const topNonAAII = (L.topFacultyByFA[g.faId] || [])
        .filter(s => {
          const f = L.facultyById[s.faculty_id];
          return f && f.tier !== 'AAII Affiliated' && !currentTeamIds.has(s.faculty_id) && s.composite >= 3;
        }).slice(0, 3);
      const recNames = topNonAAII.map(s => {
        const f = L.facultyById[s.faculty_id];
        return f ? `${f.name} (${f.department}, ${s.composite})` : '';
      }).filter(Boolean);

      html += `<div style="padding:8px 12px;border-radius:var(--radius-sm);background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);flex:1;min-width:260px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-weight:700;color:#F59E0B">${g.faId}</span>
          <span style="color:var(--text3)">AAII: ${g.aaii} vs Overall: ${g.overall} (gap: ${g.gap})</span>
        </div>
        ${recNames.length ? `<div style="font-size:9px;color:var(--text3);margin-top:4px">
          <span style="color:var(--green);font-weight:700">Recommended additions:</span> ${recNames.join('; ')}
        </div>` : ''}
      </div>`;
    }
  } else {
    html += `<div style="color:var(--green);font-weight:600">All proposals show strong AAII coverage relative to overall opportunity.</div>`;
  }
  html += `</div></div>`;

  // ═══ IDEAL TEAM COMPARISON ═══
  html += `<div class="card" style="padding:12px 16px;margin-bottom:14px;border-left:3px solid var(--green)">
    <div style="font-size:11px;font-weight:700;color:#FFF;margin-bottom:4px">Ideal vs. Current Teams</div>
    <div style="font-size:10px;color:var(--text2);line-height:1.5;margin-bottom:10px">For each proposal, this shows the strongest possible team from ALL UTEP faculty (not just AAII). If the ideal team differs significantly from the current AAII-led team, consider recruiting the suggested faculty.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px">`;

  for (const fa of _pfFAs) {
    const currentTeam = _pfTeams[fa.faId] || [];
    const currentProfile = stats.profiles[fa.faId] || { avgComposite: 0 };
    // Build ideal team from all faculty
    const idealTeam = Strategy.suggestTeam(fa.faId, L);
    const idealArr = Array.isArray(idealTeam) ? idealTeam : [];
    const idealProfile = Strategy.computeTeamProfile(idealArr, fa.faId, L);
    const improvement = idealProfile.avgComposite - currentProfile.avgComposite;

    if (improvement > 0.2) {
      // Find who's in ideal but not current
      const currentIds = new Set(currentTeam.map(m => m.faculty_id));
      const newMembers = idealArr.filter(m => !currentIds.has(m.faculty_id)).slice(0, 3);

      html += `<div style="padding:8px 10px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--card-border)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;color:var(--cyan)">${fa.faId}</span>
          <span style="font-size:10px;color:var(--text3)">Current: <strong style="color:#FFF">${currentProfile.avgComposite}</strong> Ideal: <strong style="color:var(--green)">${idealProfile.avgComposite}</strong> (+${Math.round(improvement * 10) / 10})</span>
        </div>
        ${newMembers.length ? `<div style="font-size:9px;color:var(--text3)">
          <span style="color:var(--green)">Consider adding:</span>
          ${newMembers.map(m => { const f = L.facultyById[m.faculty_id]; return f ? `<span style="color:var(--text2)">${f.name}</span>` : ''; }).filter(Boolean).join(', ')}
        </div>` : ''}
      </div>`;
    }
  }

  html += `</div></div>`;

  // ═══ ALERTS ═══
  if (stats.alerts.length) {
    html += `<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">`;
    for (const a of stats.alerts) {
      const c = a.severity === 'critical' ? { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#EF4444' } : { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#F59E0B' };
      html += `<div style="padding:6px 12px;border-radius:var(--radius-sm);background:${c.bg};border:1px solid ${c.border};font-size:10px;color:${c.text};font-weight:600">${a.message}</div>`;
    }
    html += `</div>`;
  }

  // ═══ PROPOSAL CARDS ═══
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">`;
  for (const fa of _pfFAs) {
    const team = _pfTeams[fa.faId] || [];
    const profile = stats.profiles[fa.faId] || { avgComposite: 0 };
    const cc = SCORE_TEXT[Math.round(profile.avgComposite)] || SCORE_TEXT[3];
    const overallOpp = overallMap[fa.faId];
    const overallStr = overallOpp ? overallOpp.strength : 0;
    const strengthGap = overallStr - profile.avgComposite;
    const isExpanded = _pfExpanded === fa.faId;
    const hasPi = team.some(m => m.role === 'pi');

    html += `<div class="card pf-card${isExpanded ? ' pf-expanded' : ''}" style="padding:0;border-top:3px solid ${hasPi ? cc : '#EF4444'};${isExpanded ? 'grid-column:1/-1;' : ''}">`;

    // Card header (always visible)
    html += `<div class="pf-card-header" onclick="pfToggleCard('${fa.faId}')">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;font-weight:700;color:var(--cyan)">${fa.faId}</span>
          ${fa.mandatory ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:rgba(255,130,0,0.15);color:var(--accent);font-weight:700">REQUIRED</span>' : ''}
          ${!hasPi ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:rgba(239,68,68,0.15);color:#EF4444;font-weight:700">NO PI</span>' : ''}
        </div>
        <div style="font-size:12px;font-weight:700;color:#FFF;margin-top:2px;line-height:1.3">${fa.faTitle}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:1px">${fa.challengeTitle}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="display:flex;gap:10px;align-items:flex-end;justify-content:flex-end">
          <div>
            <div style="font-size:16px;font-weight:800;color:${cc}">${profile.avgComposite}</div>
            <div style="font-size:7px;color:var(--text3);text-transform:uppercase">AAII Team</div>
          </div>
          <div>
            <div style="font-size:13px;font-weight:700;color:${overallStr >= 3.5 ? 'var(--green)' : 'var(--text2)'}">${overallStr}</div>
            <div style="font-size:7px;color:var(--text3);text-transform:uppercase">Overall</div>
          </div>
        </div>
        ${strengthGap > 0.5 ? `<div style="font-size:8px;color:#F59E0B;margin-top:2px">Gap: ${Math.round(strengthGap*10)/10}</div>` : ''}
        <div style="font-size:8px;color:var(--text3);margin-top:1px">${team.length} members</div>
      </div>
      <div style="color:var(--text3);margin-left:8px">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</div>
    </div>`;

    // Collapsed: show team summary
    if (!isExpanded) {
      html += `<div style="padding:0 14px 10px;display:flex;gap:4px;flex-wrap:wrap">`;
      for (const m of team) {
        const f = L.facultyById[m.faculty_id];
        if (!f) continue;
        const rc = { 'pi': { bg: 'rgba(255,130,0,0.15)', c: 'var(--accent)' }, 'co-pi': { bg: 'rgba(56,189,248,0.12)', c: 'var(--cyan)' }, 'contributor': { bg: 'rgba(255,255,255,0.05)', c: 'var(--text3)' } };
        const r = rc[m.role] || rc['contributor'];
        html += `<span style="font-size:9px;padding:2px 6px;border-radius:3px;background:${r.bg};color:${r.c}">${m.role === 'pi' ? 'PI: ' : ''}${f.name.split(' ').pop()}</span>`;
      }
      html += `<span style="margin-left:auto;display:flex;gap:4px">`;
      html += `<button onclick="event.stopPropagation();pfEditInLab('${fa.faId}')" style="font-size:9px;padding:2px 6px;border-radius:3px;background:rgba(34,197,94,0.08);color:#22C55E;border:none;cursor:pointer" title="Edit in Proposal Lab">${ICONS.fileText} Edit</button>`;
      if (!fa.mandatory) {
        html += `<button onclick="event.stopPropagation();pfRemoveProposal('${fa.faId}')" style="font-size:9px;padding:2px 6px;border-radius:3px;background:rgba(239,68,68,0.08);color:#EF4444;border:none;cursor:pointer" title="Remove">&times;</button>`;
      }
      html += `</span>`;
      html += `</div>`;
    }

    // Expanded: full team builder
    if (isExpanded) {
      html += `<div style="padding:0 14px 14px">`;

      // FA description
      if (fa.faDescription) {
        html += `<div style="font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:12px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)">${fa.faDescription}</div>`;
      }

      html += `<div style="display:grid;grid-template-columns:1fr 300px;gap:14px">`;

      // LEFT: Team slots
      html += `<div>`;
      html += `<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Team Composition</div>`;

      const roles = ['pi', 'co-pi', 'co-pi', 'contributor', 'contributor'];
      const roleLabels = { 'pi': 'PI', 'co-pi': 'Co-PI', 'contributor': 'Contributor' };

      for (let i = 0; i < Math.max(roles.length, team.length + 1, 5); i++) {
        const member = team[i];
        const role = member ? member.role : (roles[i] || 'contributor');
        const label = roleLabels[role] || 'Member';

        if (member) {
          const f = L.facultyById[member.faculty_id];
          if (!f) continue;
          const scores = L.scoresByFaculty[member.faculty_id] || [];
          const s = scores.find(sc => sc.focus_area_id === fa.faId);
          const comp = s ? s.composite : 0;

          html += `<div class="tb-slot filled" ondragover="pfSlotOver(event)" ondragleave="pfSlotLeave(event)" ondrop="pfSlotDrop(event,'${fa.faId}',${i})">
            <span class="role-badge role-${role}">${label}</span>
            <div class="tb-slot-member">
              <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]};width:24px;height:24px;font-size:9px">${getInitials(f.name)}</div>
              <div>
                <div class="tb-slot-name">${f.name}</div>
                <div class="tb-slot-dept">${f.department}${stats.usageCounts[member.faculty_id] > 1 ? ' <span style="color:var(--accent);font-weight:700">(' + stats.usageCounts[member.faculty_id] + ' teams)</span>' : ''}</div>
              </div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${SCORE_TEXT[Math.round(comp)] || SCORE_TEXT[3]}">${comp}</span>
            <button class="tb-slot-remove" onclick="event.stopPropagation();pfRemoveMember('${fa.faId}',${i})">&times;</button>
          </div>`;
        } else if (i < 5) {
          html += `<div class="tb-slot" ondragover="pfSlotOver(event)" ondragleave="pfSlotLeave(event)" ondrop="pfSlotDrop(event,'${fa.faId}',${i})">
            <span class="tb-slot-label">${label}</span>
            <span class="tb-slot-empty">Drop faculty here or click from pool</span>
          </div>`;
        }
      }

      // Scoring profile
      const axes = [
        { label: 'Faculty Fit', value: profile.avgFit || 0, color: 'var(--cyan)' },
        { label: 'Competitive Edge', value: profile.avgEdge || 0, color: 'var(--accent)' },
        { label: 'Team Feasibility', value: profile.avgTeam || 0, color: 'var(--green)' },
        { label: 'Partnership', value: profile.avgPartner || 0, color: 'var(--purple)' },
      ];
      html += `<div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)">`;
      for (const ax of axes) {
        const pct = Math.min((ax.value / 5) * 100, 100);
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <div style="font-size:10px;color:var(--text3);width:90px;text-align:right">${ax.label}</div>
          <div style="flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px"><div style="height:100%;width:${pct}%;background:${ax.color};border-radius:2px"></div></div>
          <div style="font-size:10px;font-weight:700;color:${ax.color};width:24px">${ax.value}</div>
        </div>`;
      }
      html += `</div>`;

      // Remove proposal button (non-mandatory)
      if (!fa.mandatory) {
        html += `<button onclick="pfRemoveProposal('${fa.faId}')" style="margin-top:8px;padding:5px 12px;border-radius:var(--radius-sm);border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.06);color:#EF4444;font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)">Remove this proposal</button>`;
      }
      html += `</div>`;

      // RIGHT: Faculty pool
      html += `<div style="max-height:400px;overflow-y:auto;padding:4px">`;
      html += `<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Available Faculty</div>`;

      const teamIds = new Set(team.map(m => m.faculty_id));
      const pool = (L.topFacultyByFA[fa.faId] || []).filter(s => s.composite >= 2).slice(0, 30);

      for (const s of pool) {
        const f = L.facultyById[s.faculty_id];
        if (!f) continue;
        const inTeam = teamIds.has(s.faculty_id);
        const usageCount = stats.usageCounts[s.faculty_id] || 0;
        const atMax = usageCount >= _pfMaxTeams && !inTeam;

        html += `<div class="tb-pool-card${inTeam ? ' in-team' : ''}${atMax ? ' in-team' : ''}"
          draggable="${!inTeam && !atMax ? 'true' : 'false'}"
          ondragstart="pfDragStart(event,${s.faculty_id})"
          ${!inTeam && !atMax ? `onclick="pfAddMember('${fa.faId}',${s.faculty_id})"` : ''}
          ${atMax ? 'title="Already on ' + _pfMaxTeams + ' teams"' : ''}>
          <div class="tb-pool-avatar" style="background:${TIER_AVATAR[f.tier]}">${getInitials(f.name)}</div>
          <div class="tb-pool-info">
            <div class="tb-pool-name">${f.name}${usageCount > 0 ? ' <span style="font-size:9px;color:var(--accent)">(' + usageCount + ')</span>' : ''}</div>
            <div class="tb-pool-dept">${f.department}</div>
          </div>
          <div class="tb-pool-score" style="color:${SCORE_TEXT[Math.round(s.composite)]};background:${SCORE_BG[Math.round(s.composite)]}">${s.composite}</div>
        </div>`;
      }
      html += `</div>`;

      html += `</div>`; // grid end
      html += `</div>`; // padding end
    }

    html += `</div>`; // card end
  }
  html += `</div>`; // grid end

  // ═══ UTILIZATION MATRIX ═══
  const aaiiFac = Strategy.getAAIIFaculty(L).sort((a, b) => {
    return (stats.usageCounts[b.id] || 0) - (stats.usageCounts[a.id] || 0);
  });

  html += `<div class="card" style="padding:14px 16px;margin-bottom:14px;overflow-x:auto">
    <div style="font-size:12px;font-weight:700;color:#FFF;margin-bottom:3px">Faculty Utilization Matrix</div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:10px">AAII faculty allocation across all proposals. Max ${_pfMaxTeams} teams per faculty.</div>
    <table class="util-matrix"><thead><tr>
      <th style="text-align:left;min-width:130px">Faculty</th>
      <th style="text-align:left;min-width:60px">Dept</th>
      <th style="text-align:center;width:30px">#</th>`;
  for (const fa of _pfFAs) html += `<th style="text-align:center;min-width:44px;font-size:8px">${fa.faId}</th>`;
  html += `</tr></thead><tbody>`;

  for (const f of aaiiFac) {
    const cnt = stats.usageCounts[f.id] || 0;
    const bg = cnt > _pfMaxTeams ? 'rgba(239,68,68,0.06)' : cnt >= _pfMaxTeams ? 'rgba(245,158,11,0.04)' : '';
    html += `<tr style="background:${bg}">
      <td style="font-size:10px;font-weight:600;color:#FFF">${f.name}</td>
      <td style="font-size:9px;color:var(--text3)">${f.department === 'Computer Science' ? 'CS' : f.department.split(' ').map(w => w[0]).join('')}</td>
      <td style="text-align:center;font-size:11px;font-weight:800;color:${cnt > _pfMaxTeams ? '#EF4444' : cnt > 0 ? '#FFF' : 'var(--text3)'}">${cnt}</td>`;
    for (const fa of _pfFAs) {
      const team = _pfTeams[fa.faId] || [];
      const m = team.find(t => t.faculty_id === f.id);
      if (m) {
        const colors = { 'pi': { bg: 'rgba(255,130,0,0.2)', c: 'var(--accent)' }, 'co-pi': { bg: 'rgba(56,189,248,0.15)', c: 'var(--cyan)' }, 'contributor': { bg: 'rgba(255,255,255,0.06)', c: 'var(--text3)' } };
        const cl = colors[m.role] || colors['contributor'];
        html += `<td style="text-align:center"><span style="font-size:8px;padding:1px 4px;border-radius:2px;background:${cl.bg};color:${cl.c};font-weight:700">${m.role === 'pi' ? 'PI' : m.role === 'co-pi' ? 'Co' : 'C'}</span></td>`;
      } else {
        html += `<td></td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>`;

  // ═══ ACTION BAR ═══
  html += `<div style="display:flex;gap:10px;align-items:center">
    <button onclick="portfolioSendToLab()" style="padding:8px 20px;border-radius:var(--radius-sm);border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#22C55E;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">${ICONS.clipboard} Send All to Proposal Lab</button>
    <span style="font-size:10px;color:var(--text3)">Creates ${_pfFAs.length} draft packages</span>
  </div>`;

  container.innerHTML = html;
}


/* ─── Interactions ─── */

function pfEditInLab(faId) {
  const L = DataStore._lookups;
  if (!L) return;
  const team = _pfTeams[faId] || [];
  const fa = _pfFAs.find(f => f.faId === faId);
  if (!fa) return;
  // Find or create package
  let pkg = PackageStore.list().find(p => p.focus_area_id === faId);
  if (!pkg) {
    const concept = Strategy.generateConceptSeed(team, faId, L, []);
    pkg = PackageStore.createBlank({
      track: 'aaii-led', focus_area_id: faId, challenge_id: fa.challengeId,
      team: team.map(m => ({ faculty_id: m.faculty_id, role: m.role })),
      concept_title: concept.title, concept_seed: concept.seed,
    });
    PackageStore.save(pkg);
  }
  _labEditingPkg = pkg;
  _labView = 'package-detail';
  switchTab('proposallab');
}

function pfToggleCard(faId) {
  _pfExpanded = _pfExpanded === faId ? null : faId;
  renderPortfolio($('content'));
}

function pfReoptimize() {
  _pfInitialized = false;
  _pfExpanded = null;
  renderPortfolio($('content'));
}

function pfAddProposal() {
  const sel = document.getElementById('pf-add-fa');
  if (!sel || !sel.value) return;
  const L = DataStore._lookups;
  if (!L) return;
  const fa = L.focusAreaById[sel.value];
  if (!fa) return;
  const ch = L.challengeById[fa.challenge_id];
  const opp = Strategy.computeAAIIOpportunityScore(sel.value, L);
  _pfFAs.push({ ...opp, faTitle: fa.title, faDescription: fa.description || '', challengeId: fa.challenge_id, challengeTitle: ch ? ch.title : '', mandatory: false });
  // Auto-suggest team for new FA
  const suggested = Strategy.suggestTeam(sel.value, L);
  _pfTeams[sel.value] = (Array.isArray(suggested) ? suggested : []).map(m => ({ faculty_id: m.faculty_id, role: m.role })).slice(0, 5);
  renderPortfolio($('content'));
}

function pfRemoveProposal(faId) {
  if (_pfMandatory.includes(faId)) return;
  _pfFAs = _pfFAs.filter(f => f.faId !== faId);
  delete _pfTeams[faId];
  if (_pfExpanded === faId) _pfExpanded = null;
  renderPortfolio($('content'));
}

// Drag and drop
function pfDragStart(e, fid) {
  _pfDragFaculty = fid;
  e.dataTransfer.effectAllowed = 'move';
}
function pfSlotOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function pfSlotLeave(e) { e.currentTarget.classList.remove('drag-over'); }

function pfSlotDrop(e, faId, slotIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (_pfDragFaculty === null) return;
  pfAddMemberAtSlot(faId, _pfDragFaculty, slotIdx);
  _pfDragFaculty = null;
}

function pfAddMember(faId, fid) {
  const team = _pfTeams[faId] || [];
  if (team.find(m => m.faculty_id === fid)) return;
  const role = team.length === 0 ? 'pi' : team.length <= 2 ? 'co-pi' : 'contributor';
  pfAddMemberAtSlot(faId, fid, team.length);
}

function pfAddMemberAtSlot(faId, fid, slotIdx) {
  const team = _pfTeams[faId] || [];
  const L = DataStore._lookups;
  if (!L) return;
  const f = L.facultyById[fid];

  // Check max teams
  let usageCount = 0;
  for (const fa of _pfFAs) {
    if ((_pfTeams[fa.faId] || []).some(m => m.faculty_id === fid)) usageCount++;
  }
  if (usageCount >= _pfMaxTeams && !team.some(m => m.faculty_id === fid)) {
    showToast(`${f ? f.name : 'Faculty'} is already on ${_pfMaxTeams} teams (maximum)`);
    return;
  }

  // Remove from this team if already there
  const existing = team.findIndex(m => m.faculty_id === fid);
  if (existing >= 0) team.splice(existing, 1);

  const roles = ['pi', 'co-pi', 'co-pi', 'contributor', 'contributor'];
  let role = roles[slotIdx] || 'contributor';

  // Enforce constraints
  if (f && !Strategy.canServeAs(f, role)) {
    role = 'contributor';
    showToast(`${f.name} can only serve as Contributor`);
  }

  team.splice(slotIdx, 0, { faculty_id: fid, role });

  // Ensure single PI
  let piCount = 0;
  for (const m of team) {
    if (m.role === 'pi') piCount++;
    if (piCount > 1) m.role = 'co-pi';
  }

  _pfTeams[faId] = team;
  renderPortfolio($('content'));
}

function pfRemoveMember(faId, idx) {
  const team = _pfTeams[faId] || [];
  team.splice(idx, 1);
  if (team.length > 0 && !team.some(m => m.role === 'pi')) {
    team[0].role = 'pi';
  }
  _pfTeams[faId] = team;
  renderPortfolio($('content'));
}

function portfolioSendToLab() {
  const L = DataStore._lookups;
  if (!L) return;
  let created = 0;
  for (const fa of _pfFAs) {
    const team = _pfTeams[fa.faId] || [];
    if (!team.length) continue;
    const concept = Strategy.generateConceptSeed(team, fa.faId, L, []);
    const pkg = PackageStore.createBlank({
      track: 'aaii-led', focus_area_id: fa.faId, challenge_id: fa.challengeId,
      team: team.map(m => ({ faculty_id: m.faculty_id, role: m.role })),
      concept_title: concept.title, concept_seed: concept.seed,
    });
    PackageStore.save(pkg);
    created++;
  }
  showToast(`${created} proposal packages created`);
  _labView = 'packages';
  switchTab('proposallab');
}
