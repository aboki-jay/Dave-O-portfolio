/*
  build-website.js
  ----------------
  Puts the website together. It reads everything in "site-source" and writes the
  finished, ready-to-publish website into "site-output".

    site-source/pages/           one file per page (only that page's own content)
    site-source/shared-parts/    pieces every page shares: header, footer, contact box
    site-source/content/         project details and case study text (plain data files)
    site-source/static/          images, icons, fonts, styles, scripts (copied as they are)

  Case studies written in Sanity (the editor in "sanity-studio") are fetched here too, and
  take the place of a file in site-source/content with the same name. See "Content from Sanity".

  Run it with:  npm run build
  It has no dependencies: it only needs Node.js.
*/

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SOURCE = path.join(ROOT, "site-source");
const OUTPUT = path.join(ROOT, "site-output");
const SITE = JSON.parse(fs.readFileSync(path.join(SOURCE, "content", "site-details.json"), "utf8"));
// The projects kept in this folder. Ones written in Sanity are added to this list when the build runs.
let PROJECTS = JSON.parse(fs.readFileSync(path.join(SOURCE, "content", "projects.json"), "utf8")).map((p, index) => ({
  order: 1000 + index, // after anything from Sanity, in the order they are written in the file
  homeOrder: 1000 + index,
  ...p,
}));

const read = (...parts) => fs.readFileSync(path.join(SOURCE, ...parts), "utf8");
const part = (name) => read("shared-parts", name + ".html").trim();
const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const project = (id) => {
  const found = PROJECTS.find((p) => p.id === id);
  if (!found) throw new Error(`No project called "${id}" in Sanity or in site-source/content/projects.json`);
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
    .map(([id, label, href]) => `<a class="nav-link" href="${href}"${id === active ? ' aria-current="page"' : ""}${id === "work" ? " data-sheet-work" : ""}>${label}</a>`)
    .join("\n      ");
  return fill(part("site-header"), { navLinks: links, contactHref, workSheet: sheetWorkProjects() });
}

/* The projects shown inside the phone menu when Work is tapped: the Product design list, in the same
   order as the Work page. Each has its picture, summary, role and outcome, a button to open the case
   study and a button that moves to the next project without leaving the sheet. */
function sheetWorkProjects() {
  const list = inWorkOrder().filter((p) => p.url && p.lists.includes("product"));
  const closeButton = `<button class="nav-sheet__close" type="button" aria-label="Close menu" data-menu-close><img src="/icons/icon-x-16.svg" width="16" height="16" alt=""></button>`;
  return list
    .map((p, index) => {
      const next = list[(index + 1) % list.length];
      return `<article class="sheet-project" data-sheet-project hidden>
          <div class="sheet-project__title-row">
            <div class="sheet-project__title">
              <h2 class="sheet-project__name">${escapeHtml(p.name)}</h2>
              ${p.category ? `<span class="badge-category badge-category--small">${escapeHtml(p.category)}</span>` : ""}
            </div>
            ${closeButton}
          </div>
          <div class="sheet-project__body">
            ${projectArt(p, "(max-width: 767px) 100vw, 400px", false)}
            ${p.summary ? `<p class="sheet-project__summary">${escapeHtml(p.summary)}</p>` : ""}
            <dl class="sheet-project__facts">
              ${p.role ? `<div><dt>Role</dt><dd>${escapeHtml(p.role)}</dd></div>` : ""}
              ${p.outcome ? `<div><dt>Outcome</dt><dd>${escapeHtml(p.outcome)}</dd></div>` : ""}
            </dl>
            <div class="sheet-project__actions">
              <a class="button button--secondary button--small" href="${p.url}"><span>${escapeHtml(p.buttonLabel || "View case study")}</span></a>
              ${list.length > 1 ? `<button class="button button--small sheet-project__next" type="button" data-sheet-next><span>Next: ${escapeHtml(next.name)}</span></button>` : ""}
            </div>
          </div>
        </article>`;
    })
    .join("\n        ");
}

