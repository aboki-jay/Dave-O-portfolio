/*
  build-website.js
  ----------------
  Puts the website together. It reads everything in "site-source" and writes the
  finished, ready-to-publish website into "site-output".

    site-source/pages/           one file per page (only that page's own content)
    site-source/shared-parts/    pieces every page shares: header, footer, contact box
    site-source/content/         project details and case study text (plain data files)
    site-source/static/          images, icons, fonts, styles, scripts (copied as they are)

  Run it with:  npm run build
  It has no dependencies: it only needs Node.js.
*/

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SOURCE = path.join(ROOT, "site-source");
const OUTPUT = path.join(ROOT, "site-output");
const SITE = JSON.parse(fs.readFileSync(path.join(SOURCE, "content", "site-details.json"), "utf8"));
const PROJECTS = JSON.parse(fs.readFileSync(path.join(SOURCE, "content", "projects.json"), "utf8"));

const read = (...parts) => fs.readFileSync(path.join(SOURCE, ...parts), "utf8");
const part = (name) => read("shared-parts", name + ".html").trim();
const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const project = (id) => {
  const found = PROJECTS.find((p) => p.id === id);
  if (!found) throw new Error(`No project called "${id}" in site-source/content/projects.json`);
  return found;
};

/* ---------- Shared pieces ---------- */

function renderHeader(active, contactHref) {
  const links = [
    ["work", "Work", "/work/"],
    ["about", "About", "/about/"],
    ["exploration", "Exploration", "/exploration/"],
    ["resume", "Resume", "/resume/"],
  ]
    .map(([id, label, href]) => `<a class="nav-link" href="${href}"${id === active ? ' aria-current="page"' : ""}>${label}</a>`)
    .join("\n      ");
  return fill(part("site-header"), { navLinks: links, contactHref });
}

function projectArt(p, sizes, eager) {
  if (p.art === "image") {
    return `<div class="project-art"><img src="/images/project-art-${p.id}-680w.webp" srcset="/images/project-art-${p.id}-680w.webp 680w, /images/project-art-${p.id}-1360w.webp 1360w" sizes="${sizes}" width="680" height="420" alt="${escapeHtml(p.artDescription)}"${eager ? "" : ' loading="lazy"'} decoding="async"></div>`;
  }
  if (p.art === "confidential") {
    return `<div class="project-art project-art--confidential"><img src="/icons/icon-lock-white.svg" width="32" height="32" alt=""><span>Protected by an NDA</span></div>`;
  }
  return `<div class="project-art project-art--placeholder">${escapeHtml(p.artPlaceholder || "Add project visual")}</div>`;
}

/* One project shown as a row: details on the left, picture on the right. */
function projectRow(p, overrides = {}, eager = false) {
  const item = { ...p, ...overrides };
  const buttonLabel = item.buttonLabel || "View case study";
  const link = item.url
    ? (cls) => `<a class="button ${cls}" href="${item.url}"><span>${buttonLabel}</span></a>`
    : (cls) => `<a class="button ${cls}" aria-disabled="true" title="This case study is not ready yet"><span>${buttonLabel}</span></a>`;
  return `<article class="project-row" data-project="${item.id}">
      <div class="project-row__details">
        <div class="project-row__title-row">
          <h2 class="project-row__title">${item.url ? `<a href="${item.url}">${escapeHtml(item.name)}</a>` : escapeHtml(item.name)}</h2>
          <span class="badge-category">${escapeHtml(item.category)}</span>
        </div>
        <p class="body-16">${escapeHtml(item.summary)}</p>
        <dl class="project-row__facts">
          <div class="project-row__fact"><dt>Role</dt><dd>${escapeHtml(item.role)}</dd></div>
          <div class="project-row__fact"><dt>Outcome</dt><dd>${escapeHtml(item.outcome)}</dd></div>
        </dl>
        ${link("button--primary button--when-desktop")}
        ${link("button--secondary button--small button--when-phone")}
      </div>
      ${projectArt(item, "(max-width: 767px) 100vw, (max-width: 1099px) 48vw, 680px", eager)}
    </article>`;
}

