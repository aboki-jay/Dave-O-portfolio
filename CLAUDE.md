# Notes for Claude: David Okunlola's portfolio

David is a designer, not a developer. He maintains this site only by asking for changes. Explain every step in plain language, show changes locally before publishing, and when he has to do something in a dashboard, give exact clicks and wait for him.

## How the site is put together

- `site-source/pages/*.html`: one file per page, holding only that page's own content. Each starts with a `<!--page { ... } -->` block (path, title, description).
- `site-source/shared-parts/`: header, footer, the "Connect" paragraph (`contact-box.html`), page shell. Included with `{{> name}}`.
- `site-source/content/`: `site-details.json` (email, links, availability wording, the `showInSearchEngines` switch), `projects.json` (drives the home tiles, both work lists and "Next project"), `case-studies/*.json` (one file per case study page).
- `site-source/static/`: styles (`styles/site.css`, one file), scripts (`site.js` for interactions, `site-sounds.js` for sounds), images, icons, fonts. Copied as they are.
- `build-website.js`: zero-dependency Node script that assembles everything into `site-output/` (generated, not committed).
- `cloudflare-worker/`: the only server-side code. `confidential-project-lock.js` (password gate, secret `CONFIDENTIAL_PROJECT_PASSWORD`), `note-wall.js` (About page notes in D1, with spam limits) and `about-photos.js` (writes the photos from David's Google Drive folder into the About page and serves page-sized copies at `/photos/...`; secrets `PHOTOS_DRIVE_FOLDER` and `GOOGLE_DRIVE_API_KEY`; without them the built-in placeholder photos show). The Drive folder link must never appear in the repository or the pages.
- `wrangler.jsonc`: Cloudflare settings. `wrangler deploy` and `wrangler dev` both run the build first.

Keep it this simple: plain HTML, CSS and JavaScript, no framework, no bundler.

## Commands

- Preview: `npm run preview` (http://localhost:8787). New files under `static/` sometimes need the preview restarted before they are served.
- Build only: `npm run build`.
- Publish: commit and `git push origin main`. Cloudflare Workers Builds deploys every push. Check the result with GitHub's check-runs API for the commit (check name "Workers Builds: dave-o-portfolio").

## Conventions and decisions

- Design values come from the Figma file `Cxm2gOunARq7PacIRj2qfv`, section "Main Design for my portfolio - Corrected" (node 303:1782). Token names follow the Radian design system.
- Several parts were built from David's direct requests and reference sites rather than Figma: the pinned picture stage on case studies, Kind words, the exploration shortlist and tile grid, the Connect paragraph, sounds, the logo, the note wall. If Figma and the site differ on these, ask him which is current.
- Placeholder text in square brackets is shown on purpose until he supplies real content. The site is hidden from search engines (`showInSearchEngines: false`) until then.
- Never invent testimonials, results or biography. Ask him for the real text.
- Breakpoints: phones up to 767px, tablets 768 to 1099px, desktop 1100px and up. Check all three, and check for sideways scrolling.
- Visitor statistics: Cloudflare Web Analytics and Microsoft Clarity, loaded by `static/scripts/site-analytics.js` only when `cloudflareAnalyticsToken` / `clarityProjectId` are filled in `site-details.json`. David chose both tools; running Clarity without cookies (so no consent banner) and keeping it off the confidential case study was Claude's recommendation. Ask before adding cookies or a banner.
- `wrangler dev` does not reliably pick up edits to `cloudflare-worker/*.js`; restart the preview after changing them. Its local cache lives in `.wrangler/state/v3/cache`.
- The user-facing guide is `HOW-TO-UPDATE-THIS-SITE.md`. Keep it accurate when the workflow changes.
