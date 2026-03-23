/* ═══ Main Application - Tab Routing & Init ═══ */

const TABS = [
  { id: 'overview', label: 'Overview', icon: ICONS.chart },
  { id: 'challenges', label: 'Challenge Explorer', icon: ICONS.target },
  { id: 'faculty', label: 'Faculty Explorer', icon: ICONS.users },
  { id: 'heatmap', label: 'Scoring Matrix', icon: ICONS.grid },
  { id: 'proposallab', label: 'Proposal Lab', icon: ICONS.bulb },
  { id: 'methodology', label: 'Methodology', icon: ICONS.book },
];

let activeTab = 'overview';

function renderTabs() {
  const tabsEl = $('tabs');
  tabsEl.innerHTML = TABS.map(t =>
    `<button class="tab-btn${t.id === activeTab ? ' active' : ''}" onclick="switchTab('${t.id}')">
      ${t.icon} ${t.label}
    </button>`
  ).join('');
}

function switchTab(tabId) {
  activeTab = tabId;
  renderTabs();
  renderContent();
}

async function renderContent() {
  const content = $('content');

  switch (activeTab) {
    case 'overview':
      await renderOverview(content);
      break;
    case 'challenges':
      await renderChallenges(content);
      break;
    case 'faculty':
      await renderFaculty(content);
      break;
    case 'heatmap':
      await renderHeatmap(content);
      break;
    case 'proposallab':
      await renderProposalLab(content);
      break;
    case 'methodology':
      await renderMethodology(content);
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