/* The four tall tiles on the home page. */
function homeWorkTiles() {
  const tile = (p, inner, label) => `<a class="work-tile work-tile--${p.tile}" href="${p.url}">
        <span class="work-tile__media">
          ${inner}
          <span class="work-tile__cursor-label"><img src="/icons/icon-view-white.svg" width="20" height="20" alt=""><span>${label}</span></span>
        </span>
        <span class="work-tile__caption">
          <span class="work-tile__name">${escapeHtml(p.name)}</span>
          <span class="work-tile__meta">${escapeHtml(p.tileMeta)}</span>
        </span>
      </a>`;
  const phone = (id, w, h, small, large) =>
    `<img class="work-tile__phone" src="/images/${id}-phone-${small}w.webp" srcset="/images/${id}-phone-${small}w.webp 1x, /images/${id}-phone-${large}w.webp 2x" width="${w}" height="${h}" alt="" decoding="async">`;
  return [
    tile(project("afemairide"), `<img class="work-tile__logo" src="/icons/logo-afemairide.svg" width="201" height="48" alt="Afemairide">\n          ${phone("afemairide", 323, 656, 323, 646)}`, "View case study"),
    tile(project("dukacards"), `<span class="work-tile__title">Dukacards</span>\n          ${phone("dukacards", 248, 512, 248, 496)}`, "View case study"),
    tile(project("govtech-project-manager"), `<span class="work-tile__title">Govtech project manager</span>\n          <span class="work-tile__note">Add project visual</span>`, "View case study"),
    tile(project("confidential-project"), `<img class="work-tile__lock" src="/icons/icon-lock-white.svg" width="32" height="32" alt="">\n          <span class="work-tile__title">Confidential project</span>`, "Enter password"),
  ].join("\n      ");
}

const workProductList = () => PROJECTS.filter((p) => p.lists.includes("product")).map((p) => projectRow(p, {}, true)).join("\n    ");
const workBrandList = () => PROJECTS.filter((p) => p.lists.includes("brand")).map((p) => projectRow(p, p.brand || {}, true)).join("\n    ");

const GENERATED_PARTS = {
  "home-work-tiles": homeWorkTiles,
  "work-product-list": workProductList,
  "work-brand-list": workBrandList,
};

/* ---------- Case studies ---------- */

