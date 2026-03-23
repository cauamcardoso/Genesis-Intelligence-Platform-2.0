/* ═══ Methodology Tab ═══ */

async function renderMethodology(container) {
  const L = await DataStore.buildLookups();
  const meta = await DataStore.getMetadata();
  const scores = await DataStore.getScores();
  const methodology = scores.methodology || {};

  let html = `<div class="card" style="max-width:960px;margin:0 auto">
    <div class="method-section">
      <h3>Scoring Methodology</h3>
      <p>This platform implements a multi-axis scoring methodology to evaluate ${L.stats.totalFaculty} UTEP faculty members against ${L.stats.totalFocusAreas} DOE Genesis Mission focus areas spanning ${L.stats.totalChallenges} challenge topics. The core design principle is <strong>hybrid triangulation</strong>: combining automated text-based semantic analysis with structured expert evaluation by a large language model (LLM) to produce scores that reflect both measurable textual alignment and contextual judgment about research relevance.</p>
      <p>The rationale for this hybrid approach is straightforward. Pure keyword or embedding-based matching captures surface-level topical overlap but misses important contextual factors, such as whether a researcher's expertise fills a specific team role, or whether they hold unique assets (e.g., specialized equipment, national lab partnerships) that would strengthen a proposal. Conversely, relying solely on LLM evaluation introduces subjectivity and potential inconsistency. By triangulating across four complementary axes, each measured through a different method, the system produces scores that are more robust than any single approach would yield.</p>
    </div>

    <div class="method-section">
      <h3>Faculty Selection Criteria</h3>
      <p>The ${L.stats.totalFaculty} faculty included in this analysis were selected through a deliberate scoping process designed to capture UTEP researchers most likely to be relevant to the Genesis Mission:</p>
      <ul>
        <li><strong>College Selection:</strong> Faculty were drawn from two colleges at UTEP judged to have the highest concentration of Genesis-relevant expertise: the College of Science and the College of Engineering. These colleges house the departments most closely aligned with the DOE's challenge areas in energy, materials, computing, and environmental science.</li>
        <li><strong>Rank Filter:</strong> Only tenured and tenure-track professors were included. This decision reflects the expectation that PI and Co-PI roles on Genesis proposals will typically require the stability, track record, and institutional standing associated with tenured or tenure-track appointments.</li>
        <li><strong>AAII Affiliated Faculty (${L.stats.aaiiCount}):</strong> For faculty formally affiliated with the Advanced Artificial Intelligence Institute, publicly available information was collected in depth, including CVs, university profiles, institutional bios, expertise keyword lists, and personal research websites. This richer data supports higher-confidence scoring across all four axes.</li>
        <li><strong>Recommended Faculty (${L.stats.recCount}):</strong> For non-affiliated faculty from the two colleges, Google Scholar profiles served as the primary proxy document for assessing expertise, experience, and publication activity. Only faculty with an active, working Google Scholar profile were included in the current version of the platform. Faculty without a Scholar presence are not represented and may be added in future iterations as additional data sources become available.</li>
      </ul>
      <p>This scoping approach prioritizes coverage of the most Genesis-relevant research areas at UTEP while acknowledging that the current database does not capture every potentially relevant faculty member across the institution.</p>
    </div>

    <div class="method-section">
      <h3>Data Sources</h3>
      <p>All scoring is derived from the following primary data sources:</p>
      <ul>
        <li><strong>DOE RFA (DE-FOA-0003612):</strong> The full Genesis Call for Proposals document, parsed into ${L.stats.totalChallenges} challenges and ${L.stats.totalFocusAreas} focus areas. Each focus area includes its official title and the DOE-provided description text, which serves as the target for semantic matching.</li>
        <li><strong>AAII Faculty Profiles:</strong> Institutional bios, expertise keyword lists, Google Scholar publication records, CVs, and university profile pages. This richer data availability generally supports higher-confidence scoring.</li>
        <li><strong>Recommended Faculty Profiles:</strong> Complete Google Scholar profiles, including publication records, citation metrics, co-author networks, and research interest descriptions.</li>
      </ul>
    </div>

    <div class="method-section">
      <h3>Score Scale and Interpretation</h3>
      <p>All axis scores and composite scores use a 0-5 integer scale. The scale is designed to be interpretable in the context of DOE proposal team assembly:</p>
      <table class="score-table">
        <tr><th>Score</th><th>Label</th><th>Interpretation</th></tr>
        <tr><td style="background:${SCORE_COLORS[0]}">0</td><td>No Match</td><td>No relevant expertise identified in the faculty member's profile for this focus area.</td></tr>
        <tr><td style="background:${SCORE_COLORS[1]};color:${SCORE_TEXT[1]}">1</td><td>Minimal</td><td>Peripheral awareness only. The faculty member works in a tangentially related field with no direct publications or demonstrated activity in the focus area's domain.</td></tr>
        <tr><td style="background:${SCORE_COLORS[2]};color:${SCORE_TEXT[2]}">2</td><td>Tangential</td><td>Related methods or adjacent domain expertise that could potentially transfer. The faculty member has relevant foundational knowledge but lacks direct evidence of work in this specific area.</td></tr>
        <tr><td style="background:${SCORE_COLORS[3]};color:${SCORE_TEXT[3]}">3</td><td>Moderate</td><td>Demonstrable relevant expertise with publications or projects that meaningfully overlap with the focus area. A solid contributor on a proposal team.</td></tr>
        <tr><td style="background:${SCORE_COLORS[4]};color:${SCORE_TEXT[4]}">4</td><td>Strong</td><td>Direct expertise supported by multiple relevant publications and/or active research programs. A strong candidate for a key role on the proposal team.</td></tr>
        <tr><td style="background:${SCORE_COLORS[5]};color:${SCORE_TEXT[5]}">5</td><td>Expert</td><td>PI-level authority with defining publications, grants, or leadership roles in the exact domain of the focus area. A candidate for lead investigator on this topic.</td></tr>
      </table>
    </div>

    <div class="method-section">
      <h3>Four Scoring Axes</h3>
      <p>Each faculty-focus area pair is evaluated across four complementary dimensions. The axes are weighted to reflect the relative importance of different factors in building competitive DOE proposals. The weights were calibrated based on the structure of DOE Genesis evaluation criteria, which prioritize research alignment and institutional differentiation.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
        <div class="card axis-card" style="border-left-color:var(--cyan)">
          <h4>${ICONS.search} Axis 1: Faculty Fit (40%)</h4>
          <div class="weight">Automated - Sentence-Transformer Embeddings</div>
          <p>This axis measures the semantic similarity between a faculty member's research corpus and the focus area's description text from the RFA. The system constructs a research profile for each faculty member by concatenating their bio, expertise keywords, and publication titles (with recent publications from the last 5 years and higher-cited works receiving increased weight in the representation).</p>
          <p>Both the faculty research text and the focus area description are encoded into dense vector embeddings using the <code>all-MiniLM-L6-v2</code> sentence-transformer model (384-dimensional embeddings). Cosine similarity between the two vectors yields a continuous similarity score, which is then mapped to the 0-5 integer scale using percentile-based calibrated thresholds derived from the full distribution of faculty-focus area similarities.</p>
          <p><strong>Why 40%:</strong> Research alignment is the single most important factor in DOE proposal competitiveness. A faculty member whose published work directly addresses a focus area's domain is the strongest signal of potential contribution. This axis is also the most objective and reproducible of the four, relying on deterministic mathematical operations rather than LLM judgment.</p>
        </div>

        <div class="card axis-card" style="border-left-color:var(--green)">
          <h4>${ICONS.users} Axis 2: Team Feasibility (20%)</h4>
          <div class="weight">LLM-Evaluated - Structured Expert Assessment</div>
          <p>This axis evaluates whether a faculty member can contribute to a viable multi-disciplinary team for the focus area. The LLM receives the faculty member's full profile alongside the focus area description and the profiles of other faculty who scored well on Faculty Fit for the same area.</p>
          <p>The evaluation considers: (1) whether the faculty member's expertise fills a specific, defined role on the team rather than duplicating capabilities already represented; (2) departmental and disciplinary diversity relative to other high-scoring faculty; and (3) whether the combination of this faculty member with others creates cross-disciplinary complementarity that strengthens the proposal narrative.</p>
          <p><strong>Why 20%:</strong> Team composition matters for DOE proposals, which require multi-institutional and often multi-disciplinary teams. However, team feasibility is partially derivative of Faculty Fit (strong individual fits tend to compose well), so it receives moderate weight.</p>
        </div>

        <div class="card axis-card" style="border-left-color:var(--accent)">
          <h4>${ICONS.zap} Axis 3: Competitive Edge (25%)</h4>
          <div class="weight">LLM-Evaluated - Structured Expert Assessment</div>
          <p>This axis assesses unique advantages a faculty member brings that would differentiate a UTEP-led proposal from competitors at other institutions. The LLM evaluates: rare or specialized equipment and facilities; unique datasets (e.g., border region environmental monitoring, arid climate data, transboundary water systems); existing relationships with DOE national laboratories (Sandia, LANL, INL); active patents or IP; industry partnerships and co-PI arrangements; and uncommon methodological expertise that addresses a gap in the focus area's technical requirements.</p>
          <p><strong>Why 25%:</strong> Competitive differentiation is critical in DOE funding decisions. UTEP's geographic position, its status as a Hispanic-Serving Institution, and the unique research assets of the border region represent real competitive advantages that text similarity alone cannot capture. This axis exists to find those differentiators.</p>
        </div>

        <div class="card axis-card" style="border-left-color:var(--purple)">
          <h4>${ICONS.link} Axis 4: Partnership Readiness (15%)</h4>
          <div class="weight">LLM-Evaluated - Structured Expert Assessment</div>
          <p>This axis measures evidence of existing external partnerships relevant to the focus area. The LLM examines: prior DOE, DOD, or NSF collaborations; national laboratory affiliations or joint appointments; industry co-PIs on funded grants; multi-institutional grant leadership; and joint publications with researchers at national laboratories or partner institutions.</p>
          <p>Higher scores indicate an established partnership network that reduces the time and effort needed to assemble a credible multi-institutional team, which is a requirement for Genesis proposals (teams must include at least 2 of 3 categories: National Lab, Industry, Academia).</p>
          <p><strong>Why 15%:</strong> While partnership infrastructure is valuable, it is the most volatile of the four axes (partnerships change frequently) and can be established relatively quickly compared to deep research expertise. It receives the lowest weight but still contributes meaningfully to composite scores.</p>
        </div>
      </div>
    </div>

    <div class="method-section">
      <h3>Composite Score Calculation</h3>
      <p>The composite score for each faculty-focus area pair is computed as a weighted linear combination of the four axis scores:</p>
      <div class="card" style="padding:16px;margin:12px 0;font-family:monospace;font-size:14px;color:var(--cyan);text-align:center">
        Composite = 0.40 x Faculty Fit + 0.20 x Team Feasibility + 0.25 x Competitive Edge + 0.15 x Partnership Readiness
      </div>
      <p>The composite score ranges from 0 to 5. In practice, achieving a composite of 5 would require expert-level scores across all four axes, which is exceptionally rare. The distribution of composite scores across all ${(L.stats.totalFaculty * L.stats.totalFocusAreas).toLocaleString()} possible faculty-focus area pairs is heavily right-skewed: most pairs score 0 (no relevance), with a smaller tail of moderate to strong matches worth investigating for proposal teams.</p>
      <p>For the main analysis views (Challenge Explorer, Faculty Explorer, and Scoring Matrix), only faculty-focus area pairs with a composite score of 3 or higher are displayed as primary matches. This threshold corresponds to the "Moderate" level, indicating demonstrable relevant expertise. All faculty remain accessible in the complete Faculty Explorer and Scoring Matrix views regardless of score.</p>
    </div>

    <div class="method-section">
      <h3>Faculty Tier Definitions</h3>
      <ul>
        <li><strong style="color:var(--cyan)">AAII Affiliated (${L.stats.aaiiCount}):</strong> Faculty formally affiliated with UTEP's Advanced Artificial Intelligence Institute. These faculty have richer data profiles available for scoring (institutional bios, full CVs, detailed expertise profiles in addition to Google Scholar data), which generally supports higher-confidence scores.</li>
        <li><strong style="color:var(--purple)">Recommended (${L.stats.recCount}):</strong> Tenured and tenure-track faculty from UTEP's Colleges of Science and Engineering with active Google Scholar profiles. Scored primarily using publication records, citation metrics, and research interest descriptions. Faculty were included based on research relevance to Genesis focus areas, not departmental affiliation or prior relationships.</li>
      </ul>
    </div>

    <div class="method-section">
      <h3>LLM Evaluation Protocol</h3>
      <p>Three of the four scoring axes (Team Feasibility, Competitive Edge, Partnership Readiness) use LLM-based evaluation via <strong>Anthropic's Claude (claude-sonnet-4-20250514)</strong>. The protocol is designed for consistency and reproducibility:</p>
      <ul>
        <li><strong>Structured Prompting:</strong> Each evaluation uses a standardized prompt template that provides the LLM with the faculty member's full profile (bio, keywords, publications, metrics) and the focus area's description. The prompt specifies the exact evaluation criteria and scoring rubric for the axis being assessed.</li>
        <li><strong>Constrained Output:</strong> The LLM is instructed to return an integer score (0-5) with a brief justification. This keeps the output structured and makes it easier to audit individual scores.</li>
        <li><strong>Rate-Limited Execution:</strong> API calls are rate-limited (0.5s between calls) to ensure consistent processing. The full scoring pipeline processes all ${(L.stats.totalFaculty * L.stats.totalFocusAreas).toLocaleString()} pairs sequentially.</li>
        <li><strong>Deterministic Seeds:</strong> Temperature is set to 0 to maximize output consistency across runs.</li>
      </ul>
    </div>

    <div class="method-section">
      <h3>Limitations and Caveats</h3>
      <p>The following limitations should be considered when interpreting scores:</p>
      <ul>
        <li><strong>Data Asymmetry Between Tiers:</strong> AAII Affiliated faculty have substantially richer data profiles (bios, CVs, detailed keywords) compared to Recommended faculty (Google Scholar profiles only). This asymmetry means that scoring precision and confidence is generally higher for the AAII tier. A Recommended faculty member with a score of 3 may in reality warrant a 4 if richer data were available, and vice versa.</li>
        <li><strong>Vocabulary Mismatch:</strong> The Faculty Fit axis relies on text similarity, which can miss expertise expressed using different terminology than the RFA. For example, a faculty member who works on "computational materials discovery" may not score highly against a focus area described as "advanced simulation for materials design" despite substantive overlap. The LLM-evaluated axes partially compensate for this, but vocabulary gaps remain a systematic source of error.</li>
        <li><strong>LLM Judgment Variability:</strong> While the evaluation protocol is designed for consistency, LLM outputs are inherently stochastic. Scores on the three LLM-evaluated axes may vary slightly across pipeline runs, particularly for borderline cases (e.g., a faculty member on the boundary between a 2 and a 3). The composite score's multi-axis design mitigates the impact of any single axis's variability.</li>
        <li><strong>Static Snapshot:</strong> Faculty profiles reflect data at the time of extraction (${meta.generated_at ? new Date(meta.generated_at).toLocaleDateString() : 'see pipeline info'}). The pipeline can be re-run as faculty profiles are updated, but scores do not automatically refresh.</li>
        <li><strong>No Ground Truth Validation:</strong> There is no labeled dataset of "correct" faculty-focus area matches to formally validate against. The methodology was calibrated by checking that known strong matches (e.g., faculty with prior DOE grants in directly relevant areas) received high scores, but this is informal validation, not rigorous benchmarking.</li>
        <li><strong>Scholar Coverage Gaps:</strong> Faculty whose research outputs are well-represented on Google Scholar will tend to score higher than those whose work appears primarily in other venues (conference proceedings, technical reports, patents). Faculty without a working Google Scholar profile are not currently represented in the Recommended tier.</li>
        <li><strong>College Scope:</strong> The current analysis covers faculty from two UTEP colleges (Science and Engineering). Researchers in other colleges whose work may be relevant to Genesis focus areas (e.g., health sciences, liberal arts) are not included in this version.</li>
      </ul>
    </div>

    <div class="method-section">
      <h3>Pipeline Information</h3>
      <ul>
        <li><strong>Generated:</strong> ${meta.generated_at ? new Date(meta.generated_at).toLocaleString() : 'N/A'}</li>
        <li><strong>Pipeline Duration:</strong> ${meta.pipeline_duration_seconds ? meta.pipeline_duration_seconds + 's' : 'N/A'}</li>
        <li><strong>Scoring Method:</strong> ${meta.scoring_method || 'Multi-axis weighted composite (4 axes)'}</li>
        <li><strong>Embedding Model:</strong> all-MiniLM-L6-v2 (sentence-transformers)</li>
        <li><strong>LLM:</strong> Anthropic Claude (claude-sonnet-4-20250514), temperature 0, structured prompting</li>
        <li><strong>Total Pairs Evaluated:</strong> ${(L.stats.totalFaculty * L.stats.totalFocusAreas).toLocaleString()}</li>
        <li><strong>Non-Zero Scored Pairs:</strong> ${L.scores.scores.length.toLocaleString()}</li>
        <li><strong>Version:</strong> ${meta.version || '2.0.0'}</li>
      </ul>
    </div>
  </div>`;

  container.innerHTML = html;
}
