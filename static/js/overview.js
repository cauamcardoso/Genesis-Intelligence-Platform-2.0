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
    <h2 class="hero-heading">From faculty scores to proposal-ready teams.</h2>
    <p class="hero-desc">This platform scores ${S.totalFaculty} UTEP faculty against ${S.totalFocusAreas} DOE Genesis focus areas, then helps assemble optimal research teams for each opportunity. It combines multi-axis scoring with seniority analysis and departmental diversity to recommend PIs, build teams, and generate AI-assisted research concepts that serve as starting points for proposal development.</p>
  </div>`;

  // ═══ 2. STATS + PIPELINE in two-column layout ═══
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px" data-reveal="up">
    <div class="card" style="padding:24px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px">Platform at a Glance</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <div style="font-size:28px;font-weight:800;color:#FFF" data-count-to="${S.totalFaculty}">0</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Faculty Analyzed</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${S.aaiiCount} AAII + ${S.recCount} Recommended</div>
        </div>
        <div>
          <div style="font-size:28px;font-weight:800;color:#FFF" data-count-to="${S.totalChallenges}">0</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">DOE Challenges</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">${S.totalFocusAreas} focus areas total</div>
        </div>
        <div>
          <div style="font-size:28px;font-weight:800;color:var(--accent)" data-count-to="${S.strongMatches}">0</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Strong Matches</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">Composite >= 3 out of 5</div>
        </div>
        <div>
          <div style="font-size:28px;font-weight:800;color:var(--green)" data-count-to="${S.coveragePct}" data-count-suffix="%">0</div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">FA Coverage</div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">Focus areas with a strong match</div>
        </div>
      </div>
    </div>
    <div class="card" style="padding:24px">
      <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px">What This Platform Does</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:12px">The Genesis Intelligence Platform identifies where UTEP's faculty strengths align with DOE Genesis Mission priorities, then helps assemble optimal proposal teams backed by evidence.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(56,189,248,0.10);color:var(--cyan);border:1px solid rgba(56,189,248,0.20)">Multi-axis scoring</span>
        <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(255,130,0,0.10);color:var(--accent);border:1px solid rgba(255,130,0,0.20)">Opportunity mapping</span>
        <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(34,197,94,0.10);color:var(--green);border:1px solid rgba(34,197,94,0.20)">AI team suggestions</span>
        <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(139,92,246,0.10);color:var(--purple);border:1px solid rgba(139,92,246,0.20)">Research directions</span>
        <span style="font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(219,39,119,0.10);color:#DB2777;border:1px solid rgba(219,39,119,0.20)">Word export</span>
      </div>
    </div>
  </div>`;

  // ═══ SECTION 3: PIPELINE INFOGRAPHIC ═══
  const pipeline = [
    { icon: ICONS.search, label: 'Collect', stat: S.totalFaculty + ' Faculty + ' + S.totalFocusAreas + ' Focus Areas', color: 'var(--cyan)', grad: 'var(--grad-blue)', detail: 'Faculty research profiles from two UTEP colleges and 99 DOE Genesis focus area descriptions serve as the input data. AAII-affiliated faculty have in-depth profiles; Recommended faculty are indexed through Google Scholar.' },
    { icon: ICONS.chart, label: 'Score', stat: (S.totalFaculty * S.totalFocusAreas).toLocaleString() + ' Pairs Evaluated', color: 'var(--accent)', grad: 'var(--grad-orange)', detail: 'Every faculty member is scored against every focus area on four axes: Faculty Fit (40%), Competitive Edge (25%), Team Feasibility (20%), and Partnership Readiness (15%). The result is a composite score on a 0-5 scale.' },
    { icon: ICONS.map, label: 'Map', stat: S.strongMatches + ' Strong Matches Found', color: 'var(--green)', grad: 'var(--grad-green)', detail: 'Opportunities are ranked by team-building potential: not just individual scores, but PI availability, departmental diversity, and seniority depth. ' + S.coveragePct + '% of focus areas have at least one strong UTEP match.' },
    { icon: ICONS.users, label: 'Build', stat: 'AI-Suggested Teams', color: '#8B5CF6', grad: 'var(--grad-purple)', detail: 'A PI allocation optimizer assigns leads to focus areas. The team builder suggests Co-PIs and Contributors based on composite scores, departmental diversity, and seniority. Claude generates tailored research directions.' },
    { icon: ICONS.download, label: 'Export', stat: 'Proposal-Ready Packages', color: '#DB2777', grad: 'linear-gradient(135deg,#DB2777,#F59E0B)', detail: 'Each package includes the team, scoring evidence, AI-generated research directions, literature review keywords, and UTEP advantages. Exported as a Word document that faculty can use as the starting point for their proposal.' },
  ];

  html += `<div class="ov-section ov-section-alt">
  <div class="ov-section-title" data-reveal="up">How the Platform Works</div>
  <div class="ov-section-sub" data-reveal="up">Five stages from raw data to a proposal-ready team package.</div>
  <div class="pipeline-infographic" data-reveal="up">`;

  for (let i = 0; i < pipeline.length; i++) {
    const p = pipeline[i];
    html += `<div class="pipeline-stage" data-reveal="up" onclick="togglePipelineDetail(${i})">
      <div class="pipeline-node" style="background:${p.grad}">${p.icon}</div>
      ${i < pipeline.length - 1 ? '<div class="pipeline-connector"><svg width="100%" height="2"><line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255,255,255,0.08)" stroke-width="2" stroke-dasharray="4,4"/></svg></div>' : ''}
      <div class="pipeline-label">${p.label}</div>
      <div class="pipeline-stat">${p.stat}</div>
      <div class="pipeline-detail" id="pipeline-detail-${i}" style="display:none">
        <div style="font-size:11px;color:var(--text2);line-height:1.65;padding:10px 0">${p.detail}</div>
      </div>
    </div>`;
  }

  html += `</div></div>`;

  // Inline script for detail toggle
  html += `<script>
    function togglePipelineDetail(idx) {
      for (let i = 0; i < 5; i++) {
        const el = document.getElementById('pipeline-detail-' + i);
        if (el) el.style.display = i === idx && el.style.display === 'none' ? 'block' : 'none';
      }
    }
  <\/script>`;

  // ═══ SECTION 5: EXPLORE ═══
  html += `<div class="ov-section ov-section-alt">
  <div class="ov-section-title" data-reveal="up">Explore the Platform</div>
  <div class="ov-section-sub" data-reveal="up">Four entry points, depending on what is needed.</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px" data-reveal-stagger>
    <div class="card nav-card-v nc-green" data-reveal="up" onclick="switchTab('proposallab')" style="border-color:rgba(34,197,94,0.20);background:linear-gradient(180deg, rgba(14,21,52,0.9) 0%, rgba(34,197,94,0.08) 100%)">
      <div class="nav-card-v-icon" style="background:var(--grad-green)">${ICONS.bulb}</div>
      <h4>Proposal Lab</h4>
      <p>Build proposal teams, assign PIs, and generate AI-assisted research concepts.</p>
      <div class="nav-card-v-arrow">&rsaquo;</div>
    </div>
    <div class="card nav-card-v nc-orange" data-reveal="up" onclick="openIntelligenceTab('challenges')">
      <div class="nav-card-v-icon" style="background:var(--grad-orange)">${ICONS.target}</div>
      <h4>Challenges & Focus Areas</h4>
      <p>Browse ${S.totalChallenges} challenges and ${S.totalFocusAreas} focus areas with faculty scoring breakdowns.</p>
      <div class="nav-card-v-arrow">&rsaquo;</div>
    </div>
    <div class="card nav-card-v nc-blue" data-reveal="up" onclick="openIntelligenceTab('faculty')">
      <div class="nav-card-v-icon" style="background:var(--grad-blue)">${ICONS.users}</div>
      <h4>Faculty Explorer</h4>
      <p>Search ${S.totalFaculty} researchers by name, department, or expertise.</p>
      <div class="nav-card-v-arrow">&rsaquo;</div>
    </div>
    <div class="card nav-card-v nc-purple" data-reveal="up" onclick="openIntelligenceTab('opportunity')">
      <div class="nav-card-v-icon" style="background:var(--grad-purple)">${ICONS.map}</div>
      <h4>Opportunity Map</h4>
      <p>See where UTEP's strengths align with DOE priorities. Ranked by team-building potential.</p>
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
      <button class="visit-btn" style="font-size:12px;padding:7px 14px" onclick="openIntelligenceTab('methodology')">${ICONS.book} Full Methodology</button>
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
