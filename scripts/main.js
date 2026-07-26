/* =============================================================
   CONFIG  —  ✏️ EDIT: your GitHub username (used for repos + heatmap)
   ============================================================= */
const GITHUB_USERNAME = 'DChirondio';

/* =============================================================
   THEME TOGGLE  (persists choice in localStorage)
   ============================================================= */
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme);
else if (window.matchMedia('(prefers-color-scheme: light)').matches) root.setAttribute('data-theme', 'light');

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

/* =============================================================
   FOOTER YEAR
   ============================================================= */
document.getElementById('year').textContent = new Date().getFullYear();

/* =============================================================
   PROJECTS — loaded from projects.yml (tiny built-in YAML parser)
   ============================================================= */
const grid = document.getElementById('project-grid');
let observer;
let allProjects = [];
let activeTag = 'All';
let searchTerm = '';

function parseYamlScalar(rawValue) {
  const value = rawValue.trim();
  if (value === 'null' || value === '') return null;
  if (value.startsWith('[') && value.endsWith(']')) {
    const items = [];
    const quoted = /"((?:[^"\\]|\\.)*)"/g;
    let m = quoted.exec(value);
    while (m) { items.push(m[1].replace(/\\"/g, '"')); m = quoted.exec(value); }
    return items;
  }
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/\\"/g, '"');
  return value;
}

function assignYamlPair(target, line) {
  const i = line.indexOf(':');
  if (i === -1) return;
  target[line.slice(0, i).trim()] = parseYamlScalar(line.slice(i + 1).trim());
}

function parseProjectsYaml(text) {
  const projects = [];
  let current = null;
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (line.startsWith('- ')) {
      if (current) projects.push(current);
      current = {};
      assignYamlPair(current, line.slice(2).trim());
      return;
    }
    if (line.startsWith('  ') && current) assignYamlPair(current, trimmed);
  });
  if (current) projects.push(current);
  return projects.map((p) => ({
    id: p.id || '',
    title: p.title || '',
    subtitle: p.subtitle || '',
    description: p.description || '',
    tech: Array.isArray(p.tech) ? p.tech : [],
    url: p.url || null
  }));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function projectMatches(p) {
  const tagOk = activeTag === 'All' || p.tech.includes(activeTag);
  const q = searchTerm.toLowerCase();
  const searchOk = !q || (p.title + ' ' + p.subtitle + ' ' + p.description + ' ' + p.tech.join(' ')).toLowerCase().includes(q);
  return tagOk && searchOk;
}

function renderProjects() {
  const visible = allProjects.filter(projectMatches);
  const total = allProjects.length.toString().padStart(2, '0');
  if (visible.length === 0) {
    grid.innerHTML = '<p class="projects-empty">No projects match your filter.</p>';
    return;
  }
  grid.innerHTML = visible.map((p) => `
    <article class="project-card reveal visible" aria-label="${escapeHtml(p.title)}">
      <div class="project-num">${escapeHtml(p.id)} / ${total}</div>
      <h3 class="project-title">${escapeHtml(p.title)}</h3>
      <div class="project-sub">${escapeHtml(p.subtitle)}</div>
      <p class="project-desc">${escapeHtml(p.description)}</p>
      <div class="project-tech">${p.tech.map((t) => `<span class="tech-badge">${escapeHtml(t)}</span>`).join('')}</div>
      ${p.url ? `<a class="project-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">
        View project
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg>
      </a>` : ''}
    </article>`).join('');
}

