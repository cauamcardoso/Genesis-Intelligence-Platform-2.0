/* ═══ Data Loading & Caching Layer ═══ */

const DataStore = {
  _cache: {},
  _loading: {},

  async _fetch(endpoint) {
    if (this._cache[endpoint]) return this._cache[endpoint];
    if (this._loading[endpoint]) return this._loading[endpoint];

    this._loading[endpoint] = fetch(`/api/${endpoint}`)
      .then(r => r.json())
      .then(data => {
        this._cache[endpoint] = data;
        delete this._loading[endpoint];
        return data;
      });

    return this._loading[endpoint];
  },

  async getFaculty() { return this._fetch('faculty'); },
  async getChallenges() { return this._fetch('challenges'); },
  async getScores() { return this._fetch('scores'); },
  async getMetadata() { return this._fetch('metadata'); },

  // Pre-computed lookups (built after data loads)
  _lookups: null,

  async buildLookups() {
    if (this._lookups) return this._lookups;

    const [faculty, challenges, scores] = await Promise.all([
      this.getFaculty(),
      this.getChallenges(),
      this.getScores()
    ]);

    // Faculty by ID
    const facultyById = {};
    for (const f of faculty.faculty) {
      facultyById[f.id] = f;
    }

    // Focus areas flat list with challenge info
    const focusAreas = [];
    const focusAreaById = {};
    const challengeById = {};
    for (const c of challenges.challenges) {
      challengeById[c.id] = c;
      for (const fa of c.focus_areas) {
        const entry = { ...fa, challenge_id: c.id, challenge_title: c.title };
        focusAreas.push(entry);
        focusAreaById[fa.id] = entry;
      }
    }

    // Scores indexed by faculty_id and focus_area_id
    const scoresByFaculty = {};  // faculty_id -> [{focus_area_id, scores...}]
    const scoresByFA = {};       // focus_area_id -> [{faculty_id, scores...}]

    for (const s of scores.scores) {
      if (!scoresByFaculty[s.faculty_id]) scoresByFaculty[s.faculty_id] = [];
      scoresByFaculty[s.faculty_id].push(s);

      if (!scoresByFA[s.focus_area_id]) scoresByFA[s.focus_area_id] = [];
      scoresByFA[s.focus_area_id].push(s);
    }

    // Challenge summary: max composite per faculty per challenge
    const challengeSummary = scores.challenge_summary || {};

    // Top matches per faculty (sorted by composite desc)
    const topMatchesByFaculty = {};
    for (const fid in scoresByFaculty) {
      topMatchesByFaculty[fid] = scoresByFaculty[fid]
        .filter(s => s.composite > 0)
        .sort((a, b) => b.composite - a.composite);
    }

    // Top faculty per focus area (sorted by composite desc)
    const topFacultyByFA = {};
    for (const faId in scoresByFA) {
      topFacultyByFA[faId] = scoresByFA[faId]
        .filter(s => s.composite > 0)
        .sort((a, b) => b.composite - a.composite);
    }

    // Department counts
    const deptCounts = {};
    for (const f of faculty.faculty) {
      const dept = f.department || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }

    // Stats
    const allComposites = scores.scores.map(s => s.composite);
    const strongMatches = allComposites.filter(c => c >= 3).length;
    const coverageFAs = new Set(
      scores.scores.filter(s => s.composite >= 3).map(s => s.focus_area_id)
    ).size;
    const coveragePct = Math.round((coverageFAs / focusAreas.length) * 100);

    this._lookups = {
      faculty: faculty.faculty,
      challenges: challenges.challenges,
      scores,
      facultyById,
      focusAreas,
      focusAreaById,
      challengeById,
      scoresByFaculty,
      scoresByFA,
      challengeSummary,
      topMatchesByFaculty,
      topFacultyByFA,
      deptCounts,
      stats: {
        totalFaculty: faculty.faculty.length,
        totalChallenges: challenges.challenges.length,
        totalFocusAreas: focusAreas.length,
        strongMatches,
        coveragePct,
        aaiiCount: faculty.faculty.filter(f => f.tier === 'AAII Affiliated').length,
        recCount: faculty.faculty.filter(f => f.tier === 'Recommended').length,
      }
    };

    return this._lookups;
  }
};
