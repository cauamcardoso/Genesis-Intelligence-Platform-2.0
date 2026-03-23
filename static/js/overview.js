/* ═══ Overview Tab - Landing Page ═══ */

async function renderOverview(container) {
  container.innerHTML = '<div class="loading">Loading dashboard...</div>';

  const L = await DataStore.buildLookups();
  const S = L.stats;

  // Department data for donut
  const depts = Object.entries(L.deptCounts).sort((a, b) => b[1] - a[1]);
  const totalDeptFac = depts.reduce((s, d) => s + d[1], 0);
  const deptColors = ['#F97316','#38BDF8','#A78BFA','#34D399','#FB923C','#818CF8','#22D3EE','#F472B6','#FBBF24','#6EE7B7'];

  // Challenge data
  const challengeCoverage = [];
  for (const c of L.challenges) {
    let count = 0;
    for (const fa of c.focus_areas) {
      const topFac = L.topFacultyByFA[fa.id] || [];
      count += topFac.filter(s => s.composite >= 3).length;
    }
    challengeCoverage.push({ id: c.id, title: c.title, count });
  }
  challengeCoverage.sort((a, b) => b.count - a.count);
  const maxCov = Math.max(...challengeCoverage.map(c => c.count), 1);

  let html = '';

  // ═══ 1. HERO CARD ═══
  html += `<div class="card hero-card" data-reveal="up">
    <canvas id="hero-canvas"></canvas>
    <div class="deco-wrap">
      <div class="deco-ring deco-ring-1"></div>
      <div class="deco-ring deco-ring-2"></div>
      <div class="deco-ring deco-ring-3"></div>
    </div>
    <div class="hero-label">AAII x DOE Genesis Mission</div>
    <h2 class="hero-heading">Building Genesis research teams,<br>powered by AI.</h2>
    <p class="hero-desc">This platform scores ${S.totalFaculty} UTEP faculty against ${S.totalFocusAreas} DOE Genesis focus areas to help assemble the strongest possible research teams for each proposal. This approach uses a multi-axis scoring system to identify the researchers whose work, partnerships, and competitive advantages are the strongest fit for each opportunity.</p>
  </div>`;

  // ═══ 2. STATS ROW (colored top borders) ═══
  html += `<div class="stats-row" data-reveal-stagger>
    <div class="card stat-card stat-blue" data-reveal="up">
      <div><div class="stat-label">Faculty Analyzed</div>
        <div class="stat-value" data-count-to="${S.totalFaculty}">0</div>
        <div class="stat-sub">${S.aaiiCount} AAII + ${S.recCount} Recommended</div></div>
      <div class="stat-icon" style="background:var(--grad-blue)">${ICONS.users}</div>
    </div>
    <div class="card stat-card stat-orange" data-reveal="up">
      <div><div class="stat-label">Challenges</div>
        <div class="stat-value" data-count-to="${S.totalChallenges}">0</div>
        <div class="stat-sub">DOE Genesis Mission</div></div>
      <div class="stat-icon" style="background:var(--grad-orange)">${ICONS.target}</div>
    </div>
    <div class="card stat-card stat-purple" data-reveal="up">
      <div><div class="stat-label">Focus Areas</div>
        <div class="stat-value" data-count-to="${S.totalFocusAreas}">0</div>
        <div class="stat-sub">Across all challenges</div></div>
      <div class="stat-icon" style="background:var(--grad-purple)">${ICONS.layers}</div>
    </div>
    <div class="card stat-card stat-green" data-reveal="up">
      <div><div class="stat-label">Strong Matches</div>
        <div class="stat-value" data-count-to="${S.strongMatches}">0</div>
        <div class="stat-sub">Composite >= 3 out of 5</div></div>
      <div class="stat-icon" style="background:var(--grad-green)">${ICONS.zap}</div>
    </div>
    <div class="card stat-card stat-pink" data-reveal="up">
      <div><div class="stat-label">Coverage</div>
        <div class="stat-value" data-count-to="${S.coveragePct}" data-count-suffix="%">0</div>
        <div class="stat-sub">Focus areas with a strong match</div></div>
      <div class="stat-icon" style="background:linear-gradient(135deg,#DB2777,#F59E0B)">${ICONS.shield}</div>
    </div>
  </div>`;

  // ═══ SECTION 3: NARRATIVE ═══
  html += `<div class="ov-section ov-section-alt">
  <div class="ov-section-title" data-reveal="up">Understanding the Platform</div>
  <div class="ov-section-sub" data-reveal="up">How this platform works, and why it exists.</div>
  <div class="narrative-section" data-reveal-stagger>
    <div class="card narrative-block nb-cyan" data-reveal="up">
      <div class="narrative-bar" style="background:var(--cyan)"></div>
      <div>
        <h3>The Challenge</h3>
        <p>The DOE Genesis Mission (DE-FOA-0003612) covers ${S.totalChallenges} challenges and ${S.totalFocusAreas} focus areas across energy, computing, materials science, and national security. Building a competitive proposal means finding the right combination of researchers, but most teams are assembled through existing relationships rather than systematic analysis of who actually fits best.</p>
      </div>
    </div>
    <div class="card narrative-block nb-orange" data-reveal="up">
      <div class="narrative-bar" style="background:var(--accent)"></div>
      <div>
        <h3>The Approach</h3>
        <p>Every faculty member is scored against every focus area on four dimensions: how closely their research aligns, whether they complement other strong candidates, what competitive advantages they bring, and whether the partnerships a Genesis proposal requires are already in place. The result is a composite score (0-5) for each faculty-focus area pair.</p>
      </div>
    </div>
    <div class="card narrative-block nb-green" data-reveal="up">
      <div class="narrative-bar" style="background:var(--green)"></div>
      <div>
        <h3>The Starting Point</h3>
        <p>Of the ${(S.totalFaculty * S.totalFocusAreas).toLocaleString()} possible faculty-focus area combinations, ${fmtNum(S.strongMatches)} score 3 or above, meaning ${S.coveragePct}% of Genesis focus areas have at least one strong UTEP match. This platform makes those matches searchable, sortable, and transparent.</p>
      </div>
    </div>
  </div>
  </div>`;

  // ═══ SECTION 4: EXPLORE ═══
  html += `<div class="ov-section">
  <div class="ov-section-title" data-reveal="up">Explore the Data</div>
  <div class="ov-section-sub" data-reveal="up">Three entry points into the platform, depending on what is needed.</div>
  <div class="grid-3 nav-grid" data-reveal-stagger>
    <div class="card nav-card-v nc-orange" data-reveal="up" onclick="switchTab('challenges')">
      <div class="nav-card-v-icon" style="background:var(--grad-orange)">${ICONS.target}</div>
      <h4>Challenge Explorer</h4>
      <p>Browse ${S.totalChallenges} challenges and ${S.totalFocusAreas} focus areas. See which faculty score highest for each, with full scoring breakdowns.</p>
      <div class="nav-card-v-arrow">&rsaquo;</div>
    </div>
    <div class="card nav-card-v nc-blue" data-reveal="up" onclick="switchTab('faculty')">
      <div class="nav-card-v-icon" style="background:var(--grad-blue)">${ICONS.users}</div>
      <h4>Faculty Explorer</h4>
      <p>Search ${S.totalFaculty} researchers by name, department, or expertise. See each person's top-matched focus areas and axis scores.</p>
      <div class="nav-card-v-arrow">&rsaquo;</div>
    </div>
    <div class="card nav-card-v nc-purple" data-reveal="up" onclick="switchTab('heatmap')">
      <div class="nav-card-v-icon" style="background:var(--grad-purple)">${ICONS.grid}</div>
      <h4>Scoring Matrix</h4>
      <p>The full picture: every faculty member scored against every challenge. Sort, filter, and drill into any cell.</p>
      <div class="nav-card-v-arrow">&rsaquo;</div>
    </div>
  </div>
  </div>`;

  // ═══ SECTION 5: SCORING & COVERAGE ═══
  html += `<div class="ov-section ov-section-alt">
  <div class="ov-section-title" data-reveal="up">Scoring & Coverage</div>
  <div class="ov-section-sub" data-reveal="up">How faculty are evaluated, and how UTEP's coverage breaks down.</div>`;

  // ═══ 5. SCORING (radial rings for each axis) ═══
  const axes = [
    { name: 'Faculty Fit', weight: 40, color: '#38BDF8', desc: 'Research alignment with DOE descriptions' },
    { name: 'Competitive Edge', weight: 25, color: '#FF8200', desc: 'Unique assets other institutions lack' },
    { name: 'Team Feasibility', weight: 20, color: '#22C55E', desc: 'Complementarity with other candidates' },
    { name: 'Partnership Readiness', weight: 15, color: '#8B5CF6', desc: 'Existing grants and lab affiliations' },
  ];
  const circumference = 2 * Math.PI * 42;

  html += `<div class="card" style="padding:28px 32px;margin-bottom:16px" data-reveal="up">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div style="font-size:16px;font-weight:800;color:#FFF">Scoring Dimensions</div>
      <button class="visit-btn" style="font-size:12px;padding:7px 14px" onclick="switchTab('methodology')">${ICONS.book} Full Methodology</button>
    </div>
    <div class="scoring-rings">`;
  for (const ax of axes) {
    const dashoffset = circumference * (1 - ax.weight / 100);
    html += `<div class="scoring-ring-item">
      <div class="ring-wrap">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
          <circle cx="48" cy="48" r="42" fill="none" stroke="${ax.color}" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"
            transform="rotate(-90 48 48)" style="transition:stroke-dashoffset 1.2s ease"/>
        </svg>
        <div class="ring-center"><span class="ring-pct">${ax.weight}%</span></div>
      </div>
      <div class="ring-label">${ax.name}</div>
      <div class="ring-desc">${ax.desc}</div>
    </div>`;
  }
  html += `</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.05)">`;
  for (let s = 0; s <= 5; s++) {
    html += `<div class="legend-item">
      <div class="legend-swatch" style="background:${SCORE_COLORS[s]};border:1px solid rgba(255,255,255,0.08)"></div>
      <span><strong>${s}</strong> ${SCORE_LABELS[s]}</span>
    </div>`;
  }
  html += `</div></div>`;

  // ═══ 6. TWO CHARTS (bar chart + donut chart) ═══
  html += `<div class="grid-2" data-reveal-stagger>`;

  // Left: Challenge coverage bar chart
  html += `<div class="card bar-chart-container" data-reveal="up" style="padding:20px 24px">
    <div class="card-title"><div class="icon" style="background:var(--grad-blue)">${ICONS.chart}</div>Challenge Coverage</div>
    <p style="font-size:12px;color:var(--text3);margin-top:-10px;margin-bottom:10px">Faculty with composite >= 3 per challenge</p>`;
  for (let i = 0; i < challengeCoverage.length; i++) {
    const c = challengeCoverage[i];
    const pct = (c.count / maxCov * 100).toFixed(0);
    const colorIdx = i % CHART_GRADIENTS.length;
    html += `<div class="bar-row bar-row-compact">
      <div class="bar-label" title="${c.title}">${c.id}</div>
      <div class="bar-track"><div class="bar-fill" data-bar-width="${pct}" style="width:0%;background:${CHART_GRADIENTS[colorIdx]}"></div></div>
      <div class="bar-value">${c.count}</div>
    </div>`;
  }
  html += `</div>`;

  // Right: Department donut chart
  html += `<div class="card" data-reveal="up" style="padding:20px 24px;display:flex;flex-direction:column">
    <div class="card-title"><div class="icon" style="background:var(--grad-purple)">${ICONS.users}</div>Faculty by Department</div>
    <p style="font-size:12px;color:var(--text3);margin-top:-10px;margin-bottom:10px">${S.totalFaculty} faculty across ${depts.length} departments</p>
    <div class="donut-container">
      <div class="donut-chart-wrap">
      <svg class="donut-svg" viewBox="0 0 200 200">`;

  // Build donut segments
  const donutR = 75, donutStroke = 32;
  const donutCirc = 2 * Math.PI * donutR;
  let donutOffset = 0;
  for (let i = 0; i < depts.length; i++) {
    const [dept, count] = depts[i];
    const pct = count / totalDeptFac;
    const dashLen = donutCirc * pct;
    const gap = depts.length > 1 ? 2 : 0;
    html += `<circle cx="100" cy="100" r="${donutR}" fill="none"
      stroke="${deptColors[i % deptColors.length]}" stroke-width="${donutStroke}"
      stroke-dasharray="${Math.max(0, dashLen - gap)} ${donutCirc - dashLen + gap}"
      stroke-dashoffset="${-donutOffset}"
      transform="rotate(-90 100 100)"
      class="donut-seg" data-dept="${dept}" data-count="${count}"/>`;
    donutOffset += dashLen;
  }
  html += `<text x="100" y="92" text-anchor="middle" fill="#FFF" font-size="32" font-weight="800">${S.totalFaculty}</text>
        <text x="100" y="116" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="12" font-weight="600">FACULTY</text>
      </svg>
      </div>
      <div class="donut-legend">`;
  for (let i = 0; i < depts.length; i++) {
    const [dept, count] = depts[i];
    html += `<div class="donut-legend-item">
      <div class="donut-legend-dot" style="background:${deptColors[i % deptColors.length]}"></div>
      <span class="donut-legend-name">${dept}</span>
      <span class="donut-legend-val">${count}</span>
    </div>`;
  }
  html += `</div>
    </div>
  </div></div>
  </div>`;

  container.innerHTML = html;
  if (typeof initHeroAnimation === 'function') initHeroAnimation();
}