function renderFilterTags() {
  const tags = ['All', ...Array.from(new Set(allProjects.flatMap((p) => p.tech)))];
  const wrap = document.getElementById('filter-tags');
  wrap.innerHTML = tags.map((t) => `<button class="filter-chip${t === activeTag ? ' active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
  wrap.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeTag = chip.dataset.tag;
      wrap.querySelectorAll('.filter-chip').forEach((c) => c.classList.toggle('active', c === chip));
      renderProjects();
    });
  });
}

document.getElementById('project-search').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderProjects();
});

async function loadProjects() {
  try {
    const res = await fetch('projects.yml');
    if (!res.ok) throw new Error('Failed to load projects.yml');
    allProjects = parseProjectsYaml(await res.text());
    if (allProjects.length === 0) throw new Error('No projects found');
    renderFilterTags();
    renderProjects();
  } catch (err) {
    console.error('Unable to load projects:', err);
    grid.innerHTML = '<p class="projects-empty">Unable to load projects right now.</p>';
  }
}
loadProjects();

/* =============================================================
   GITHUB — top public repos via the GitHub REST API
   ============================================================= */
async function loadGitHubRepos() {
  const container = document.getElementById('gh-repos');
  try {
    const resp = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!resp.ok) throw new Error('GitHub API error');
    const repos = await resp.json();
    const top = repos
      .filter((r) => !r.fork)
      .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at) - new Date(a.updated_at)))
      .slice(0, 6);
    if (top.length === 0) throw new Error('No repos');
    container.innerHTML = top.map((r) => `
      <a href="${r.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card" aria-label="${escapeHtml(r.name)} repository">
        <div class="repo-name">${escapeHtml(r.name)}</div>
        <div class="repo-desc">${escapeHtml(r.description || 'No description available.')}</div>
        <div class="repo-meta">
          <span><span class="repo-lang-dot"></span>${escapeHtml(r.language || '—')}</span>
          <span>★ ${r.stargazers_count}</span>
          <span>⑂ ${r.forks_count}</span>
        </div>
      </a>`).join('');
  } catch (e) {
    container.innerHTML = `
      <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noopener noreferrer" class="repo-card">
        <div class="repo-name">View all repositories</div>
        <div class="repo-desc">Visit github.com/${GITHUB_USERNAME} to explore public repositories.</div>
      </a>`;
  }
}
loadGitHubRepos();

/* =============================================================
   NAV — scroll state + mobile hamburger
   ============================================================= */
const nav = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
const navOverlay = document.getElementById('nav-overlay');

function openMenu() {
  navLinks.classList.add('open');
  navOverlay.classList.add('open');
  document.body.classList.add('menu-open');
}
function closeMenu() {
  navLinks.classList.remove('open');
  navOverlay.classList.remove('open');
  document.body.classList.remove('menu-open');
}
function toggleMenu() { navLinks.classList.contains('open') ? closeMenu() : openMenu(); }

hamburger.addEventListener('click', toggleMenu);
hamburger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); } });
navOverlay.addEventListener('click', closeMenu);
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

/* =============================================================
   COMMAND PALETTE (⌘K / Ctrl+K)
   ============================================================= */
const cmdkBackdrop = document.getElementById('cmdk-backdrop');
const cmdkInput = document.getElementById('cmdk-input');
const cmdkList = document.getElementById('cmdk-list');
const commands = [
  { label: 'Go to About', hint: '01', action: () => location.hash = '#about' },
  { label: 'Go to Projects', hint: '02', action: () => location.hash = '#projects' },
  { label: 'Go to GitHub', hint: '03', action: () => location.hash = '#github' },
  { label: 'Go to Contact', hint: '04', action: () => location.hash = '#contact' },
  { label: 'Toggle theme', hint: '◐', action: () => document.getElementById('theme-toggle').click() },
  { label: 'Open GitHub profile', hint: '↗', action: () => window.open(`https://github.com/${GITHUB_USERNAME}`, '_blank') }
];
let cmdkActive = 0;

function renderCmdk(filter = '') {
  const items = commands.filter((c) => c.label.toLowerCase().includes(filter.toLowerCase()));
  cmdkActive = 0;
  cmdkList.innerHTML = items.map((c, i) => `<li data-i="${i}" class="${i === 0 ? 'active' : ''}">${c.label}<span class="k">${c.hint}</span></li>`).join('') || '<li>No matches</li>';
  cmdkList._items = items;
  cmdkList.querySelectorAll('li[data-i]').forEach((li) => {
    li.addEventListener('click', () => runCmdk(items[+li.dataset.i]));
  });
}
function runCmdk(cmd) { if (cmd) { cmd.action(); closeCmdk(); } }
function openCmdk() { cmdkBackdrop.classList.add('open'); cmdkInput.value = ''; renderCmdk(); cmdkInput.focus(); }
function closeCmdk() { cmdkBackdrop.classList.remove('open'); }

document.getElementById('cmdk-open').addEventListener('click', openCmdk);
cmdkInput.addEventListener('input', (e) => renderCmdk(e.target.value));
cmdkBackdrop.addEventListener('click', (e) => { if (e.target === cmdkBackdrop) closeCmdk(); });
cmdkInput.addEventListener('keydown', (e) => {
  const lis = cmdkList.querySelectorAll('li[data-i]');
  if (e.key === 'ArrowDown') { e.preventDefault(); cmdkActive = Math.min(cmdkActive + 1, lis.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkActive = Math.max(cmdkActive - 1, 0); }
  else if (e.key === 'Enter') { e.preventDefault(); runCmdk(cmdkList._items[cmdkActive]); return; }
  else return;
  lis.forEach((li, i) => li.classList.toggle('active', i === cmdkActive));
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); }
  if (e.key === 'Escape') { closeCmdk(); closeMenu(); }
});

/* =============================================================
   SCROLL REVEAL
   ============================================================= */
observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
