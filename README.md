# dchirondio.github.io

My personal portfolio — a zero-dependency static site (plain HTML, CSS & JavaScript)
served by GitHub Pages at **https://dchirondio.github.io**.

## Files

| File | What it is |
|------|------------|
| `index.html` | The whole page. Personal text is marked with `✏️ EDIT` comments. |
| `styles.css` | All styling. Colours live in the theme tokens at the top. |
| `scripts/main.js` | Behaviour: projects, filtering, theme toggle, GitHub feed, ⌘K palette. |
| `projects.yml` | **Edit this to add/remove projects** — no code needed. |
| `images/` | Put any images you reference here. |

## How to edit

1. **Your name, bio, skills, email, socials** → search `index.html` for `✏️ EDIT`.
2. **Projects** → edit `projects.yml` (copy a `- ` block to add one).
3. **Colours** → change `--accent` / `--accent-2` in `styles.css`.
4. **GitHub username** → set `GITHUB_USERNAME` at the top of `scripts/main.js`.

## Preview locally

Because the page fetches `projects.yml`, open it through a local server (not `file://`):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Push to `main`, then enable **Settings → Pages → Source: Deploy from a branch →
`main` / root**. The site updates on every push.

## Features

- Light/dark theme toggle (remembers your choice)
- Data-driven projects with tech-tag filtering + search
- Live "top repositories" pulled from the GitHub API + contribution heatmap
- ⌘K command palette to jump around the site
- Scroll-reveal animations, responsive nav, accessible markup
