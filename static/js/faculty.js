/* ═══ Faculty Explorer Tab ═══ */

let _facFilter = 'all';
let _facSearch = '';
let _facSort = 'score';
let _facSortDir = 'desc';
let _facExpanded = null;
let _facModal = null;

async function renderFaculty(container) {
  container.innerHTML = '<div class="loading">Loading faculty...</div>';
  const L = await DataStore.buildLookups();

  let faculty = L.faculty.filter(f => {
    const scores = L.topMatchesByFaculty[f.id] || [];
    return scores.length > 0;
  });

  if (_facFilter !== 'all') faculty = faculty.filter(f => f.tier === _facFilter);

  if (_facSearch) {
    const q = _facSearch.toLowerCase();
    faculty = faculty.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.department || '').toLowerCase().includes(q) ||
      (f.expertise_keywords || []).some(k => k.toLowerCase().includes(q))
    );
  }

  faculty.sort((a, b) => {
    let va, vb;
    switch (_facSort) {
      case 'name': va = a.name; vb = b.name; break;
      case 'dept': va = a.department || ''; vb = b.department || ''; break;
      case 'matches':
        va = (L.topMatchesByFaculty[a.id] || []).filter(s => s.composite >= 3).length;
        vb = (L.topMatchesByFaculty[b.id] || []).filter(s => s.composite >= 3).length;
        break;
      default:
        va = (L.topMatchesByFaculty[a.id] || [])[0]?.composite || 0;
        vb = (L.topMatchesByFaculty[b.id] || [])[0]?.composite || 0;
    }
    if (_facSort === 'name' || _facSort === 'dept') return _facSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return _facSortDir === 'asc' ? va - vb : vb - va;
  });

  let html = '';

  html += `<div style="margin-bottom:16px">
    <h2 style="font-size:20px;font-weight:800;color:#FFF;margin-bottom:4px">Faculty Explorer</h2>
    <p style="font-size:13px;color:var(--text2);max-width:600px;line-height:1.6">${L.stats.totalFaculty} UTEP faculty scored across ${L.stats.aaiiCount} AAII Affiliated and ${L.stats.recCount} Recommended researchers. Click any row to see details. Open a full profile for complete analysis.</p>
  </div>`;

  html += `<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <input class="fac-search" type="text" placeholder="Search name, department, expertise..." value="${_facSearch}" oninput="_facSearch=this.value;renderFaculty($('content'))" style="max-width:300px;flex:1;margin-bottom:0">
    <div class="filter-row" style="margin-bottom:0">
      <button class="filter-btn${_facFilter === 'all' ? ' active' : ''}" onclick="_facFilter='all';renderFaculty($('content'))">All</button>
      <button class="filter-btn${_facFilter === 'AAII Affiliated' ? ' active' : ''}" onclick="_facFilter='AAII Affiliated';renderFaculty($('content'))">AAII (${L.stats.aaiiCount})</button>
      <button class="filter-btn${_facFilter === 'Recommended' ? ' active' : ''}" onclick="_facFilter='Recommended';renderFaculty($('content'))">Recommended (${L.stats.recCount})</button>
    </div>
  </div>`;

  const sortIcon = (col) => _facSort !== col ? '' : _facSortDir === 'asc' ? ' &#9650;' : ' &#9660;';
  const sc = (col) => `onclick="facToggleSort('${col}')" style="cursor:pointer"`;

  html += `<div class="fac-table-wrap"><table class="fac-table"><thead><tr>
    <th ${sc('name')}>Name${sortIcon('name')}</th>
    <th ${sc('dept')}>Department${sortIcon('dept')}</th>
    <th>Tier</th>
    <th ${sc('score')} style="cursor:pointer;text-align:center">Top Score${sortIcon('score')}</th>
    <th ${sc('matches')} style="cursor:pointer;text-align:center">Matches${sortIcon('matches')}</th>
    <th style="text-align:center">Seniority</th>
    <th style="width:30px"></th>
  </tr></thead><tbody>`;

  for (const f of faculty) {
    const scores = L.topMatchesByFaculty[f.id] || [];
    const topScore = scores[0]?.composite || 0;
    const strongCount = scores.filter(s => s.composite >= 3).length;
    const seniority = Strategy.seniorityScore(f, L);
    const isExpanded = _facExpanded === f.id;
    const scoreColor = SCORE_TEXT[Math.round(topScore)] || SCORE_TEXT[0];
    const tierCol = TIER_COLORS[f.tier] || TIER_COLORS['Recommended'];

    html += `<tr class="fac-row${isExpanded ? ' expanded' : ''}" onclick="facToggleExpand(${f.id})">
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]};width:26px;height:26px;font-size:9px">${getInitials(f.name)}</div>
        <span style="font-weight:600;color:#FFF;font-size:12px">${f.name}</span>
      </div></td>
      <td style="color:var(--text3);font-size:11px">${f.department || ''}</td>
      <td><span style="font-size:9px;padding:2px 6px;border-radius:12px;background:${tierCol.bg};color:${tierCol.color}">${f.tier === 'AAII Affiliated' ? 'AAII' : 'Rec'}</span></td>
      <td style="text-align:center"><span style="font-size:13px;font-weight:800;color:${scoreColor}">${topScore}</span></td>
      <td style="text-align:center;font-size:11px;color:var(--text2)">${strongCount}</td>
      <td style="text-align:center;font-size:11px;color:${seniority >= 4 ? 'var(--accent)' : 'var(--text3)'};font-weight:${seniority >= 4 ? '700' : '400'}">${seniority.toFixed(1)}</td>
      <td style="color:var(--text3)">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</td>
    </tr>`;

    if (isExpanded) {
      html += `<tr class="fac-detail-row"><td colspan="7"><div class="fac-inline-detail">
        <div style="flex:1">
          ${f.bio ? `<div style="font-size:11px;color:var(--text2);line-height:1.65;margin-bottom:8px">${truncate(f.bio, 250)}</div>` : ''}
          ${(f.expertise_keywords || []).length ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px">${f.expertise_keywords.slice(0, 8).map(k => `<span style="font-size:9px;padding:2px 6px;border-radius:3px;background:rgba(56,189,248,0.10);color:var(--cyan)">${k}</span>`).join('')}</div>` : ''}
          <div style="display:flex;gap:12px;font-size:10px;color:var(--text3)">
            ${f.scholar_metrics?.h_index ? `<span>h-index: <strong style="color:var(--text2)">${f.scholar_metrics.h_index}</strong></span>` : ''}
            ${f.scholar_metrics?.citations ? `<span>Citations: <strong style="color:var(--text2)">${f.scholar_metrics.citations.toLocaleString()}</strong></span>` : ''}
          </div>
        </div>
        <div style="min-width:240px">
          <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Top Matches</div>
          ${scores.filter(s => s.composite >= 3).slice(0, 5).map(s => {
            const fa = L.focusAreaById[s.focus_area_id];
            return `<div class="fac-match-row" style="margin-bottom:2px"><span class="fac-match-id" style="min-width:36px">${s.focus_area_id}</span><span class="fac-match-title">${fa ? truncate(fa.title, 28) : ''}</span><div class="fac-match-scores">${scoreBadge(s.composite, '')}</div></div>`;
          }).join('')}
          <button onclick="event.stopPropagation();facOpenModal(${f.id})" style="margin-top:6px;padding:4px 10px;border-radius:var(--radius-sm);border:1px solid rgba(255,130,0,0.2);background:rgba(255,130,0,0.06);color:var(--accent);font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)">Full Profile</button>
        </div>
      </div></td></tr>`;
    }
  }

  html += `</tbody></table></div>`;
  if (!faculty.length) html += `<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No faculty match the current filters.</div>`;

  container.innerHTML = html;
  if (_facModal !== null) renderFacultyModal(L);
}

function facToggleSort(col) {
  if (_facSort === col) _facSortDir = _facSortDir === 'asc' ? 'desc' : 'asc';
  else { _facSort = col; _facSortDir = (col === 'name' || col === 'dept') ? 'asc' : 'desc'; }
  renderFaculty($('content'));
}

function facToggleExpand(fid) {
  _facExpanded = _facExpanded === fid ? null : fid;
  renderFaculty($('content'));
}

function facOpenModal(fid) {
  _facModal = fid;
  const L = DataStore._lookups;
  if (L) renderFacultyModal(L);
}

function facCloseModal() {
  _facModal = null;
  const overlay = document.getElementById('fac-modal-overlay');
  if (overlay) overlay.remove();
}

function renderFacultyModal(L) {
  const f = L.facultyById[_facModal];
  if (!f) return;
  const scores = L.topMatchesByFaculty[f.id] || [];
  const seniority = Strategy.seniorityScore(f, L);
  const tierCol = TIER_COLORS[f.tier] || TIER_COLORS['Recommended'];

  const existing = document.getElementById('fac-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'fac-modal-overlay';
  overlay.className = 'fac-modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) facCloseModal(); };

  const strongScores = scores.filter(s => s.composite >= 3);

  let html = `<div class="fac-modal">
    <button class="fac-modal-close" onclick="facCloseModal()">&times;</button>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div class="fac-avatar" style="background:${TIER_AVATAR[f.tier]};width:44px;height:44px;font-size:15px">${getInitials(f.name)}</div>
      <div>
        <h3 style="font-size:16px;font-weight:800;color:#FFF">${f.name}</h3>
        <div style="font-size:11px;color:var(--text3)">${f.department || ''} ${f.title ? '| ' + f.title : ''}</div>
        <div style="display:flex;gap:4px;margin-top:4px">
          <span style="font-size:9px;padding:2px 6px;border-radius:12px;background:${tierCol.bg};color:${tierCol.color}">${f.tier}</span>
          ${seniority >= 4 ? '<span style="font-size:9px;padding:2px 6px;border-radius:12px;background:rgba(255,130,0,0.12);color:var(--accent)">Senior</span>' : ''}
        </div>
      </div>
    </div>`;

  if (f.bio) html += `<div style="font-size:11px;color:var(--text2);line-height:1.7;margin-bottom:14px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)">${f.bio}</div>`;

  html += `<div style="display:flex;gap:12px;margin-bottom:14px">`;
  if (f.scholar_metrics?.h_index) html += `<div class="card" style="padding:8px 12px;text-align:center;flex:1"><div style="font-size:16px;font-weight:800;color:#FFF">${f.scholar_metrics.h_index}</div><div style="font-size:9px;color:var(--text3);text-transform:uppercase">h-index</div></div>`;
  if (f.scholar_metrics?.citations) html += `<div class="card" style="padding:8px 12px;text-align:center;flex:1"><div style="font-size:16px;font-weight:800;color:#FFF">${f.scholar_metrics.citations.toLocaleString()}</div><div style="font-size:9px;color:var(--text3);text-transform:uppercase">Citations</div></div>`;
  html += `<div class="card" style="padding:8px 12px;text-align:center;flex:1"><div style="font-size:16px;font-weight:800;color:${seniority >= 4 ? 'var(--accent)' : '#FFF'}">${seniority.toFixed(1)}</div><div style="font-size:9px;color:var(--text3);text-transform:uppercase">Seniority</div></div></div>`;

  if ((f.expertise_keywords || []).length) {
    html += `<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px">Expertise</div><div style="display:flex;flex-wrap:wrap;gap:3px">${f.expertise_keywords.map(k => `<span style="font-size:9px;padding:2px 6px;border-radius:3px;background:rgba(56,189,248,0.10);color:var(--cyan)">${k}</span>`).join('')}</div></div>`;
  }

  html += `<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Focus Area Matches (${strongScores.length} strong)</div>`;
  for (const s of strongScores) {
    const fa = L.focusAreaById[s.focus_area_id];
    if (!fa) continue;
    html += `<div class="fac-match-row" style="margin-bottom:2px"><span class="fac-match-id" style="min-width:40px">${s.focus_area_id}</span><span class="fac-match-title">${fa.title}</span><div class="fac-match-scores">${scoreBadge(s.faculty_fit, 'Fit')} ${scoreBadge(s.competitive_edge, 'Edge')} ${scoreBadge(s.composite, '')}</div></div>`;
  }

  html += `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--card-border)">
    <button onclick="facCloseModal();_labPrimaryFaculty=${f.id};_labView='faculty';switchTab('proposallab')" style="padding:7px 16px;border-radius:var(--radius-sm);border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#22C55E;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font)">${ICONS.arrowRight} Start Proposal</button>
  </div></div>`;

  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}
