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

---

# Cargill Academy

A self-hosted, Udemy-style cybersecurity training portal, built as static files alongside the portfolio site. Open **`academy.html`** (linked as **Academy** in the site nav). Everything runs client-side; progress is stored per-learner in the browser with JSON export/import to move between devices.

## Files

| File | Purpose |
| --- | --- |
| `academy.html` | The portal shell (catalog, course, My Learning, certifications) |
| `academy.css` | Portal styles (layered on the shared `styles.css` tokens) |
| `academy.js` | The whole app — routing, progress, quizzes, search, export/import (vanilla JS, no framework, no build) |
| `curriculum.json` | **All course content**, separate from the UI so courses can be edited without touching the app |

## Screens

- **Catalog** — course cards grouped by phase, each with a phase/lane badge, estimated hours, mapped certification, lesson count, and a progress ring for the current learner.
- **Course** — collapsible section sidebar with lesson checkboxes and a progress bar; the main pane shows the lesson objective, read/watch links, a hands-on lab task, and a 3–5 question self-check quiz with instant feedback and a stored score. **Mark complete** advances to the next lesson.
- **My Learning** — enrolled courses, overall completion %, a day-streak counter, a "next up" call to action, and the year-by-year milestone checklist.
- **Certification Tracker** — every certification in the curriculum with a status dropdown (Not started / Studying / Scheduled / Passed), an exam-date field, and cost, all saved per learner.
- **Learner switcher** — a header dropdown (Cooper / Myles / Add learner…). All progress is keyed by learner name.
- **Search** — across course and lesson titles, from the header.
- **Theme** — light/dark toggle (shared with the portfolio), mobile-friendly.

## How learners export / import progress

Progress lives in the browser's `localStorage`, so it is per-device. To move it:

1. Pick your name in the header dropdown.
2. Click **Export** — this downloads `cargill-academy-<name>-<date>.json`.
3. On the other device, open the portal, click **Import**, and choose that file. You'll be asked which learner to import into (defaults to the exported name).

Export files hold a single learner's progress. Keep the file somewhere safe; importing overwrites that learner's current progress on the device.

## How to add or edit a course

All content is in `curriculum.json`. You never edit `academy.js` to change courses. Add a new object to the `courses` array:

```jsonc
{
  "id": "unique-course-id",           // unique, kebab-case; used in URLs and progress keys
  "title": "Course Title",
  "phase": "p2",                       // one of the phase ids in "phases"
  "lane": "blue",                      // all | blue | red | grc (from "lanes")
  "certification": "secplus",          // a cert id from "certifications", or null
  "estHours": 40,
  "order": 3,                           // sort order within its phase
  "summary": "One or two sentences shown on the catalog card.",
  "prereqs": ["comptia-netplus"],       // course ids, or []
  "outcomes": ["What the learner can do after this course", "..."],
  "sections": [
    {
      "id": "unique-section-id",
      "title": "Section Title",
      "lessons": [
        {
          "id": "unique-lesson-id",
          "title": "Lesson Title",
          "objective": "One sentence: what this lesson teaches.",
          "resources": [
            { "label": "Readable link text", "url": "https://example.com/" }
          ],
          "lab": "A concrete hands-on task the learner performs.",
          "quiz": [
            {
              "q": "A multiple-choice question?",
              "choices": ["Wrong", "Correct", "Wrong", "Wrong"],
              "answer": 1,                 // 0-based index of the correct choice
              "explain": "Why the correct answer is correct (shown after answering)."
            }
            // 3–5 questions per lesson
          ]
        }
      ]
    }
  ]
}
```

Rules the app relies on:

- Every `id` (course, section, lesson) must be **unique across the whole file**.
- Each lesson needs an `objective`, a `lab`, and a `quiz` of at least 3 questions, each with a valid `answer` index.
- `phase`, `lane`, and `certification` must reference ids that exist in the `phases`, `lanes`, and `certifications` arrays.
- To add a certification to the tracker, append to the `certifications` array (`id`, `name`, `vendor`, `examCodes`, `cost`, `renewal`, `lane`, optional `courseId`, optional `note`).

Validate your edits before publishing (any JSON linter works). A quick check:

```bash
python3 -c "import json; json.load(open('curriculum.json')); print('valid JSON')"
```

Because the app `fetch`es `curriculum.json`, opening `academy.html` directly from disk (`file://`) is blocked by the browser. Serve the folder while editing:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/academy.html
```

## Deploy to GitHub Pages

The included workflow at `.github/workflows/pages.yml` publishes the repository root (portfolio **and** the Academy) on every push to `main`.

1. Push the repo to GitHub (see **Publish** above).
2. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`; the workflow builds and deploys in about a minute.
4. The Academy is then live at `…/academy.html` (and linked from the site nav).

No server or database is required — it is entirely static.