function caseStudyPage(study) {
  const p = project(study.id);
  const next = project(study.next);
  const paragraphs = (list) => list.map((text) => `<p class="case-copy">${escapeHtml(text)}</p>`).join("\n          ");
  const visual = (v, kind) =>
    v && v.image
      ? `<div class="case-visual case-visual--image"><img src="${v.image}" ${v.srcset ? `srcset="${v.srcset}" sizes="(max-width: 1099px) 100vw, 592px" ` : ""}width="${v.width}" height="${v.height}" alt="${escapeHtml(v.alt || "")}" decoding="async"></div>`
      : `<div class="case-visual case-visual--${kind}">${escapeHtml(v.placeholder)}</div>`;
  const links = (study.links || [])
    .map((l) => {
      const icon = l.icon === "stigdata" ? `<span class="stigdata-mark" aria-hidden="true"><i></i><i></i><i></i></span>` : `<img src="/icons/logo-figma.svg" width="18" height="18" alt="">`;
      return l.url
        ? `<a class="case-link" href="${l.url}" target="_blank" rel="noopener">${icon}${escapeHtml(l.label)}</a>`
        : `<span class="case-link" title="Link coming soon">${icon}${escapeHtml(l.label)}</span>`;
    })
    .join("\n              ");
  const facts = study.facts.map((f) => `<div class="case-fact"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`).join("\n            ");
  const sections = ["Overview", "Goals", "Process", "Solution", "Result", "Reflection"];

  const content = `<div class="case-phone-header">${renderHeader("work", "#contact")}</div>
  <main id="main" class="case-study">
    <div class="case-rail">
      <div class="case-rail__inner">
        <div class="case-rail__top">
          <a class="back-button" href="/work/"><img src="/icons/icon-arrow-left.svg" width="20" height="20" alt=""><span>Back</span></a>
          <button class="sound-toggle" type="button" aria-pressed="true" aria-label="Turn sound off" data-sound-toggle>
            <img class="sound-toggle__on" src="/icons/icon-volume-on.svg" width="20" height="20" alt="">
            <img class="sound-toggle__off" src="/icons/icon-volume-off.svg" width="20" height="20" alt="">
          </button>
        </div>
        <nav class="case-contents" aria-label="Sections of this case study">
          <button class="case-contents__toggle" type="button" aria-expanded="true" aria-controls="case-contents-list" data-contents-toggle>
            <span class="case-contents__toggle-label when-open"><img src="/icons/icon-close.svg" width="20" height="20" alt=""><span>Close</span></span>
            <span class="case-contents__toggle-label when-closed"><img src="/icons/icon-index.svg" width="20" height="20" alt=""><span>Index</span></span>
            <span class="case-contents__progress" data-reading-progress>0%</span>
          </button>
          <ul class="case-contents__list" id="case-contents-list">
            ${sections.map((s) => `<li><a href="#${s.toLowerCase()}">${s}</a></li>`).join("\n            ")}
          </ul>
        </nav>
      </div>
    </div>

    <div class="case-rows">
    <section class="case-row case-row--overview" id="overview">
      <div class="case-row__text">
        ${study.confidential ? `<p class="case-notice"><img src="/icons/icon-lock.svg" width="20" height="20" alt="">Confidential. Shared under NDA, so please don’t share this page.</p>` : ""}
        <h1 class="case-title">${escapeHtml(study.title)}</h1>
        <div class="case-overview">
          <p class="case-eyebrow case-eyebrow--phone-only">Overview</p>
          <p class="case-lead">${escapeHtml(study.lead)}</p>
          <p class="case-copy">${escapeHtml(study.intro)}</p>
        </div>
        <dl class="case-facts">
            ${facts}${links ? `\n            <div class="case-fact"><dt>Links</dt><dd class="case-links">\n              ${links}\n            </dd></div>` : ""}
        </dl>
      </div>
      <div class="case-row__visual">${visual(study.heroVisual, "hero")}</div>
    </section>

    <section class="case-row" id="goals">
      <div class="case-row__text">
        <h2 class="case-eyebrow">Goals</h2>
        <p class="case-heading">${escapeHtml(study.goals.heading)}</p>
        <ol class="case-goals">
          ${study.goals.items.map((g) => `<li>${escapeHtml(g)}</li>`).join("\n          ")}
        </ol>
      </div>
      <div class="case-row__visual">${visual(study.goals.visual, "section")}</div>
    </section>

    <section class="case-row" id="process">
      <div class="case-row__text">
        <h2 class="case-eyebrow">Process</h2>
        <p class="case-heading">${escapeHtml(study.process.heading)}</p>
          ${paragraphs(study.process.copy)}
      </div>
      <div class="case-row__visual">
        <figure class="case-gallery">
          <div class="case-gallery__frame"><span class="case-gallery__spacer"></span><div class="case-gallery__slide"></div><span class="case-gallery__next"><img src="/icons/icon-chevron-right.svg" width="16" height="16" alt=""></span></div>
          <figcaption class="case-caption">${escapeHtml(study.process.caption)}</figcaption>
        </figure>
      </div>
    </section>

    <section class="case-row" id="solution">
      <div class="case-row__text">
        <h2 class="case-eyebrow">Solution</h2>
        <p class="case-heading">${escapeHtml(study.solution.heading)}</p>
          ${paragraphs(study.solution.copy)}
      </div>
      <div class="case-row__visual">
        <figure class="case-gallery">
          <div class="case-gallery__frame case-gallery__frame--plain"><div class="case-gallery__slide"></div></div>
          <figcaption class="case-caption">${escapeHtml(study.solution.caption)}</figcaption>
        </figure>
        <div class="case-supporting">
          ${study.solution.supporting.map((s) => `<div class="case-visual case-visual--supporting">${escapeHtml(s)}</div>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="case-row" id="result">
      <div class="case-row__text">
        <h2 class="case-eyebrow">Result</h2>
        <p class="case-heading">${escapeHtml(study.result.heading)}</p>
          ${paragraphs(study.result.copy)}
      </div>
      <div class="case-row__visual">
        <div class="case-metrics">
          ${study.result.metrics.map((m) => `<div class="case-metric"><p class="case-metric__value">${escapeHtml(m.value)}</p><p class="case-metric__label">${escapeHtml(m.label)}</p></div>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="case-row" id="reflection">
      <div class="case-row__text">
        <h2 class="case-eyebrow">Reflection</h2>
        <p class="case-heading">${escapeHtml(study.reflection.heading)}</p>
          ${paragraphs(study.reflection.copy)}
      </div>
      <div class="case-row__visual">${visual(study.reflection.visual, "section")}</div>
    </section>
    </div>
  </main>

  <section class="next-project" aria-labelledby="next-project-heading">
    <h2 class="heading-4" id="next-project-heading">Next project</h2>
    ${projectRow(next)}
  </section>
  {{> contact-box}}
  {{> site-footer}}`;

  return {
    meta: {
      path: p.url,
      title: `${study.pageTitle || study.title} | David Okunlola`,
      description: study.description,
      noindex: Boolean(study.confidential),
      bareShell: true,
    },
    content,
  };
}

/* ---------- Putting a page together ---------- */

function fill(template, values) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key) => (key in values ? values[key] : whole));
}

