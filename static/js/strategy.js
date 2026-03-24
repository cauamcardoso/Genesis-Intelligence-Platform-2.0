/* ═══ Strategy Dashboard — UTEP Strength Index & PI Optimizer ═══ */

const Strategy = {

  /* ─── UTEP Strength Index ─── */

  /**
   * Compute UTEP's strength per challenge.
   * For each challenge, take the top N faculty composites across all its FAs, average them.
   */
  computeChallengeStrengths(L, topN = 5) {
    const strengths = [];
    for (const c of L.challenges) {
      const allScores = [];
      const faStrengths = [];

      for (const fa of c.focus_areas) {
        const faScores = (L.topFacultyByFA[fa.id] || [])
          .filter(s => s.composite >= 2)
          .map(s => s.composite);

        // FA strength = avg of top 3
        const faTop = faScores.slice(0, 3);
        const faAvg = faTop.length ? faTop.reduce((a, b) => a + b, 0) / faTop.length : 0;
        faStrengths.push({
          id: fa.id,
          title: fa.title,
          letter: fa.letter,
          strength: Math.round(faAvg * 10) / 10,
          facultyCount: faScores.filter(s => s >= 3).length,
          topScore: faScores[0] || 0,
        });

        allScores.push(...faScores);
      }

      // Challenge strength = avg of top N composites across all FAs
      allScores.sort((a, b) => b - a);
      const top = allScores.slice(0, topN);
      const avg = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;

      strengths.push({
        id: c.id,
        number: c.number,
        title: c.title,
        strength: Math.round(avg * 10) / 10,
        totalFacultyStrong: allScores.filter(s => s >= 3).length,
        focusAreaCount: c.focus_areas.length,
        coveredFAs: faStrengths.filter(f => f.facultyCount > 0).length,
        faStrengths: faStrengths.sort((a, b) => b.strength - a.strength),
      });
    }

    return strengths.sort((a, b) => b.strength - a.strength);
  },

  /**
   * Get the strength tier for coloring
   */
  strengthTier(score) {
    if (score >= 4) return { label: 'Very Strong', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' };
    if (score >= 3) return { label: 'Strong', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)' };
    if (score >= 2) return { label: 'Moderate', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    return { label: 'Weak', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
  },

  /**
   * Compute opportunity score for every focus area.
   * Ranks FAs by team-building potential: strength, PI availability, dept diversity, seniority depth.
   */
  computeFocusAreaOpportunities(L) {
    const opportunities = [];

    for (const fa of L.focusAreas) {
      const scores = (L.topFacultyByFA[fa.id] || []).slice(); // already sorted by composite DESC
      const strongScores = scores.filter(s => s.composite >= 3);
      const moderateScores = scores.filter(s => s.composite >= 2);

      // Strength: average of top 3 faculty composites
      const top3 = scores.slice(0, 3).map(s => s.composite);
      const strength = top3.length ? top3.reduce((a, b) => a + b, 0) / top3.length : 0;

      // PI pool: faculty with composite >= 3 who can serve as PI
      const piPool = strongScores.filter(s => {
        const f = L.facultyById[s.faculty_id];
        return f && this.canServeAs(f, 'pi');
      }).length;

      // Department diversity among strong+ candidates
      const depts = new Set();
      for (const s of moderateScores) {
        const f = L.facultyById[s.faculty_id];
        if (f && f.department) depts.add(f.department);
      }
      const deptDiversity = depts.size;

      // Seniority depth: candidates with seniority >= 4
      let seniorCount = 0;
      for (const s of moderateScores.slice(0, 10)) {
        const f = L.facultyById[s.faculty_id];
        if (f && this.seniorityScore(f, L) >= 4) seniorCount++;
      }

      // Opportunity score: weighted combination
      const normStrength = strength / 5; // 0-1
      const normPI = Math.min(piPool / 3, 1); // 0-1, capped at 3
      const normDept = Math.min(deptDiversity / 4, 1); // 0-1, capped at 4
      const normSeniority = Math.min(seniorCount / 2, 1); // 0-1, capped at 2

      const opportunityScore = normStrength * 0.40 + normPI * 0.25 + normDept * 0.20 + normSeniority * 0.15;

      // Tier classification
      let tier;
      if (strongScores.length === 0) tier = 'Gap';
      else if (opportunityScore >= 0.55) tier = 'High Opportunity';
      else if (opportunityScore >= 0.30) tier = 'Moderate';
      else tier = 'Weak';

      // Get challenge info
      const challenge = L.challengeById[fa.challenge_id];

      opportunities.push({
        faId: fa.id,
        faTitle: fa.title,
        challengeId: fa.challenge_id,
        challengeTitle: challenge ? challenge.title : '',
        challengeNumber: challenge ? challenge.number : 0,
        strength: Math.round(strength * 10) / 10,
        piPool,
        deptDiversity,
        seniorityDepth: seniorCount,
        opportunityScore: Math.round(opportunityScore * 100) / 100,
        tier,
        strongCount: strongScores.length,
        topFaculty: scores.slice(0, 15),
      });
    }

    return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
  },


  /* ─── Seniority Scoring ─── */

  /**
   * Compute a seniority score (0-5) for a faculty member.
   * Based on academic rank, h-index percentile, and citation percentile.
   */
  seniorityScore(faculty, L) {
    if (!faculty) return 0;

    // Title rank (50% weight)
    let titleScore = 2; // default for unknown/empty (benefit of doubt)
    const title = (faculty.title || '').toLowerCase();
    if (title.includes('assistant professor')) titleScore = 1;
    else if (title.includes('associate professor')) titleScore = 3;
    else if (title.includes('professor')) titleScore = 5; // "Professor" without assistant/associate
    else if (title === '' && faculty.tier === 'Recommended') titleScore = 2; // no data

    // h-index percentile (30% weight)
    const hIndex = (faculty.scholar_metrics && faculty.scholar_metrics.h_index) || 0;
    const hPct = this._percentileRank(hIndex, L.hIndexSorted);
    const hScore = hPct >= 0.90 ? 5 : hPct >= 0.75 ? 4 : hPct >= 0.50 ? 3 : hPct >= 0.25 ? 2 : hIndex > 0 ? 1 : 0;

    // Citation percentile (20% weight)
    const citations = (faculty.scholar_metrics && faculty.scholar_metrics.citations) || 0;
    const cPct = this._percentileRank(citations, L.citationsSorted);
    const cScore = cPct >= 0.90 ? 5 : cPct >= 0.75 ? 4 : cPct >= 0.50 ? 3 : cPct >= 0.25 ? 2 : citations > 0 ? 1 : 0;

    return Math.round((titleScore * 0.5 + hScore * 0.3 + cScore * 0.2) * 10) / 10;
  },

  /** Binary search for percentile rank in a sorted array */
  _percentileRank(value, sortedArr) {
    if (!sortedArr || !sortedArr.length) return 0;
    let lo = 0, hi = sortedArr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sortedArr[mid] <= value) lo = mid + 1;
      else hi = mid;
    }
    return lo / sortedArr.length;
  },

  /** Check if a faculty member can serve in a given role */
  canServeAs(faculty, role) {
    if (!faculty || !faculty.constraints) return true;
    const maxRole = faculty.constraints.max_role;
    if (!maxRole) return true;
    const hierarchy = { 'contributor': 0, 'co-pi': 1, 'pi': 2 };
    const roleLevel = hierarchy[role] !== undefined ? hierarchy[role] : 0;
    const maxLevel = hierarchy[maxRole] !== undefined ? hierarchy[maxRole] : 2;
    return roleLevel <= maxLevel;
  },


  /* ─── PI Allocation Optimizer ─── */

  /**
   * Greedy PI allocation algorithm.
   * @param {Object} L - DataStore lookups
   * @param {Array} locked - [{faculty_id, focus_area_id}] locked assignments
   * @param {number} minComposite - minimum composite threshold (default 3)
   * @returns {Object} { assignments, unassignedFaculty, uncoveredFAs, stats }
   */
  optimizePI(L, locked = [], minComposite = 3) {
    // Build all eligible (faculty, FA) pairs, excluding constrained faculty
    const pairs = [];
    for (const s of L.scores.scores) {
      if (s.composite >= minComposite) {
        const f = L.facultyById[s.faculty_id];
        if (f && this.canServeAs(f, 'pi')) {
          const seniority = this.seniorityScore(f, L);
          pairs.push({
            faculty_id: s.faculty_id,
            focus_area_id: s.focus_area_id,
            composite: s.composite,
            faculty_fit: s.faculty_fit,
            competitive_edge: s.competitive_edge,
            team_feasibility: s.team_feasibility,
            partnership_readiness: s.partnership_readiness,
            tier: f.tier,
            department: f.department,
            seniority,
          });
        }
      }
    }

    // Sort by composite desc, with seniority and AAII tiebreakers
    pairs.sort((a, b) => {
      if (b.composite !== a.composite) return b.composite - a.composite;
      // Seniority tiebreaker
      if (b.seniority !== a.seniority) return b.seniority - a.seniority;
      // AAII Affiliated gets priority in remaining ties
      if (a.tier === 'AAII Affiliated' && b.tier !== 'AAII Affiliated') return -1;
      if (b.tier === 'AAII Affiliated' && a.tier !== 'AAII Affiliated') return 1;
      return 0;
    });

    const assignedFaculty = new Set();
    const assignedFA = new Set();
    const assignments = [];

    // First, apply locked assignments
    for (const lock of locked) {
      const pair = pairs.find(p =>
        p.faculty_id === lock.faculty_id && p.focus_area_id === lock.focus_area_id
      );
      if (pair) {
        assignments.push({ ...pair, locked: true });
        assignedFaculty.add(pair.faculty_id);
        assignedFA.add(pair.focus_area_id);
      }
    }

    // Greedy assignment
    for (const pair of pairs) {
      if (assignedFaculty.has(pair.faculty_id)) continue;
      if (assignedFA.has(pair.focus_area_id)) continue;

      assignments.push({ ...pair, locked: false });
      assignedFaculty.add(pair.faculty_id);
      assignedFA.add(pair.focus_area_id);
    }

    // Sort assignments by composite descending
    assignments.sort((a, b) => b.composite - a.composite);

    // Find unassigned faculty (those with at least one score >= threshold)
    const facultyWithScores = new Set(pairs.map(p => p.faculty_id));
    const unassignedFaculty = [...facultyWithScores].filter(fid => !assignedFaculty.has(fid));

    // Find uncovered FAs
    const allFAs = new Set(L.focusAreas.map(fa => fa.id));
    const uncoveredFAs = [...allFAs].filter(faid => !assignedFA.has(faid));

    return {
      assignments,
      unassignedFaculty,
      uncoveredFAs,
      stats: {
        proposalCount: assignments.length,
        facultyAssigned: assignedFaculty.size,
        focusAreasCovered: assignedFA.size,
        totalFocusAreas: allFAs.size,
        coveragePct: Math.round((assignedFA.size / allFAs.size) * 100),
        avgComposite: assignments.length
          ? Math.round((assignments.reduce((s, a) => s + a.composite, 0) / assignments.length) * 10) / 10
          : 0,
      }
    };
  },

  /**
   * Re-run optimizer after a manual drag-and-drop override
   */
  reoptimize(L, currentAssignments) {
    const locked = currentAssignments
      .filter(a => a.locked)
      .map(a => ({ faculty_id: a.faculty_id, focus_area_id: a.focus_area_id }));
    return this.optimizePI(L, locked);
  },


  /* ─── Team Suggestion ─── */

  /**
   * Suggest a team for a given focus area.
   * Uses composite scores + seniority + departmental diversity + tier preference.
   * PI selection weights seniority heavily; contributor selection ignores it.
   */
  suggestTeam(focusAreaId, L, excludeIds = [], maxSize = 5) {
    const candidates = (L.topFacultyByFA[focusAreaId] || [])
      .filter(s => s.composite >= 2.5 && !excludeIds.includes(s.faculty_id))
      .map(s => {
        const f = L.facultyById[s.faculty_id];
        const seniority = f ? this.seniorityScore(f, L) : 0;
        return { ...s, faculty: f, seniority };
      });

    if (!candidates.length) return [];

    const selectedDepts = new Set();
    const team = [];
    const used = new Set();

    // Pass 1: Select PI (seniority weight = 0.4)
    const piCandidates = candidates
      .filter(c => c.faculty && this.canServeAs(c.faculty, 'pi'))
      .map(c => ({
        ...c,
        piScore: c.composite + 0.4 * (c.seniority / 5) + (c.faculty.tier === 'AAII Affiliated' ? 0.25 : 0),
      }))
      .sort((a, b) => b.piScore - a.piScore);

    if (piCandidates.length) {
      const pi = piCandidates[0];
      team.push({
        faculty_id: pi.faculty_id, role: 'pi',
        composite: pi.composite, seniority: pi.seniority,
        faculty_fit: pi.faculty_fit, competitive_edge: pi.competitive_edge,
        team_feasibility: pi.team_feasibility, partnership_readiness: pi.partnership_readiness,
      });
      used.add(pi.faculty_id);
      if (pi.faculty) selectedDepts.add(pi.faculty.department);
    }

    // Pass 2: Select Co-PIs (seniority weight = 0.2, diversity bonus)
    const remaining = candidates.filter(c => !used.has(c.faculty_id));
    for (let copiCount = 0; copiCount < 2 && remaining.length > 0; copiCount++) {
      for (const c of remaining) {
        const canCopi = c.faculty && this.canServeAs(c.faculty, 'co-pi');
        c._copiScore = canCopi
          ? c.composite + 0.2 * (c.seniority / 5) + (c.faculty && !selectedDepts.has(c.faculty.department) ? 0.5 : 0)
          : -1; // ineligible for co-pi, will be skipped
      }
      remaining.sort((a, b) => b._copiScore - a._copiScore);

      const pick = remaining[0];
      if (!pick || pick._copiScore < 0) break;

      remaining.shift();
      used.add(pick.faculty_id);
      if (pick.faculty) selectedDepts.add(pick.faculty.department);
      team.push({
        faculty_id: pick.faculty_id, role: 'co-pi',
        composite: pick.composite, seniority: pick.seniority,
        faculty_fit: pick.faculty_fit, competitive_edge: pick.competitive_edge,
        team_feasibility: pick.team_feasibility, partnership_readiness: pick.partnership_readiness,
      });
    }

    // Pass 3: Fill contributors (no seniority weight, diversity bonus only)
    const contRemaining = candidates.filter(c => !used.has(c.faculty_id));
    while (team.length < maxSize && contRemaining.length > 0) {
      for (const c of contRemaining) {
        c._cScore = c.composite + (c.faculty && !selectedDepts.has(c.faculty.department) ? 0.5 : 0);
      }
      contRemaining.sort((a, b) => b._cScore - a._cScore);

      const pick = contRemaining.shift();
      used.add(pick.faculty_id);
      if (pick.faculty) selectedDepts.add(pick.faculty.department);
      team.push({
        faculty_id: pick.faculty_id, role: 'contributor',
        composite: pick.composite, seniority: pick.seniority,
        faculty_fit: pick.faculty_fit, competitive_edge: pick.competitive_edge,
        team_feasibility: pick.team_feasibility, partnership_readiness: pick.partnership_readiness,
      });
    }

    return team;
  },

  /**
   * Compute team profile for a given team and focus area.
   */
  computeTeamProfile(team, focusAreaId, L) {
    const scores = team.map(m => {
      const allScores = L.scoresByFaculty[m.faculty_id] || [];
      return allScores.find(s => s.focus_area_id === focusAreaId) || {
        composite: 0, faculty_fit: 0, competitive_edge: 0,
        team_feasibility: 0, partnership_readiness: 0,
      };
    });

    const avg = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

    const departments = new Set();
    const tierBreakdown = { 'AAII Affiliated': 0, 'Recommended': 0 };
    for (const m of team) {
      const f = L.facultyById[m.faculty_id];
      if (f) {
        departments.add(f.department);
        tierBreakdown[f.tier] = (tierBreakdown[f.tier] || 0) + 1;
      }
    }

    return {
      avgComposite: avg(scores.map(s => s.composite)),
      avgFit: avg(scores.map(s => s.faculty_fit)),
      avgEdge: avg(scores.map(s => s.competitive_edge)),
      avgTeam: avg(scores.map(s => s.team_feasibility)),
      avgPartner: avg(scores.map(s => s.partnership_readiness)),
      departments: [...departments],
      departmentCount: departments.size,
      tierBreakdown,
      teamSize: team.length,
      individualScores: scores,
    };
  },

  /**
   * Rank focus areas for a pre-selected team.
   */
  rankFocusAreasForTeam(facultyIds, L, minMembers = 2) {
    const results = [];

    for (const fa of L.focusAreas) {
      const memberScores = [];
      for (const fid of facultyIds) {
        const allScores = L.scoresByFaculty[fid] || [];
        const score = allScores.find(s => s.focus_area_id === fa.id);
        if (score && score.composite > 0) {
          memberScores.push(score);
        }
      }

      const strongMembers = memberScores.filter(s => s.composite >= 2);
      if (strongMembers.length < minMembers) continue;

      const avg = memberScores.reduce((a, s) => a + s.composite, 0) / memberScores.length;

      results.push({
        focus_area_id: fa.id,
        challenge_id: fa.challenge_id,
        title: fa.title,
        avgComposite: Math.round(avg * 10) / 10,
        memberCount: memberScores.length,
        strongCount: strongMembers.length,
        memberScores,
      });
    }

    return results.sort((a, b) => b.avgComposite - a.avgComposite).slice(0, 20);
  },


  /* ─── Concept Seed Generator ─── */

  /**
   * Generate a research concept seed from existing data.
   * Template-based, no LLM calls.
   */
  generateConceptSeed(team, focusAreaId, L, advantageIds = []) {
    const fa = L.focusAreaById[focusAreaId];
    if (!fa) return { title: '', seed: '' };

    const challenge = L.challengeById[fa.challenge_id];

    // Collect team keywords
    const teamKeywords = [];
    const teamDepts = new Set();
    for (const m of team) {
      const f = L.facultyById[m.faculty_id];
      if (f) {
        teamKeywords.push(...(f.expertise_keywords || []));
        teamDepts.add(f.department);
      }
    }

    // Find keyword overlap with FA description
    const overlap = this._findKeywordOverlap(teamKeywords, fa.description || fa.title);
    const deptList = [...teamDepts].join(', ');
    const faFirstSentence = (fa.description || fa.title).split('.')[0].trim();

    // Compute team profile to find strongest axis
    const profile = this.computeTeamProfile(team, focusAreaId, L);

    const axes = [
      { name: 'faculty_fit', val: profile.avgFit },
      { name: 'competitive_edge', val: profile.avgEdge },
      { name: 'team_feasibility', val: profile.avgTeam },
      { name: 'partnership_readiness', val: profile.avgPartner },
    ];
    const strongest = axes.reduce((a, b) => a.val >= b.val ? a : b);

    // Select template based on strongest axis
    const kwStr = overlap.length ? overlap.slice(0, 3).join(', ') : 'relevant research areas';
    let seed = '';

    switch (strongest.name) {
      case 'faculty_fit':
        seed = `This team's research in ${kwStr} directly addresses ${fa.title}. ` +
          `Their combined expertise spanning ${deptList} positions them to advance work on ${faFirstSentence}. ` +
          `The alignment between the team's active research programs and this focus area provides a strong foundation for a competitive proposal.`;
        break;
      case 'competitive_edge':
        seed = `UTEP's capabilities in ${kwStr} provide a distinctive approach to ${fa.title}. ` +
          `The team brings specialized assets and facilities that few competing institutions can match, ` +
          `particularly in areas relevant to ${faFirstSentence}.`;
        break;
      case 'team_feasibility':
        seed = `The interdisciplinary combination of ${deptList} creates a complementary team for ${fa.title}. ` +
          `Integrating perspectives from ${kwStr} allows this group to address ${faFirstSentence} ` +
          `from multiple angles, strengthening both the technical approach and the broader impact.`;
        break;
      case 'partnership_readiness':
        seed = `Existing collaborations and research infrastructure in ${kwStr} give this team a head start on ${fa.title}. ` +
          `With established partnerships and funded programs in ${deptList}, ` +
          `the team is well-positioned to move quickly on ${faFirstSentence}.`;
        break;
    }

    // Generate a short title
    const titleKw = overlap.length ? overlap[0] : fa.title.split(':')[0].trim();
    const title = `${titleKw} for ${challenge ? challenge.title : fa.title}`;

    return { title: truncate(title, 80), seed };
  },

  _findKeywordOverlap(expertiseKeywords, text) {
    const textWords = new Set(
      text.toLowerCase().split(/\W+/).filter(w => w.length > 4)
    );
    const matches = [];
    const seen = new Set();

    for (const kw of expertiseKeywords) {
      if (seen.has(kw.toLowerCase())) continue;
      const kwWords = kw.toLowerCase().split(/\W+/);
      for (const w of kwWords) {
        if (w.length > 4 && textWords.has(w)) {
          matches.push(kw);
          seen.add(kw.toLowerCase());
          break;
        }
      }
    }

    return matches.slice(0, 5);
  },
};