function projectArt(p, sizes, eager) {
  if (p.cover) {
    return `<div class="project-art"><img src="${p.cover.image}" srcset="${p.cover.srcset}" sizes="${sizes}" width="${p.cover.width}" height="${p.cover.height}" alt="${escapeHtml(p.cover.alt)}"${eager ? "" : ' loading="lazy"'} decoding="async"></div>`;
  }
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

/* The tall tiles on the home page: every project marked to show there, in its home page position.
   Three projects have artwork drawn specially for their tile. Any other project shows its
   "Home tile picture" from Sanity, or its name on a plain tile until it has one. */
const tilePhone = (id, w, h, small, large) =>
  `<img class="work-tile__phone" src="/images/${id}-phone-${small}w.webp" srcset="/images/${id}-phone-${small}w.webp 1x, /images/${id}-phone-${large}w.webp 2x" width="${w}" height="${h}" alt="" decoding="async">`;
const BUILT_IN_TILE_ART = {
  afemairide: (p) => `<img class="work-tile__logo" src="/icons/logo-afemairide.svg" width="201" height="48" alt="Afemairide">\n          ${tilePhone("afemairide", 323, 656, 323, 646)}`,
  dukacards: (p) => `<span class="work-tile__title">${escapeHtml(p.name)}</span>\n          ${tilePhone("dukacards", 248, 512, 248, 496)}`,
  "confidential-project": (p) => `<img class="work-tile__lock" src="/icons/icon-lock-white.svg" width="32" height="32" alt="">\n          <span class="work-tile__title">${escapeHtml(p.name)}</span>`,
};
const BUILT_IN_TILE_STYLE = { afemairide: "afemairide", dukacards: "dukacards", "confidential-project": "confidential" };

function homeWorkTiles() {
  return PROJECTS.filter((p) => p.home && p.url)
    .sort((a, b) => a.homeOrder - b.homeOrder)
    .map((p) => {
      let style, inner;
      if (p.tilePicture) {
        style = "picture";
        inner = `<img class="work-tile__picture" src="${p.tilePicture.image}" srcset="${p.tilePicture.srcset}" sizes="(max-width: 767px) 280px, 34vw" width="${p.tilePicture.width}" height="${p.tilePicture.height}" alt="${escapeHtml(p.tilePicture.alt)}" decoding="async">`;
      } else if (BUILT_IN_TILE_ART[p.id]) {
        style = BUILT_IN_TILE_STYLE[p.id];
        inner = BUILT_IN_TILE_ART[p.id](p);
      } else {
        style = "plain";
        inner = `<span class="work-tile__title">${escapeHtml(p.name)}</span>\n          <span class="work-tile__note">Add project visual</span>`;
      }
      return `<a class="work-tile work-tile--${style}" href="${p.url}">
        <span class="work-tile__media">
          ${inner}
          <span class="work-tile__cursor-label"><img src="/icons/icon-view-white.svg" width="20" height="20" alt=""><span>${escapeHtml(p.buttonLabel || "View case study")}</span></span>
        </span>
        <span class="work-tile__caption">
          <span class="work-tile__name">${escapeHtml(p.name)}</span>
          <span class="work-tile__meta">${escapeHtml(p.tileMeta || p.category || "")}</span>
        </span>
      </a>`;
    })
    .join("\n      ");
}

const inWorkOrder = () => [...PROJECTS].sort((a, b) => a.order - b.order);
const workProductList = () => inWorkOrder().filter((p) => p.lists.includes("product")).map((p) => projectRow(p, {}, true)).join("\n    ");
const workBrandList = () => inWorkOrder().filter((p) => p.lists.includes("brand")).map((p) => projectRow(p, p.brand || {}, true)).join("\n    ");

/* "Next project" at the foot of a case study: the one after it on the Work page, going back to the first after the last. */
function projectAfter(id) {
  const linked = inWorkOrder().filter((p) => p.url && (p.art !== "confidential" || p.id === id)); // never suggests the password-protected one
  const here = linked.findIndex((p) => p.id === id);
  return linked[(here + 1) % linked.length];
}

const GENERATED_PARTS = {
  "home-work-tiles": homeWorkTiles,
  "work-product-list": workProductList,
  "work-brand-list": workBrandList,
};

/* ---------- Case studies ----------
   A case study page is the Overview (the same for every case study) followed by any number of
   sections. Each section has a name ("Goals", "First draft"…), an optional heading, then text,
   a numbered list or big numbers, and optional pictures. Sections come from Sanity in whatever
   order David arranged them. A section with nothing in it is left out. */

// A picture (or animated GIF), or a video. Videos carry no sound and loop like a GIF; the script
// in site.js starts one when it comes on screen and pauses it when it leaves.
const casePicture = (v, lazy) =>
  v.video
    ? `<video class="case-video" src="${v.video}" muted loop playsinline preload="none" data-autoplay${v.alt ? ` aria-label="${escapeHtml(v.alt)}"` : ""}></video>`
    : `<img src="${v.image}" ${v.srcset ? `srcset="${v.srcset}" sizes="(max-width: 1099px) 100vw, 592px" ` : ""}width="${v.width}" height="${v.height}" alt="${escapeHtml(v.alt || "")}"${lazy ? ' loading="lazy"' : ""} decoding="async">`;
// One picture in a card, or a grey box with a note until there is one.
const caseBox = (v, kind) => (v && v.image ? `<div class="case-visual case-visual--image">${casePicture(v)}</div>` : `<div class="case-visual case-visual--${kind}">${escapeHtml(v.placeholder)}</div>`);
const caseCaption = (text) => (text ? `<figcaption class="case-caption">${escapeHtml(text)}</figcaption>` : "");
const caseSupporting = (list) =>
  `<div class="case-supporting">
          ${list.map((s) => (typeof s === "string" ? `<div class="case-visual case-visual--supporting">${escapeHtml(s)}</div>` : `<div class="case-visual case-visual--supporting case-visual--image">${casePicture(s, true)}</div>`)).join("\n          ")}
        </div>`;
const NEXT_ARROW = `<img src="/icons/icon-chevron-right.svg" width="16" height="16" alt="">`;

/* The picture side of a section. One picture stands alone. Two or more become a gallery: on desktop
   an arrow steps through them, on tablets and phones they are simply stacked. */
function sectionPictures(section) {
  const pictures = section.pictures || [];
  const parts = [];
  if (pictures.length === 1) {
    parts.push(`<figure class="case-gallery">
          <div class="case-gallery__frame case-gallery__frame--plain"><div class="case-gallery__slide case-gallery__slide--image">${casePicture(pictures[0], true)}</div></div>
          ${caseCaption(pictures[0].caption)}
        </figure>`);
  } else if (pictures.length > 1) {
    const slides = pictures
      .map(
        (p, index) =>
          `<div class="case-gallery__slide case-gallery__slide--image${index === 0 ? " is-current" : ""}" data-caption="${escapeHtml(p.caption || "")}">${casePicture(p, true)}${p.caption ? `<p class="case-caption case-gallery__slide-caption">${escapeHtml(p.caption)}</p>` : ""}</div>`
      )
      .join("\n            ");
    parts.push(`<figure class="case-gallery" data-gallery>
          <div class="case-gallery__frame"><span class="case-gallery__spacer"></span><div class="case-gallery__slides">
            ${slides}
          </div><button class="case-gallery__next" type="button" aria-label="Show the next picture" data-gallery-next>${NEXT_ARROW}</button></div>
          <figcaption class="case-caption" data-gallery-caption${pictures[0].caption ? "" : " hidden"}>${escapeHtml(pictures[0].caption || "")}</figcaption>
        </figure>`);
  }
  if ((section.supporting || []).length) parts.push(caseSupporting(section.supporting));
  return parts.join("\n        ");
}

function caseSection(section) {
  const text = [];
  if (section.heading) text.push(`<p class="case-heading">${escapeHtml(section.heading)}</p>`);
  if ((section.items || []).length) text.push(`<ol class="case-goals">\n          ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}\n        </ol>`);
  for (const paragraph of section.copy || []) text.push(`<p class="case-copy">${escapeHtml(paragraph)}</p>`);
  const metrics = section.metrics || [];
  const visual =
    section.visualHtml !== undefined
      ? section.visualHtml
      : metrics.length
        ? `<div class="case-metrics">
          ${metrics.map((m) => `<div class="case-metric"><p class="case-metric__value">${escapeHtml(m.value || "")}</p><p class="case-metric__label">${escapeHtml(m.label || "")}</p></div>`).join("\n          ")}
        </div>`
        : sectionPictures(section);
  return `<section class="case-row" id="${section.id}">
      <div class="case-row__text">
        <h2 class="case-eyebrow">${escapeHtml(section.label)}</h2>
        ${text.join("\n        ")}
      </div>${visual ? `\n      <div class="case-row__visual">\n        ${visual}\n      </div>` : ""}
    </section>`;
}

/* The confidential case study is still a file in this folder, written in the older fixed shape
   (goals, process, solution, result, reflection). This turns that shape into the same list of
   sections, keeping its grey "Add … visual" boxes. */
function sectionsFromFile(study) {
  const framed = (frameClass, next, caption) =>
    `<figure class="case-gallery">
          <div class="case-gallery__frame${frameClass}">${next ? `<span class="case-gallery__spacer"></span>` : ""}<div class="case-gallery__slide"></div>${next ? `<span class="case-gallery__next">${NEXT_ARROW}</span>` : ""}</div>
          ${caseCaption(caption)}
        </figure>`;
  return [
    { label: "Goals", heading: study.goals.heading, items: study.goals.items, visualHtml: caseBox(study.goals.visual, "section") },
    { label: "Process", heading: study.process.heading, copy: study.process.copy, visualHtml: framed("", true, study.process.caption) },
    { label: "Solution", heading: study.solution.heading, copy: study.solution.copy, visualHtml: framed(" case-gallery__frame--plain", false, study.solution.caption) + "\n        " + caseSupporting(study.solution.supporting || []) },
    { label: "Result", heading: study.result.heading, copy: study.result.copy, metrics: study.result.metrics },
    { label: "Reflection", heading: study.reflection.heading, copy: study.reflection.copy, visualHtml: caseBox(study.reflection.visual, "section") },
  ];
}

function caseStudyPage(study) {
  const p = project(study.id);
  const next = PROJECTS.find((item) => item.id === study.next) || projectAfter(study.id);

  // Give every section that has something in it a short address for the contents list ("first-draft").
  const taken = new Set(["overview", "main", "contact", "next-project-heading", "case-contents-list"]);
  const address = (label) => {
    const base = String(label).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    return id;
  };
  const hasContent = (s) => Boolean(s.heading || s.visualHtml || [s.copy, s.items, s.metrics, s.pictures, s.supporting].some((list) => (list || []).length));
  const sections = (study.sections || sectionsFromFile(study)).filter(hasContent).map((s) => ({ ...s, id: address(s.label) }));

  const links = (study.links || [])
    .map((l) => {
      const icon = l.icon === "stigdata" ? `<span class="stigdata-mark" aria-hidden="true"><i></i><i></i><i></i></span>` : `<img src="/icons/logo-figma.svg" width="18" height="18" alt="">`;
      return l.url
        ? `<a class="case-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${icon}${escapeHtml(l.label)}</a>`
        : `<span class="case-link" title="Link coming soon">${icon}${escapeHtml(l.label)}</span>`;
    })
    .join("\n              ");
  const facts = (study.facts || []).map((f) => `<div class="case-fact"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`).join("\n            ");
  const contents = [{ id: "overview", label: "Overview" }, ...sections];

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
            ${contents.map((s) => `<li><a href="#${s.id}">${escapeHtml(s.label)}</a></li>`).join("\n            ")}
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
          ${study.lead ? `<p class="case-lead">${escapeHtml(study.lead)}</p>` : ""}
          ${study.intro ? `<p class="case-copy">${escapeHtml(study.intro)}</p>` : ""}
        </div>
        <dl class="case-facts">
            ${facts}${links ? `\n            <div class="case-fact"><dt>Links</dt><dd class="case-links">\n              ${links}\n            </dd></div>` : ""}
        </dl>
      </div>
      <div class="case-row__visual">${caseBox(study.heroVisual, "hero")}</div>
    </section>

    ${sections.map(caseSection).join("\n\n    ")}
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

/* ---------- Content from Sanity ----------
   David writes case studies in Sanity (the editor in the "sanity-studio" folder). When the build
   runs it asks Sanity for every published case study and turns each one into the same shape the
   files in site-source/content use, so the rest of this script does not care where one came from.
   The field names here match sanity-studio/schemaTypes/case-study.js.
   The project is named in site-details.json ("sanityProjectId"). Leave that empty to switch Sanity off. */

const SANITY = { projectId: String(SITE.sanityProjectId || "").trim(), dataset: String(SITE.sanityDataset || "production").trim() };

async function readSanityCaseStudies() {
  if (!SANITY.projectId) return [];
  const question = '*[_type == "caseStudy" && defined(slug.current)] | order(order asc, name asc)';
  const address = `https://${SANITY.projectId}.api.sanity.io/v2025-02-19/data/query/${SANITY.dataset}?perspective=published&query=${encodeURIComponent(question)}`;
  const reply = await fetch(address, { signal: AbortSignal.timeout(20000) });
  if (!reply.ok) throw new Error(`Sanity answered ${reply.status}`);
  return (await reply.json()).result || [];
}

/* A picture uploaded in Sanity, as addresses on Sanity's picture service at the sizes the page needs.
   "shape" (width divided by height) crops it to a fixed shape; without it the picture keeps its own. */
function sanityPicture(picture, { widths, shape }) {
  const ref = picture && picture.asset && picture.asset._ref; // looks like image-<code>-<width>x<height>-<type>
  const parts = ref ? ref.match(/^image-([A-Za-z0-9]+)-(\d+)x(\d+)-([a-z0-9]+)$/) : null;
  if (!parts) return null;
  const [, code, fullWidth, fullHeight, type] = parts;
  const base = `https://cdn.sanity.io/images/${SANITY.projectId}/${SANITY.dataset}/${code}-${fullWidth}x${fullHeight}.${type}`;
  const height = (width) => Math.round(shape ? width / shape : (width * fullHeight) / fullWidth);
  const address = (width) => `${base}?w=${width}${shape ? `&amp;h=${height(width)}&amp;fit=crop` : "&amp;fit=max"}&amp;auto=format&amp;q=82`; // fit=max: never enlarge a small picture
  const usable = widths.filter((width) => width <= Number(fullWidth));
  const offered = usable.length ? usable : [widths[0]];
  return {
    image: address(offered[0]),
    srcset: offered.map((width) => `${address(width)} ${width}w`).join(", "),
    width: offered[0],
    height: height(offered[0]),
    alt: picture.alt || "",
  };
}

/* A video uploaded in Sanity. Its reference looks like file-<code>-<type>, for example file-abc123-mp4. */
function sanityVideo(file) {
  const ref = file && file.asset && file.asset._ref;
  const parts = ref ? ref.match(/^file-([A-Za-z0-9]+)-([a-z0-9]+)$/) : null;
  if (!parts || !["mp4", "webm", "m4v"].includes(parts[2])) return null;
  return { video: `https://cdn.sanity.io/files/${SANITY.projectId}/${SANITY.dataset}/${parts[1]}.${parts[2]}`, alt: file.alt || "" };
}

function fromSanity(doc, local) {
  const id = doc.slug.current;
  const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
  const sectionPicture = (picture) => sanityPicture(picture, { widths: [592, 800, 1184, 1600] });

  const project = {
    ...(local || {}),
    id,
    name: doc.name || id,
    category: doc.category || "",
    summary: doc.summary || "",
    role: doc.role || "",
    outcome: doc.outcome || "",
    url: `/work/${id}/`,
    lists: [doc.showInProduct !== false && "product", doc.showInBrand && "brand"].filter(Boolean),
    order: typeof doc.order === "number" ? doc.order : 500,
    home: doc.showOnHome !== false,
    homeOrder: typeof doc.homeOrder === "number" ? doc.homeOrder : typeof doc.order === "number" ? doc.order : 500,
    tileMeta: [doc.category, doc.tileResult || doc.outcome].filter(Boolean).join(" · "),
    cover: sanityPicture(doc.cover, { widths: [680, 1360], shape: 680 / 420 }),
    tilePicture: sanityPicture(doc.tilePicture, { widths: [480, 960] }),
  };
  if (doc.showInBrand) project.brand = Object.fromEntries(Object.entries({ summary: doc.brandSummary, role: doc.brandRole }).filter(([, value]) => value));
  else delete project.brand;
  if (!project.art) Object.assign(project, { art: "placeholder", artPlaceholder: "Add project visual" });

  // The three kinds of section in the editor (textSection, listSection, numbersSection) all end up in this one shape.
  const sections = list(doc.sections).map((section) => ({
    label: section.label || section.heading || "Details",
    heading: section.heading || "",
    copy: list(section.copy),
    items: list(section.items),
    metrics: list(section.metrics).filter((metric) => metric.value || metric.label),
    pictures: list(section.pictures)
      .map((picture) => {
        const ready = picture._type === "video" || picture._type === "file" ? sanityVideo(picture) : sectionPicture(picture);
        return ready ? { ...ready, caption: picture.caption || "" } : null;
      })
      .filter(Boolean),
    supporting: list(section.supporting).map(sectionPicture).filter(Boolean),
  }));

  const study = {
    id,
    title: doc.title || doc.name || id,
    pageTitle: doc.searchTitle || "",
    description: doc.searchDescription || doc.summary || "",
    lead: doc.lead || "",
    intro: doc.intro || "",
    facts: list(doc.facts).filter((fact) => fact.label || fact.value).map((fact) => ({ label: fact.label || "", value: fact.value || "" })),
    links: list(doc.links).filter((link) => link.label).map((link) => ({ label: link.label, url: link.url || "", icon: link.icon || "figma" })),
    heroVisual: sectionPicture(doc.heroPicture) || { placeholder: "Add hero visual" },
    sections,
  };
  return { project, study };
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

/* Visitor statistics are only added once an ID is filled in site-details.json. See static/scripts/site-analytics.js. */
function analyticsTag() {
  const cloudflare = String(SITE.cloudflareAnalyticsToken || "").trim();
  const clarity = String(SITE.clarityProjectId || "").trim();
  if (!cloudflare && !clarity) return "";
  const attributes = [cloudflare && `data-cloudflare-token="${escapeHtml(cloudflare)}"`, clarity && `data-clarity-project="${escapeHtml(clarity)}"`].filter(Boolean).join(" ");
  return `<script src="/scripts/site-analytics.js" defer ${attributes}></script>`;
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
    analytics: analyticsTag(),
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

async function main() {
// Case studies kept as files in this folder.
const studies = new Map();
for (const fileName of fs.readdirSync(path.join(SOURCE, "content", "case-studies")).filter((f) => f.endsWith(".json"))) {
  const study = JSON.parse(read("content", "case-studies", fileName));
  studies.set(study.id, study);
}

// Case studies written in Sanity. Each one replaces a file with the same name, or is added as new.
let fromSanityCount = 0;
try {
  for (const doc of await readSanityCaseStudies()) {
    const { project: fresh, study } = fromSanity(doc, PROJECTS.find((p) => p.id === doc.slug.current));
    PROJECTS = [...PROJECTS.filter((p) => p.id !== fresh.id), fresh];
    studies.set(study.id, study);
    fromSanityCount++;
  }
} catch (error) {
  // When Cloudflare is publishing, stop here so the site that is already live stays as it is.
  // On your own computer, carry on with the files in this folder so the preview still works offline.
  if (process.env.CI || process.env.WORKERS_CI) throw new Error(`Could not read case studies from Sanity, so nothing was published: ${error.message}`);
  console.warn(`Could not reach Sanity (${error.message}). Using the case study files in this folder instead.`);
}

fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.cpSync(path.join(SOURCE, "static"), OUTPUT, { recursive: true });

const built = [];
for (const fileName of fs.readdirSync(path.join(SOURCE, "pages")).filter((f) => f.endsWith(".html"))) {
  built.push(buildPage(readPageFile(fileName)));
}
for (const study of studies.values()) {
  built.push(buildPage(caseStudyPage(study)));
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
if (SANITY.projectId) console.log(`Case studies from Sanity: ${fromSanityCount}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