function expandParts(html, context) {
  return html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (whole, name) => {
    if (name === "site-header") return renderHeader(context.active, context.contactHref);
    if (GENERATED_PARTS[name]) return GENERATED_PARTS[name]();
    return expandParts(fill(part(name), SITE), context);
  });
}

function buildPage({ meta, content }) {
  const context = { active: meta.active || "", contactHref: meta.contactHref || "#contact" };
  const canonical = SITE.address + (meta.path === "/404.html" ? "/" : meta.path);
  const html = fill(part("page-shell"), {
    ...SITE,
    title: escapeHtml(meta.title),
    description: escapeHtml(meta.description),
    canonical,
    robots: meta.noindex || !SITE.showInSearchEngines ? '<meta name="robots" content="noindex">' : "",
    content: expandParts(fill(content, SITE), context),
  });
  const leftover = html.match(/\{\{[^}]*\}\}/);
  if (leftover) throw new Error(`Unfilled placeholder ${leftover[0]} in page ${meta.path}`);
  const file = meta.path.endsWith(".html") ? meta.path : path.join(meta.path, "index.html");
  const target = path.join(OUTPUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html.replace(/\n\s*\n\s*\n/g, "\n\n"));
  return meta;
}

function readPageFile(fileName) {
  const raw = read("pages", fileName);
  const match = raw.match(/^<!--page\s*([\s\S]*?)-->\s*/);
  if (!match) throw new Error(`${fileName} must start with a <!--page { ... } --> block`);
  return { meta: JSON.parse(match[1]), content: raw.slice(match[0].length) };
}

/* ---------- Run ---------- */

fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.cpSync(path.join(SOURCE, "static"), OUTPUT, { recursive: true });

const built = [];
for (const fileName of fs.readdirSync(path.join(SOURCE, "pages")).filter((f) => f.endsWith(".html"))) {
  built.push(buildPage(readPageFile(fileName)));
}
for (const fileName of fs.readdirSync(path.join(SOURCE, "content", "case-studies")).filter((f) => f.endsWith(".json"))) {
  built.push(buildPage(caseStudyPage(JSON.parse(read("content", "case-studies", fileName)))));
}

/* Search engines.
   The switch is "showInSearchEngines" in site-source/content/site-details.json.
   - false: every page carries a "noindex" tag asking search engines not to list it, there is no
     page list for them, and a _headers file adds the same request to images and other files.
     (Search engines are still allowed to visit; they have to, in order to see the request.)
   - true: pages can be listed (except ones marked "noindex", such as the confidential case study),
     and a sitemap lists them. */
if (SITE.showInSearchEngines) {
  const listed = built.filter((m) => !m.noindex && !m.path.endsWith(".html")).map((m) => m.path).sort();
  fs.writeFileSync(
    path.join(OUTPUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map((p) => `  <url><loc>${SITE.address}${p}</loc></url>`).join("\n")}\n</urlset>\n`
  );
  fs.writeFileSync(path.join(OUTPUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.address}/sitemap.xml\n`);
} else {
  fs.writeFileSync(path.join(OUTPUT, "robots.txt"), "User-agent: *\nAllow: /\n");
  fs.writeFileSync(path.join(OUTPUT, "_headers"), "/*\n  X-Robots-Tag: noindex\n");
}

console.log(`Built ${built.length} pages into site-output (${SITE.showInSearchEngines ? "listed in" : "hidden from"} search engines):`);
for (const m of built.sort((a, b) => a.path.localeCompare(b.path))) console.log("  " + m.path);
