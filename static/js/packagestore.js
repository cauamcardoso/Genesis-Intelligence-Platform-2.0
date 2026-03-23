/* ═══ Package Store — localStorage CRUD for Proposal Packages ═══ */

const PackageStore = {
  _KEY: 'genesis_packages',

  _read() {
    try {
      return JSON.parse(localStorage.getItem(this._KEY)) || {};
    } catch { return {}; }
  },

  _write(data) {
    localStorage.setItem(this._KEY, JSON.stringify(data));
  },

  /** Generate a unique package ID */
  newId() {
    return 'pkg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  },

  /** Get all packages as an object keyed by ID */
  getAll() {
    return this._read();
  },

  /** Get all packages as a sorted array (newest first) */
  list() {
    const pkgs = this._read();
    return Object.values(pkgs).sort((a, b) => b.updated - a.updated);
  },

  /** Get a single package by ID */
  get(id) {
    return this._read()[id] || null;
  },

  /** Save (create or update) a package */
  save(pkg) {
    if (!pkg.id) pkg.id = this.newId();
    if (!pkg.created) pkg.created = Date.now();
    pkg.updated = Date.now();
    const data = this._read();
    data[pkg.id] = pkg;
    this._write(data);
    return pkg;
  },

  /** Delete a package by ID */
  delete(id) {
    const data = this._read();
    delete data[id];
    this._write(data);
  },

  /** Count packages */
  count() {
    return Object.keys(this._read()).length;
  },

  /** Count by track */
  countByTrack() {
    const pkgs = Object.values(this._read());
    return {
      'aaii-led': pkgs.filter(p => p.track === 'aaii-led').length,
      'aaii-supported': pkgs.filter(p => p.track === 'aaii-supported').length,
      'faculty-led': pkgs.filter(p => p.track === 'faculty-led').length,
    };
  },

  /** Count by status */
  countByStatus() {
    const pkgs = Object.values(this._read());
    return {
      draft: pkgs.filter(p => p.status === 'draft').length,
      ready: pkgs.filter(p => p.status === 'ready').length,
      shared: pkgs.filter(p => p.status === 'shared').length,
    };
  },

  /** Find PI conflicts: faculty assigned as PI in multiple packages */
  findPIConflicts() {
    const pkgs = Object.values(this._read());
    const piMap = {}; // faculty_id -> [pkg_id, ...]
    for (const pkg of pkgs) {
      const pi = (pkg.team || []).find(m => m.role === 'pi');
      if (pi) {
        if (!piMap[pi.faculty_id]) piMap[pi.faculty_id] = [];
        piMap[pi.faculty_id].push(pkg.id);
      }
    }
    // Return only conflicts (PI in 2+ packages)
    const conflicts = {};
    for (const fid in piMap) {
      if (piMap[fid].length > 1) conflicts[fid] = piMap[fid];
    }
    return conflicts;
  },

  /** Export all packages as JSON string */
  export() {
    return JSON.stringify(this._read(), null, 2);
  },

  /** Import packages from JSON string (merges, does not overwrite) */
  import(jsonStr) {
    try {
      const incoming = JSON.parse(jsonStr);
      const data = this._read();
      for (const id in incoming) {
        if (!data[id] || incoming[id].updated > data[id].updated) {
          data[id] = incoming[id];
        }
      }
      this._write(data);
      return Object.keys(incoming).length;
    } catch { return 0; }
  },

  /** Encode a package for URL sharing */
  encodeForURL(pkg) {
    // Strip computed fields, keep essential data
    const slim = {
      id: pkg.id,
      track: pkg.track,
      status: pkg.status,
      focus_area_id: pkg.focus_area_id,
      challenge_id: pkg.challenge_id,
      team: pkg.team,
      concept_title: pkg.concept_title,
      concept_seed: pkg.concept_seed,
      notes: pkg.notes,
      advantages: pkg.advantages,
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
  },

  /** Decode a package from URL parameter */
  decodeFromURL(encoded) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } catch { return null; }
  },

  /** Create a blank package template */
  createBlank(overrides = {}) {
    return {
      id: this.newId(),
      created: Date.now(),
      updated: Date.now(),
      status: 'draft',
      track: 'aaii-led',
      focus_area_id: null,
      challenge_id: null,
      team: [],
      concept_title: '',
      concept_seed: '',
      notes: '',
      advantages: [],
      ...overrides,
    };
  }
};
