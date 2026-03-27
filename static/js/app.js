/* ═══ Main Application - Tab Routing & Init ═══ */

const TABS = [
  { id: 'overview', label: 'Overview', icon: ICONS.chart },
  {
    id: 'intelligence', label: 'Intelligence', icon: ICONS.layers,
    children: [
      { id: 'challenges', label: 'Challenges & Focus Areas', icon: ICONS.target },
      { id: 'faculty', label: 'Faculty', icon: ICONS.users },
      { id: 'opportunity', label: 'Opportunity Map', icon: ICONS.map },
      { id: 'methodology', label: 'Methodology', icon: ICONS.compass },
    ]
  },
  { id: 'proposallab', label: 'Proposal Lab', icon: ICONS.bulb },
  { id: 'portfolio', label: 'AAII Portfolio Optimizer', icon: ICONS.zap },
];

let activeTab = 'overview';
let _activeSubTab = 'challenges';

function renderTabs() {
  const tabsEl = $('tabs');
  // Primary tabs
  let html = '<div class="tab-bar-primary">';
  for (const t of TABS) {
    const isActive = t.id === activeTab;
    html += `<button class="tab-btn${isActive ? ' active' : ''}" onclick="switchTab('${t.id}')">
      ${t.icon} ${t.label}
    </button>`;
  }
  html += '</div>';

  // Sub-tabs for Intelligence
  const intel = TABS.find(t => t.id === 'intelligence');
  if (activeTab === 'intelligence' && intel.children) {
    html += '<div class="subtab-bar">';
    for (const st of intel.children) {
      const isActive = st.id === _activeSubTab;
      html += `<button class="subtab-btn${isActive ? ' active' : ''}" onclick="switchSubTab('${st.id}')">
        ${st.icon} ${st.label}
      </button>`;
    }
    html += '</div>';
  }

  tabsEl.innerHTML = html;
}

function switchTab(tabId) {
  activeTab = tabId;
  // Default sub-tab when entering intelligence
  if (tabId === 'intelligence' && !TABS.find(t => t.id === 'intelligence').children.find(c => c.id === _activeSubTab)) {
    _activeSubTab = 'challenges';
  }
  renderTabs();
  renderContent();
}

function switchSubTab(subTabId) {
  _activeSubTab = subTabId;
  renderTabs();
  renderContent();
}

// Cross-tab navigation helpers
function openIntelligenceTab(subTabId) {
  activeTab = 'intelligence';
  _activeSubTab = subTabId;
  renderTabs();
  renderContent();
}

function openProposalLabFromOpportunity(faId) {
  window._labEntryContext = { faId, source: 'opportunity-map' };
  switchTab('proposallab');
}

async function renderContent() {
  const content = $('content');

  if (activeTab === 'intelligence') {
    switch (_activeSubTab) {
      case 'challenges':
        await renderChallenges(content);
        break;
      case 'faculty':
        await renderFaculty(content);
        break;
      case 'opportunity':
        await renderOpportunityMap(content);
        break;
      case 'methodology':
        await renderMethodology(content);
        break;
      default:
        content.innerHTML = '<div class="loading">Unknown sub-tab</div>';
    }
    return;
  }

  switch (activeTab) {
    case 'overview':
      await renderOverview(content);
      break;
    case 'proposallab':
      await renderProposalLab(content);
      break;
    case 'portfolio':
      await renderPortfolio(content);
      break;
    default:
      content.innerHTML = '<div class="loading">Unknown tab</div>';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check for shared package view
  const params = new URLSearchParams(window.location.search);
  if (params.get('pkg')) {
    activeTab = 'proposallab';
  }
  renderTabs();
  renderContent();
});
