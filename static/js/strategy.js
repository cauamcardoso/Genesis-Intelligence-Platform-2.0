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


  /* ─── PI Allocation Optimizer ─── */

  /**
   * Greedy PI allocation algorithm.
   * @param {Object} L - DataStore lookups
   * @param {Array} locked - [{faculty_id, focus_area_id}] locked assignments
   * @param {number} minComposite - minimum composite threshold (default 3)
   * @returns {Object} { assignments, unassignedFaculty, uncoveredFAs, stats }
   */
  optimizePI(L, locked = [], minComposite = 3) {
    // Build all eligible (faculty, FA) pairs
    const pairs = [];
    for (const s of L.scores.scores) {
      if (s.composite >= minComposite) {
        const f = L.facultyById[s.faculty_id];
        if (f) {
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
          });
        }
      }
    }

    // Sort by composite desc, with AAII Affiliated tiebreaker
    pairs.sort((a, b) => {
      if (b.composite !== a.composite) return b.composite - a.composite;
      // AAII Affiliated gets priority in ties
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
   * Uses composite scores + departmental diversity + tier preference.
   */
  suggestTeam(focusAreaId, L, excludeIds = [], maxSize = 5) {
    const candidates = (L.topFacultyByFA[focusAreaId] || [])
      .filter(s => s.composite >= 2.5 && !excludeIds.includes(s.faculty_id));

    if (!candidates.length) return [];

    // Score each candidate with diversity bonus
    const selectedDepts = new Set();
    const team = [];

    // Sort by effective score (composite + bonuses)
    const scored = candidates.map(s => {
      const f = L.facultyById[s.faculty_id];
      let effective = s.composite;
      // Tier bonus for AAII
      if (f && f.tier === 'AAII Affiliated') effective += 0.25;
      return { ...s, faculty: f, effective };
    }).sort((a, b) => b.effective - a.effective);

    // Greedy selection with diversity re-ranking
    const remaining = [...scored];
    while (team.length < maxSize && remaining.length > 0) {
      // Re-score remaining with diversity bonus
      for (const c of remaining) {
        c._dScore = c.effective;
        if (c.faculty && !selectedDepts.has(c.faculty.department)) {
          c._dScore += 0.5;
        }
      }
      remaining.sort((a, b) => b._dScore - a._dScore);

      const pick = remaining.shift();
      if (pick.faculty) selectedDepts.add(pick.faculty.department);

      const role = team.length === 0 ? 'pi' : (team.length <= 2 ? 'co-pi' : 'contributor');
      team.push({
        faculty_id: pick.faculty_id,
        role,
        composite: pick.composite,
        faculty_fit: pick.faculty_fit,
        competitive_edge: pick.competitive_edge,
        team_feasibility: pick.team_feasibility,
        partnership_readiness: pick.partnership_readiness,
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
