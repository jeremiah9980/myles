# Myles W. Peters — portfolio site

Static portfolio site (plain HTML/CSS/JS, no build step) for GitHub Pages. Companion look to the jcargill.site family of pages.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home: pitch, what he brings, where he's headed, skills, contact |
| `about.html` | Background story and why security |
| `resume.html` | Web resume (timeline) + PDF download |
| `roadmap.html` | Certification track and role targets (blue-team lane) |
| `projects.html` | Home-lab builds and write-ups log |
| `assets/Myles-Peters-Resume.pdf` | One-page resume PDF |
| `styles.css`, `site.js` | Shared styles and theme toggle |
| `.github/workflows/pages.yml` | Deploys to GitHub Pages on every push to `main` |

## Publish (first time)

Option A — Myles's own GitHub account (recommended so employers see it under his name):

1. Create a GitHub account if needed, then a new **public** repo named `<username>.github.io`
   (that name makes the site live at `https://<username>.github.io/` with no extra path).
2. Upload these files (drag-and-drop on the repo page works, or `git push`).
3. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The workflow runs on the push; the site is live in about a minute.

Option B — under Jeremiah's account as `myles.jcargill.site`:

1. Create a repo (any name) under the account, push these files, and set Pages source to GitHub Actions as above.
2. Add a `CNAME` file containing `myles.jcargill.site` to the repo root.
3. At the DNS provider for `jcargill.site`, add a CNAME record `myles` → `<account>.github.io`.
4. Repo → Settings → Pages → Custom domain: `myles.jcargill.site`, then tick **Enforce HTTPS** once the cert is issued.

Command-line version of the push:

```bash
cd myles-site
git init -b main
git add .
git commit -m "Portfolio site"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

## Before publishing — fill in the blanks

- Footer links to **GitHub** and **LinkedIn** currently point at the site roots. Replace `https://github.com/` and `https://www.linkedin.com/` in every `.html` file with Myles's profile URLs (one find-and-replace).
- Location is shown as "Texas Gulf Coast" on `index.html`, `resume.html`, and the PDF. Change it if he is presenting a different home base.
- Phone shown is 404-285-6391.

## Keeping it current

- Certification badges: in `roadmap.html`, `resume.html`, and `index.html`, change `<span class="status progress">in progress</span>` to `<span class="status done">passed</span>` when a cert lands.
- New lab write-up: add a `.card` block to `projects.html` (newest first) and link the GitHub repo or a `writeups/<name>.html` page.
- Resume PDF: regenerate from `resume-print.html` (kept in the repo root) by printing to PDF from a browser, or ask Claude to rebuild it.

## Theme

Light by default, dark mode follows the OS and can be toggled with the ☾ button (saved in the browser). Fonts: Fraunces (display) and Outfit (body) from Google Fonts; falls back to Georgia and system sans if offline.
