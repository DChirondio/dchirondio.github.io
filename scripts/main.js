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
  const q = searchTerm.toLowerCase();
  return !q || (p.title + ' ' + p.subtitle + ' ' + p.description + ' ' + p.tech.join(' ')).toLowerCase().includes(q);
}

function renderProjects() {
  const visible = allProjects.filter(projectMatches);
  const total = allProjects.length.toString().padStart(2, '0');
  if (visible.length === 0) {
    grid.innerHTML = '<p class="projects-empty">No projects match your search.</p>';
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
   GITHUB — contribution heatmap
   Fetches real per-day contribution data (date + count + level)
   from a CORS-enabled API and renders our own SVG grid so each
   day is hoverable and shows an accurate tooltip. Retries the
   request a few times, then falls back to a text link.
   ============================================================= */
const SVGNS = 'http://www.w3.org/2000/svg';
/* level 0..4 -> grey + four blue shades derived from --accent (#409ba5) */
const HEATMAP_COLORS = ['#20262c', '#0e4f56', '#1a7d88', '#2ea6b3', '#4fd3df'];
const CELL = 11, GAP = 3, STEP = CELL + GAP;

/* colour cells by absolute commit count (not the API's relative level),
   so days with different counts always get different shades */
function levelForCount(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}
/* gutters for the month (top) and weekday (left) labels */
const LEFT_PAD = 30, TOP_PAD = 16;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

function formatHeatmapDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderHeatmap(container, tooltip, days) {
  /* group days into week columns starting on Sunday */
  const weeks = [];
  let week = [];
  days.forEach((day) => {
    const dow = new Date(day.date + 'T00:00:00').getDay();
    if (week.length === 0 && dow !== 0) for (let i = 0; i < dow; i++) week.push(null);
    week.push(day);
    if (dow === 6) { weeks.push(week); week = []; }
  });
  if (week.length) weeks.push(week);

  const width = LEFT_PAD + weeks.length * STEP;
  const height = TOP_PAD + 7 * STEP;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('class', 'gh-heatmap-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'GitHub contribution heatmap');

  /* find the column where each month first starts */
  const monthStarts = [];
  let prevMonth = -1;
  weeks.forEach((wk, wi) => {
    const firstDay = wk.find((d) => d);
    if (!firstDay) return;
    const month = new Date(firstDay.date + 'T00:00:00').getMonth();
    if (month !== prevMonth) {
      monthStarts.push({ col: wi, month });
      prevMonth = month;
    }
  });
  /* drop a leading partial month (e.g. a stray "Jul" at column 0 that only
     spans a column or two before the next month) so it doesn't leave a gap */
  if (monthStarts.length > 1 && monthStarts[1].col - monthStarts[0].col < 3) {
    monthStarts.shift();
  }

  /* month labels across the top */
  monthStarts.forEach(({ col, month }) => {
    const text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('x', LEFT_PAD + col * STEP);
    text.setAttribute('y', TOP_PAD - 5);
    text.setAttribute('class', 'gh-label');
    text.textContent = MONTH_NAMES[month];
    svg.appendChild(text);
  });

  /* weekday labels down the left (Mon / Wed / Fri) */
  Object.keys(WEEKDAY_LABELS).forEach((dowStr) => {
    const dow = Number(dowStr);
    const text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('x', LEFT_PAD - 6);
    text.setAttribute('y', TOP_PAD + dow * STEP + CELL - 1);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('class', 'gh-label');
    text.textContent = WEEKDAY_LABELS[dow];
    svg.appendChild(text);
  });

  weeks.forEach((wk, wi) => {
    wk.forEach((day, di) => {
      if (!day) return;
      const rect = document.createElementNS(SVGNS, 'rect');
      rect.setAttribute('x', LEFT_PAD + wi * STEP);
      rect.setAttribute('y', TOP_PAD + di * STEP);
      rect.setAttribute('width', CELL);
      rect.setAttribute('height', CELL);
      rect.setAttribute('rx', 2);
      rect.setAttribute('class', 'gh-cell');
      rect.setAttribute('fill', HEATMAP_COLORS[levelForCount(day.count)]);
      const noun = day.count === 1 ? 'contribution' : 'contributions';
      rect.setAttribute('data-tip', `${day.count} ${noun} on ${formatHeatmapDate(day.date)}`);
      svg.appendChild(rect);
    });
  });

  container.innerHTML = '';
  container.appendChild(svg);

  /* position the tooltip relative to the heatmap wrap (its offset parent),
     using the cell's on-screen box so it tracks even when scrolled */
  const anchor = tooltip.offsetParent || container;
  function showTip(e) {
    const tip = e.target.getAttribute('data-tip');
    if (!tip) return;
    tooltip.textContent = tip;
    tooltip.setAttribute('aria-hidden', 'false');
    tooltip.classList.add('visible');
    const aRect = anchor.getBoundingClientRect();
    const tRect = e.target.getBoundingClientRect();
    const left = tRect.left - aRect.left + tRect.width / 2;
    const top = tRect.top - aRect.top;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  function hideTip() {
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }
  svg.addEventListener('mouseover', (e) => { if (e.target.classList.contains('gh-cell')) showTip(e); });
  svg.addEventListener('mouseout', (e) => { if (e.target.classList.contains('gh-cell')) hideTip(); });
}

function loadGitHubHeatmap() {
  const container = document.getElementById('gh-heatmap-container');
  const tooltip = document.getElementById('gh-heatmap-tooltip');
  if (!container || !tooltip) return;
  const url = `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`;
  const maxAttempts = 4;
  let attempts = 0;

  function attempt() {
    attempts += 1;
    fetch(url, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        const days = (data && data.contributions) || [];
        if (!days.length) throw new Error('no data');
        renderHeatmap(container, tooltip, days);
      })
      .catch(() => {
        if (attempts >= maxAttempts) {
          container.innerHTML = `<p class="gh-loading">Contribution graph available at <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noopener noreferrer">github.com/${GITHUB_USERNAME}</a></p>`;
          return;
        }
        setTimeout(attempt, attempts * 1000);
      });
  }
  attempt();
}
loadGitHubHeatmap();

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
   KEYBOARD — Escape closes the mobile menu
   ============================================================= */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

/* =============================================================
   SCROLL REVEAL
   ============================================================= */
observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
