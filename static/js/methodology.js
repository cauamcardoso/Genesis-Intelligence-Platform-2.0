/* ═══ Methodology Tab - Sub-tabs with Visual Aids ═══ */

let _methodSubTab = 'overview';

async function renderMethodology(container) {
  const L = await DataStore.buildLookups();
  const meta = await DataStore.getMetadata();
  const scores = await DataStore.getScores();
  const methodology = scores.methodology || {};

  const subTabs = [
    { id: 'overview', label: 'Scoring Overview' },
    { id: 'faculty', label: 'Faculty & Data' },
    { id: 'technical', label: 'Technical Pipeline' },
    { id: 'teambuilding', label: 'Team Building' },
    { id: 'portfolio', label: 'Portfolio Optimization' },
    { id: 'limitations', label: 'Limitations' },
  ];

  let html = `<div style="margin-bottom:16px">
    <h2 style="font-size:20px;font-weight:800;color:#FFF;margin-bottom:4px">Methodology</h2>
    <p style="font-size:13px;color:var(--text2);max-width:700px;line-height:1.6">How ${L.stats.totalFaculty} faculty were scored against ${L.stats.totalFocusAreas} focus areas, and how scoring data powers team formation.</p>
  </div>`;

  // Sub-tab bar
  html += `<div class="subview-bar" style="margin-bottom:20px">`;
  for (const st of subTabs) {
    html += `<button class="subview-btn${_methodSubTab === st.id ? ' active' : ''}" onclick="_methodSubTab='${st.id}';renderMethodology($('content'))">${st.label}</button>`;
  }
  html += `</div>`;

  html += `<div class="card" style="max-width:960px">`;

  switch (_methodSubTab) {
    case 'overview': html += renderMethodOverview(L, methodology); break;
    case 'faculty': html += renderMethodFaculty(L); break;
    case 'technical': html += renderMethodTechnical(L, meta, methodology); break;
    case 'teambuilding': html += renderMethodTeamBuilding(L); break;
    case 'portfolio': html += renderMethodPortfolio(L); break;
    case 'limitations': html += renderMethodLimitations(); break;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function renderMethodOverview(L, methodology) {
  const axes = [
    { name: 'Faculty Fit', weight: 40, color: '#38BDF8', method: 'Sentence-transformers + LLM', desc: 'How closely a faculty member\'s research aligns with the focus area description. Measured through semantic similarity of publication text against DOE descriptions, then validated by LLM evaluation.' },
    { name: 'Competitive Edge', weight: 25, color: '#FF8200', method: 'LLM evaluation', desc: 'Whether the faculty member brings unique assets other institutions may lack: specialized equipment, geographic advantages, existing industry partnerships, or rare methodological expertise.' },
    { name: 'Team Feasibility', weight: 20, color: '#22C55E', method: 'LLM evaluation', desc: 'How well the faculty member would complement other strong candidates for the same focus area. Evaluated based on disciplinary diversity, methodological complementarity, and potential for interdisciplinary integration.' },
    { name: 'Partnership Readiness', weight: 15, color: '#8B5CF6', method: 'LLM evaluation', desc: 'Whether existing grants, lab affiliations, or institutional partnerships position the faculty member for the multi-institutional collaboration that Genesis proposals require.' },
  ];

  let html = '';

  // Visual formula
  html += `<div class="method-section">
    <h3>Composite Score Formula</h3>
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:20px;background:rgba(255,255,255,0.02);border-radius:var(--radius);margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:16px;font-weight:800;color:#FFF">Composite</span>
      <span style="font-size:14px;color:var(--text3)">=</span>`;
  for (let i = 0; i < axes.length; i++) {
    const ax = axes[i];
    if (i > 0) html += `<span style="font-size:14px;color:var(--text3)">+</span>`;
    html += `<span style="padding:4px 10px;border-radius:var(--radius-sm);background:${ax.color}20;border:1px solid ${ax.color}40;font-size:12px;font-weight:700;color:${ax.color}">${ax.weight}% ${ax.name}</span>`;
  }
  html += `</div></div>`;

  // Score scale visual
  html += `<div class="method-section">
    <h3>Score Scale (0-5)</h3>
    <div style="display:flex;gap:4px;margin-bottom:14px">`;
  const scaleItems = [
    { score: 0, label: 'No Match', desc: 'No identifiable connection' },
    { score: 1, label: 'Minimal', desc: 'Very distant relevance' },
    { score: 2, label: 'Tangential', desc: 'Some overlap, not direct' },
    { score: 3, label: 'Moderate', desc: 'Clear alignment, worth pursuing' },
    { score: 4, label: 'Strong', desc: 'High alignment with evidence' },
    { score: 5, label: 'Expert', desc: 'Direct, deep expertise match' },
  ];
  for (const s of scaleItems) {
    html += `<div style="flex:1;padding:10px 6px;text-align:center;border-radius:var(--radius-sm);background:${SCORE_BG[s.score]};border:1px solid ${SCORE_COLORS[s.score] || 'rgba(255,255,255,0.06)'}">
      <div style="font-size:18px;font-weight:800;color:${SCORE_TEXT[s.score]}">${s.score}</div>
      <div style="font-size:10px;font-weight:600;color:${SCORE_TEXT[s.score]}">${s.label}</div>
      <div style="font-size:9px;color:var(--text3);margin-top:2px">${s.desc}</div>
    </div>`;
  }
  html += `</div></div>`;

  // Four axes detail
  html += `<div class="method-section"><h3>Four Scoring Axes</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">`;
  for (const ax of axes) {
    html += `<div class="axis-card" style="border-left-color:${ax.color}">
      <h4>${ax.name}</h4>
      <div class="weight">${ax.weight}% weight | ${ax.method}</div>
      <p>${ax.desc}</p>
    </div>`;
  }
  html += `</div></div>`;

  // Stats
  const dist = (L.stats || {});
  html += `<div class="method-section"><h3>Scoring Statistics</h3>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><div style="font-size:20px;font-weight:800;color:#FFF">${(L.stats.totalFaculty * L.stats.totalFocusAreas).toLocaleString()}</div><div style="font-size:10px;color:var(--text3)">Total pairs scored</div></div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><div style="font-size:20px;font-weight:800;color:var(--accent)">${L.stats.strongMatches}</div><div style="font-size:10px;color:var(--text3)">Strong matches (>= 3)</div></div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><div style="font-size:20px;font-weight:800;color:var(--green)">${L.stats.coveragePct}%</div><div style="font-size:10px;color:var(--text3)">FA coverage</div></div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><div style="font-size:20px;font-weight:800;color:var(--cyan)">4</div><div style="font-size:10px;color:var(--text3)">Scoring axes</div></div>
    </div>
  </div>`;

  return html;
}

function renderMethodFaculty(L) {
  return `
    <div class="method-section">
      <h3>Faculty Selection Criteria</h3>
      <p>The ${L.stats.totalFaculty} faculty included were selected from two UTEP colleges judged most relevant to the Genesis Mission: the College of Science and the College of Engineering. Only tenured and tenure-track professors were included, reflecting PI/Co-PI eligibility requirements.</p>
    </div>

    <div class="method-section">
      <h3>Two Faculty Tiers</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="padding:16px;border-radius:var(--radius-sm);border:1px solid rgba(11,197,234,0.2);background:rgba(11,197,234,0.04)">
          <div style="font-size:14px;font-weight:700;color:var(--cyan);margin-bottom:6px">AAII Affiliated (${L.stats.aaiiCount})</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.65">Faculty formally affiliated with the Advanced Artificial Intelligence Institute. Data collected in depth: CVs, university profiles, institutional bios, expertise keyword lists, and research websites. This richer data supports higher-confidence scoring.</div>
        </div>
        <div style="padding:16px;border-radius:var(--radius-sm);border:1px solid rgba(123,97,255,0.2);background:rgba(123,97,255,0.04)">
          <div style="font-size:14px;font-weight:700;color:var(--purple);margin-bottom:6px">Recommended (${L.stats.recCount})</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.65">Non-affiliated faculty from Science and Engineering colleges. Google Scholar profiles serve as the primary proxy for assessing expertise and publication activity. Only faculty with active Scholar profiles are included.</div>
        </div>
      </div>
    </div>

    <div class="method-section">
      <h3>Data Sources</h3>
      <ul>
        <li><strong>RFA Document:</strong> Genesis Call for Proposals (DE-FOA-0003612), used to extract challenge descriptions, focus area specifications, and evaluation criteria.</li>
        <li><strong>AAII Faculty Profiles:</strong> Detailed documents including CVs, bios, research statements, and expertise keyword lists from the AAII institutional directory.</li>
        <li><strong>Google Scholar Profiles:</strong> Publication lists, citation counts, h-index values, and co-author networks for Recommended-tier faculty.</li>
      </ul>
    </div>`;
}

function renderMethodTechnical(L, meta, methodology) {
  // Pipeline flow diagram
  let html = `<div class="method-section">
    <h3>Scoring Pipeline</h3>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">`;
  const steps = [
    { label: 'Data Collection', desc: 'Faculty profiles + RFA text', color: 'var(--cyan)' },
    { label: 'Text Extraction', desc: 'Parse into scored segments', color: 'var(--blue)' },
    { label: 'Embedding Match', desc: 'all-MiniLM-L6-v2 similarity', color: 'var(--green)' },
    { label: 'LLM Evaluation', desc: 'Claude scores 3 axes', color: 'var(--accent)' },
    { label: 'Composite Score', desc: 'Weighted average (0-5)', color: 'var(--purple)' },
  ];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    html += `<div style="flex:1;min-width:120px;padding:12px;text-align:center;border-radius:var(--radius-sm);border-top:3px solid ${s.color};background:rgba(255,255,255,0.02)">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:4px">${i + 1}. ${s.label}</div>
      <div style="font-size:10px;color:var(--text3)">${s.desc}</div>
    </div>`;
    if (i < steps.length - 1) html += `<div style="display:flex;align-items:center;color:var(--text3)">${ICONS.arrowRight}</div>`;
  }
  html += `</div></div>`;

  html += `
    <div class="method-section">
      <h3>Embedding Model</h3>
      <p>Faculty Fit scores begin with semantic similarity computed using <strong>all-MiniLM-L6-v2</strong>, a sentence-transformer model. Faculty research text is encoded into embeddings and compared against each focus area description using cosine similarity. The raw similarity score is then calibrated to the 0-5 scale through a percentile-based mapping.</p>
    </div>
    <div class="method-section">
      <h3>LLM Evaluation Protocol</h3>
      <p>Three of the four scoring axes (Competitive Edge, Team Feasibility, Partnership Readiness) are evaluated by Claude (claude-sonnet-4-20250514). For each faculty-focus area pair, the LLM receives the faculty's research profile and the focus area description, then returns an integer score (0-5) with a brief justification for each axis. Faculty Fit also incorporates an LLM component that is averaged with the embedding-based score.</p>
      <p>To reduce variability, each evaluation uses a structured prompt with explicit scoring criteria and examples. The same prompt template is applied consistently across all ${(L.stats.totalFaculty * L.stats.totalFocusAreas).toLocaleString()} pair evaluations.</p>
    </div>
    <div class="method-section">
      <h3>Pipeline Information</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><span style="font-size:11px;color:var(--text3)">Generated:</span> <span style="font-size:11px;color:var(--text2)">${meta.generated_at ? new Date(meta.generated_at).toLocaleString() : 'N/A'}</span></div>
        <div style="padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><span style="font-size:11px;color:var(--text3)">Duration:</span> <span style="font-size:11px;color:var(--text2)">${meta.pipeline_duration_seconds ? Math.round(meta.pipeline_duration_seconds / 60) + ' minutes' : 'N/A'}</span></div>
        <div style="padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><span style="font-size:11px;color:var(--text3)">LLM API:</span> <span style="font-size:11px;color:var(--text2)">Claude claude-sonnet-4-20250514</span></div>
        <div style="padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm)"><span style="font-size:11px;color:var(--text3)">Embedding:</span> <span style="font-size:11px;color:var(--text2)">all-MiniLM-L6-v2 (local)</span></div>
      </div>
    </div>`;
  return html;
}

function renderMethodTeamBuilding(L) {
  return `
    <div class="method-section">
      <h3>From Scores to Teams</h3>
      <p>Scoring data feeds into a team formation system that identifies optimal PI assignments and team compositions for each focus area. The system operates in two stages: first, a global PI allocation optimizer assigns PIs to focus areas to maximize coverage; then, a team suggestion algorithm fills out each team with Co-PIs and Contributors.</p>
    </div>
    <div class="method-section">
      <h3>PI Allocation Optimizer</h3>
      <p>A greedy 1:1 matching algorithm assigns each eligible faculty member to at most one focus area as PI. The algorithm sorts all faculty-FA pairs by composite score (descending), then assigns each pair if neither the faculty member nor the focus area has already been assigned. A lock mechanism allows manual overrides that persist across re-optimization runs.</p>
      <p>Constraints are enforced: faculty with role restrictions (e.g., "contributor only") are excluded from PI consideration. Seniority score serves as a tiebreaker when composite scores are equal.</p>
    </div>
    <div class="method-section">
      <h3>Seniority Scoring</h3>
      <p>Each faculty member receives a seniority score (0-5) based on three factors:</p>
      <div style="display:flex;gap:8px;margin:12px 0">
        <div style="flex:1;padding:12px;border-radius:var(--radius-sm);background:rgba(255,130,0,0.04);border:1px solid rgba(255,130,0,0.12);text-align:center">
          <div style="font-size:16px;font-weight:800;color:var(--accent)">50%</div>
          <div style="font-size:11px;font-weight:600;color:#FFF">Academic Title</div>
          <div style="font-size:10px;color:var(--text3)">Professor=5, Associate=3, Assistant=1</div>
        </div>
        <div style="flex:1;padding:12px;border-radius:var(--radius-sm);background:rgba(56,189,248,0.04);border:1px solid rgba(56,189,248,0.12);text-align:center">
          <div style="font-size:16px;font-weight:800;color:var(--cyan)">30%</div>
          <div style="font-size:11px;font-weight:600;color:#FFF">h-index Percentile</div>
          <div style="font-size:10px;color:var(--text3)">Ranked among all ${L.stats.totalFaculty} faculty</div>
        </div>
        <div style="flex:1;padding:12px;border-radius:var(--radius-sm);background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);text-align:center">
          <div style="font-size:16px;font-weight:800;color:var(--purple)">20%</div>
          <div style="font-size:11px;font-weight:600;color:#FFF">Citation Percentile</div>
          <div style="font-size:10px;color:var(--text3)">Ranked among all ${L.stats.totalFaculty} faculty</div>
        </div>
      </div>
    </div>
    <div class="method-section">
      <h3>AI-Assisted Research Concepts</h3>
      <p>The Proposal Lab integrates Claude to generate research directions tailored to each team-focus area combination. The AI receives the focus area description, team member profiles (expertise, h-index, publications), and selected UTEP advantages, then suggests 2-3 specific research directions with technical approach descriptions and team positioning rationale. These serve as conversation starters for faculty, not final proposals.</p>
    </div>`;
}

function renderMethodPortfolio(L) {
  return `
    <div class="method-section">
      <h3>Portfolio Optimization</h3>
      <p>The AAII Portfolio Optimizer addresses a problem that individual team building cannot: how to distribute a limited pool of faculty across multiple proposals simultaneously to maximize the total portfolio strength. This is the difference between building one strong proposal and building eight competitive proposals that collectively give UTEP the best chance of winning multiple awards.</p>
    </div>

    <div class="method-section">
      <h3>Two Levels of Opportunity Assessment</h3>
      <p>The platform distinguishes between two complementary views of opportunity strength:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:12px 0">
        <div style="padding:16px;border-radius:var(--radius-sm);border:1px solid rgba(56,189,248,0.2);background:rgba(56,189,248,0.04)">
          <div style="font-size:13px;font-weight:700;color:var(--cyan);margin-bottom:6px">Overall Opportunity Strength</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.65">Assessed in the Opportunity Map using ALL ${L.stats.totalFaculty} faculty. Measures how well UTEP as a whole can compete for a given focus area, considering every available researcher regardless of institutional affiliation.</div>
        </div>
        <div style="padding:16px;border-radius:var(--radius-sm);border:1px solid rgba(255,130,0,0.2);background:rgba(255,130,0,0.04)">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:6px">AAII Feasibility Score</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.65">Assessed in the Portfolio Optimizer using only AAII-affiliated faculty. Measures organizational feasibility: can the Institute field a competitive team from its own faculty? A focus area may be strong overall but weak for AAII if the top candidates are not AAII members.</div>
        </div>
      </div>
      <p>The Portfolio Optimizer shows both scores, allowing the strategist to see when selecting an organizationally feasible proposal means trading off overall proposal strength, and by how much.</p>
    </div>

    <div class="method-section">
      <h3>Allocation Algorithm</h3>
      <p>The portfolio allocation runs in multiple passes to balance competing constraints:</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">
        <div style="display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border-left:3px solid var(--accent)">
          <div style="font-size:11px;font-weight:800;color:var(--accent);flex-shrink:0;width:60px">Pass 0</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5"><strong>Preferred PI Assignment.</strong> Faculty designated as leadership candidates by the strategist are assigned as PIs first, on their strongest available focus area. This ensures key faculty lead proposals.</div>
        </div>
        <div style="display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border-left:3px solid var(--cyan)">
          <div style="font-size:11px;font-weight:800;color:var(--cyan);flex-shrink:0;width:60px">Pass 1</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5"><strong>General PI Allocation.</strong> Remaining proposals without PIs are filled using a greedy sort by composite + seniority + AAII affiliation bonus. Each faculty can be PI on at most one proposal.</div>
        </div>
        <div style="display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);background:rgba(255,130,0,0.02);border-left:3px solid var(--green)">
          <div style="font-size:11px;font-weight:800;color:var(--green);flex-shrink:0;width:60px">Pass 2</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5"><strong>Co-PI Fill.</strong> Weakest teams are prioritized. Candidates are ranked by composite + departmental diversity bonus + AAII/preference bonus. Up to 2 Co-PIs per team.</div>
        </div>
        <div style="display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border-left:3px solid var(--purple)">
          <div style="font-size:11px;font-weight:800;color:var(--purple);flex-shrink:0;width:60px">Pass 3</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5"><strong>Contributor Fill.</strong> Remaining slots filled by composite score, up to 5 members per team.</div>
        </div>
        <div style="display:flex;gap:12px;padding:12px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border-left:3px solid #DB2777">
          <div style="font-size:11px;font-weight:800;color:#DB2777;flex-shrink:0;width:60px">Post</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5"><strong>Promotion Pass.</strong> Preferred faculty who ended up as contributors are promoted to Co-PI. Unassigned preferred faculty are placed on their best available team.</div>
        </div>
      </div>
    </div>

    <div class="method-section">
      <h3>Key Constraints</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:12px 0">
        <div style="padding:14px;text-align:center;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--card-border)">
          <div style="font-size:20px;font-weight:800;color:var(--accent)">1</div>
          <div style="font-size:11px;font-weight:600;color:#FFF">PI per faculty</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">Each faculty can lead at most one proposal</div>
        </div>
        <div style="padding:14px;text-align:center;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--card-border)">
          <div style="font-size:20px;font-weight:800;color:var(--accent)">2</div>
          <div style="font-size:11px;font-weight:600;color:#FFF">Max teams per faculty</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">No individual is spread across more than 2 proposals</div>
        </div>
        <div style="padding:14px;text-align:center;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--card-border)">
          <div style="font-size:20px;font-weight:800;color:var(--accent)">3</div>
          <div style="font-size:11px;font-weight:600;color:#FFF">Mandatory focus areas</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">C20-A, C20-B, C20-C always included</div>
        </div>
      </div>
    </div>

    <div class="method-section">
      <h3>Senior Faculty Recovery</h3>
      <p>After the initial portfolio selection, the optimizer checks whether any senior or preferred faculty would be left without a strong focus area in the portfolio. If a senior faculty member's best match is not among the selected proposals, the algorithm considers replacing the weakest non-mandatory proposal with that faculty's best focus area. This ensures that experienced researchers are not excluded simply because their strongest match did not rank in the initial top N.</p>
    </div>

    <div class="method-section">
      <h3>Manual Override Design</h3>
      <p>The optimizer provides a starting point, not a final answer. Every assignment can be overridden through drag-and-drop: faculty can be moved between teams, proposals can be added or removed, and the system re-scores the entire portfolio after each change. This combination of algorithmic optimization with human judgment is intentional. The strategist brings qualitative knowledge (faculty availability, interest, existing collaborations) that the scoring data does not capture.</p>
    </div>`;
}

function renderMethodLimitations() {
  const caveats = [
    { title: 'Data Asymmetry', text: 'AAII Affiliated faculty have substantially richer input data than Recommended faculty. Scores for AAII faculty may be more accurate across all axes, while Recommended scores are more dependent on Google Scholar content.' },
    { title: 'Vocabulary Mismatch', text: 'Faculty who describe their research using different terminology than the DOE RFA may receive lower Faculty Fit scores despite genuine expertise. The embedding model mitigates this partially but cannot fully resolve semantic gaps across disciplines.' },
    { title: 'LLM Variability', text: 'Claude evaluations, while guided by structured prompts, involve inherent nondeterminism. Running the same pipeline twice may produce slightly different scores for individual pairs, though aggregate patterns remain consistent.' },
    { title: 'Temporal Snapshot', text: 'Scores reflect faculty profiles at the time of data collection. Recent publications, new grants, or changes in research direction are not captured until the pipeline is re-run.' },
    { title: 'Missing Faculty', text: 'Faculty without Google Scholar profiles or outside the College of Science and Engineering are not currently included. The platform does not claim exhaustive coverage of all UTEP researchers.' },
    { title: 'Single-Institution Scope', text: 'The platform only scores UTEP faculty. Genesis proposals require multi-institutional teams. The Opportunity Map highlights where external partners are needed, but does not identify specific external collaborators.' },
    { title: 'Score Interpretation', text: 'Scores are relative indicators of match quality, not absolute measures of research competence. A low score means the faculty member\'s documented expertise does not align well with a particular focus area, not that their research is less valuable.' },
  ];

  let html = `<div class="method-section"><h3>Limitations and Caveats</h3>
    <p style="margin-bottom:14px">The scoring methodology has known limitations that users should consider when interpreting results:</p>
    <div style="display:flex;flex-direction:column;gap:8px">`;
  for (let i = 0; i < caveats.length; i++) {
    const c = caveats[i];
    html += `<div style="display:flex;gap:12px;padding:12px 14px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.02);border:1px solid var(--card-border)">
      <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,130,0,0.12);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${i + 1}</div>
      <div><div style="font-size:12px;font-weight:700;color:#FFF;margin-bottom:2px">${c.title}</div><div style="font-size:11px;color:var(--text2);line-height:1.65">${c.text}</div></div>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}
