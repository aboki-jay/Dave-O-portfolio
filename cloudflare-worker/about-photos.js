/*
  cloudflare-worker/about-photos.js
  ---------------------------------
  Shows the photos from a Google Drive folder in the Photography part of the About page.
  Drop a photo into the folder and it appears on the site within a few minutes.

  Two secrets saved in Cloudflare make this work. Neither is stored in this project:

    PHOTOS_DRIVE_FOLDER    the link to the Drive folder (or just its ID)
    GOOGLE_DRIVE_API_KEY   a Google key that is allowed to read that folder

  Until both are set, the About page simply shows the placeholder photos built into it.

  What comes here (see "run_worker_first" in wrangler.jsonc):

    /about/         the About page. The photos are written into it before it is sent.
    /photos/...     one photo, at one of the sizes below.

  Visitors never see anything from Google. Photos are sent from this site's own address,
  under made-up names, as smaller copies sized for the page. The originals in Drive are
  never changed.

  The label on a photo is the file's name in Drive (or its Description, if it has one).
  Camera names such as IMG_1234 are ignored, so those photos show no label.
*/

const PHOTOS_SHOWN = 12; // how many photos the page shows (newest first)
const MINUTES_BEFORE_CHECKING_DRIVE_AGAIN = 5; // how quickly a new upload appears
const DAYS_TO_KEEP_LAST_GOOD_LIST = 7; // if Google cannot be reached, the last list that worked is shown for up to this long
const BOX = { width: 418, height: 495 }; // the shape every photo is shown in
const SIZES = [420, 840, 1260]; // widths of that shape the page can ask for (small, sharp, extra sharp)
const LARGEST_COPY = 2560; // never ask Google for a copy wider than this
// Browsers and Cloudflare keep each copy for a long time. Raise this number whenever the way copies
// are made changes (sizes, cropping), so every photo gets a new address and old copies are not reused.
const COPY_RECIPE = 2;

// The little icon beside a label is picked from words in the photo's name. The list is read from the
// top and the first match wins, so the subject of a photo ("bird", "traffic") comes before where or
// when it was taken ("sky", "Lagos"). A name that matches nothing gets the camera.
// To add a word, put it in the right line. To add an icon, save it as
// site-source/static/icons/photo-tag-<name>.svg and add a line here. Plurals ("flowers") match too.
const ICONS = [
  { icon: "bird", words: ["bird", "eagle", "pigeon", "dove", "crow", "parrot", "egret", "heron", "owl", "hawk"] },
  { icon: "paw-print", words: ["dog", "cat", "goat", "cow", "horse", "animal", "pet", "puppy", "kitten", "lizard"] },
  { icon: "users", words: ["people", "portrait", "man", "woman", "men", "women", "boy", "girl", "child", "children", "kid", "friend", "family", "crowd", "face", "smile", "selfie"] },
  { icon: "watch", words: ["watch", "clock", "casio"] },
  { icon: "flower-2", words: ["flower", "plant", "leaf", "leaves", "rose", "sunflower", "hibiscus", "garden", "bloom", "blossom", "petal", "grass"] },
  { icon: "trees", words: ["tree", "palm", "forest", "bush", "woods", "park"] },
  { icon: "droplets", words: ["raindrop", "rain", "rainy", "drizzle", "dew", "droplet", "drop", "water", "puddle"] },
  { icon: "waves", words: ["sea", "ocean", "beach", "wave", "lagoon", "river", "lake", "shore", "coast"] },
  { icon: "car", words: ["traffic", "car", "bus", "danfo", "keke", "taxi", "vehicle", "truck", "drive"] },
  { icon: "bike", words: ["bike", "bicycle", "okada", "motorcycle", "cyclist"] },
  { icon: "plane", words: ["plane", "airplane", "aeroplane", "flight", "airport", "travel"] },
  { icon: "sailboat", words: ["boat", "ship", "canoe", "ferry", "sail", "yacht"] },
  { icon: "radio-tower", words: ["telco", "telecom", "mast", "antenna", "signal", "network", "pylon"] },
  { icon: "coffee", words: ["coffee", "tea", "cafe", "latte", "espresso"] },
  { icon: "utensils", words: ["food", "meal", "lunch", "dinner", "breakfast", "jollof", "rice", "suya", "restaurant", "kitchen"] },
  { icon: "laptop", words: ["laptop", "desk", "workspace", "setup", "computer", "office", "screen"] },
  { icon: "house", words: ["home", "house", "room", "interior", "window", "door"] },
  { icon: "landmark", words: ["church", "mosque", "museum", "monument", "landmark", "statue", "palace"] },
  { icon: "route", words: ["road", "highway", "expressway", "path", "junction", "bridge", "lane"] },
  { icon: "sunset", words: ["sunset", "sunrise", "golden hour", "dusk", "dawn", "evening"] },
  { icon: "moon", words: ["night", "moon", "midnight", "star"] },
  { icon: "sun", words: ["sun", "sunny", "sunlight", "sunshine", "morning", "afternoon"] },
  { icon: "cloud", words: ["sky", "cloud", "cloudy"] },
  { icon: "mountain", words: ["mountain", "hill", "rock", "landscape", "valley", "nature"] },
  { icon: "building-2", words: ["lagos", "abuja", "street", "city", "urban", "town", "downtown", "skyline", "building", "tower", "market", "estate", "architecture"] },
];

const isSetUp = (env) => Boolean(env.PHOTOS_DRIVE_FOLDER && env.GOOGLE_DRIVE_API_KEY);

/* ---------- The About page ---------- */

export async function handleAboutPage(request, env, ctx) {
  if (!isSetUp(env) || request.method !== "GET") return env.ASSETS.fetch(request);

  // Always start from the full page, never a "nothing changed" reply, so new photos can be added.
  const headers = new Headers(request.headers);
  headers.delete("If-None-Match");
  headers.delete("If-Modified-Since");
  const page = await env.ASSETS.fetch(new Request(request.url, { headers, redirect: "manual" }));
  if (page.status !== 200 || !(page.headers.get("Content-Type") || "").includes("text/html")) return page;

  let photos = [];
  try {
    photos = await photoList(request, env, ctx);
  } catch (error) {
    console.error("about photos: could not read the Drive folder", error);
  }
  if (!photos.length) return page; // keep the built-in placeholder photos

  const gallery = photos.slice(0, PHOTOS_SHOWN).map(photoMarkup).join("\n          ");
  const total = String(photos.length).padStart(2, "0");
  const rewritten = new HTMLRewriter()
    .on("[data-about-photos]", { element: (el) => void el.setInnerContent(`\n          ${gallery}\n        `, { html: true }) })
    .on("[data-photo-count]", { element: (el) => void el.setInnerContent(total) })
    .transform(page);

  const response = new Response(rewritten.body, rewritten);
  response.headers.delete("ETag");
  response.headers.delete("Last-Modified");
  response.headers.set("Cache-Control", "no-cache");
  return response;
}

function photoMarkup(photo, index) {
  const address = (size) => `/photos/${photo.id}-${size}`;
  const srcset = SIZES.map((size) => `${address(size)} ${size}w`).join(", ");
  const alt = escapeHtml(photo.label || "Photograph by David Okunlola");
  const tag = photo.label
    ? `<figcaption class="photo-tag"><span class="photo-tag__icon"><img src="/icons/photo-tag-${iconFor(photo.label)}.svg" width="16" height="16" alt=""></span><span class="photo-tag__label">${escapeHtml(photo.label)}</span></figcaption>`
    : "";
  return `<figure class="about-photo"><img src="${address(SIZES[1])}" srcset="${srcset}" sizes="(max-width: 1099px) 50vw, 418px" width="${BOX.width}" height="${BOX.height}" alt="${alt}"${index < 2 ? "" : ' loading="lazy"'} decoding="async">${tag}</figure>`;
}

function iconFor(label) {
  const text = label.toLowerCase();
  const match = ICONS.find((entry) => entry.words.some((word) => new RegExp(`\\b${word}(s|es)?\\b`).test(text)));
  return match ? match.icon : "camera";
}

/* ---------- One photo ---------- */

export async function handlePhoto(request, env, ctx) {
  const notFound = () => new Response("Photo not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!isSetUp(env) || (request.method !== "GET" && request.method !== "HEAD")) return notFound();

  const match = new URL(request.url).pathname.match(/^\/photos\/([a-f0-9]{20})-(\d+)$/);
  const size = match ? Number(match[2]) : 0;
  if (!match || !SIZES.includes(size)) return notFound();

  // Each copy is fetched from Google once, then kept by Cloudflare and sent from there.
  const kept = new Request(new URL(`/photos/${match[1]}-${size}`, request.url).toString());
  const already = await caches.default.match(kept);
  if (already) return already;

  let photos = [];
  try {
    photos = await photoList(request, env, ctx);
  } catch (error) {
    console.error("about photos: could not read the Drive folder", error);
  }
  const photo = photos.find((p) => p.id === match[1]);
  if (!photo) return notFound();

  // First choice: Google cuts the copy to exactly the box the page shows (keeping the middle of the photo),
  // so nothing is sent that the page would only crop away. Second choice: a whole, uncropped copy wide
  // enough to stay sharp once the page crops it.
  const height = Math.round((size * BOX.height) / BOX.width);
  const sources = [];
  if (/=s\d+$/.test(photo.thumbnail)) sources.push(photo.thumbnail.replace(/=s\d+$/, `=w${size}-h${height}-n`));
  sources.push(`https://drive.google.com/thumbnail?id=${encodeURIComponent(photo.fileId)}&sz=w${copyWidth(photo, size)}`);

  for (const source of sources) {
    try {
      const reply = await fetch(source, { signal: AbortSignal.timeout(15000) });
      const type = reply.headers.get("Content-Type") || "";
      if (!reply.ok || !type.startsWith("image/")) continue;
      const response = new Response(reply.body, {
        headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
      });
      ctx.waitUntil(caches.default.put(kept, response.clone()));
      return response;
    } catch (error) {
      console.error("about photos: could not fetch a photo copy", error);
    }
  }
  return new Response("Photo unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
}

// How wide a whole, uncropped copy has to be so the photo still looks sharp after the page crops it to the box.
function copyWidth(photo, size) {
  const boxHeight = (size * BOX.height) / BOX.width;
  const needed = Math.max(size, boxHeight * photo.shape);
  return Math.min(LARGEST_COPY, Math.ceil(needed / 80) * 80);
}

/* ---------- The list of photos in the folder ---------- */

let remembered; // { key, at, photos } kept between visits while this copy of the code stays awake

async function photoList(request, env, ctx) {
  const folder = folderId(env.PHOTOS_DRIVE_FOLDER);
  if (!folder) throw new Error("PHOTOS_DRIVE_FOLDER is not a Drive folder link or ID");
  const key = await shortHash(`list|${COPY_RECIPE}|${folder}|${env.GOOGLE_DRIVE_API_KEY}`);
  const freshFor = MINUTES_BEFORE_CHECKING_DRIVE_AGAIN * 60;

  if (remembered && remembered.key === key && Date.now() - remembered.at < freshFor * 1000) return remembered.photos;

  // A private shelf in Cloudflare's cache. Its address is under /api/, which is never sent to visitors.
  const shelf = new Request(new URL(`/api/photos-cache/${key}`, request.url).toString());
  const kept = await caches.default.match(shelf);
  const saved = kept ? await kept.json().catch(() => null) : null;
  if (saved && Date.now() - saved.at < freshFor * 1000) {
    remembered = { key, at: saved.at, photos: saved.photos };
    return saved.photos;
  }

  let photos;
  try {
    photos = await readDriveFolder(folder, env.GOOGLE_DRIVE_API_KEY);
  } catch (error) {
    // Google did not answer in time. Keep showing the last list that worked rather than the placeholders.
    const lastGood = saved ? saved.photos : remembered && remembered.key === key ? remembered.photos : null;
    if (!lastGood) throw error;
    console.error("about photos: Drive did not answer, showing the last list that worked", error);
    return lastGood;
  }
  if (!photos.length) return photos; // an empty folder is checked again on the next visit
  remembered = { key, at: Date.now(), photos };
  ctx.waitUntil(
    caches.default.put(
      shelf,
      new Response(JSON.stringify({ at: remembered.at, photos }), { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${DAYS_TO_KEEP_LAST_GOOD_LIST * 86400}` } })
    )
  );
  return photos;
}

async function readDriveFolder(folder, apiKey) {
  const files = [];
  let nextPage = "";
  for (let page = 0; page < 5; page++) {
    const address = new URL("https://www.googleapis.com/drive/v3/files");
    address.search = new URLSearchParams({
      q: `'${folder}' in parents and trashed = false and mimeType contains 'image/'`,
      fields: "nextPageToken, files(id, name, description, createdTime, modifiedTime, thumbnailLink, imageMediaMetadata(width, height, rotation))",
      orderBy: "createdTime desc",
      pageSize: "200",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      key: apiKey,
      ...(nextPage ? { pageToken: nextPage } : {}),
    }).toString();
    const reply = await fetch(address, { signal: AbortSignal.timeout(4000) });
    if (!reply.ok) throw new Error(`Google Drive answered ${reply.status}`);
    const data = await reply.json();
    files.push(...(data.files || []));
    nextPage = data.nextPageToken || "";
    if (!nextPage) break;
  }

  return Promise.all(
    files.map(async (file) => {
      const meta = file.imageMediaMetadata || {};
      const turned = meta.rotation === 1 || meta.rotation === 3; // taken with the camera on its side
      const width = turned ? meta.height : meta.width;
      const height = turned ? meta.width : meta.height;
      return {
        // A made-up name, so the Drive file's own ID never appears on the site. It changes if the file is replaced.
        id: await shortHash(`photo|${COPY_RECIPE}|${file.id}|${file.modifiedTime}|${apiKey}`),
        fileId: file.id,
        thumbnail: file.thumbnailLink || "",
        label: labelFor(file),
        shape: width && height ? width / height : 1.5, // width divided by height; assume landscape when unknown
      };
    })
  );
}

function labelFor(file) {
  const description = tidy(file.description);
  if (description) return description.slice(0, 60);
  const name = tidy(String(file.name || "").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_]+/g, " "));
  // A camera or phone name: an optional prefix such as IMG or PXL, then nothing but numbers, dashes and times.
  const cameraName = /\d/.test(name) && /^(img|dsc[nf]?|pxl|mvimg|image|photo|picture|screenshot|whatsapp image|signal|snapchat)?[\s\-.\d()atmp]*$/i.test(name);
  return cameraName ? "" : name.slice(0, 60);
}

/* ---------- helpers ---------- */

// Accepts a full folder link or just the ID part of it.
function folderId(value) {
  const text = String(value || "").trim();
  const fromLink = text.match(/\/folders\/([\w-]{10,})/) || text.match(/[?&]id=([\w-]{10,})/);
  if (fromLink) return fromLink[1];
  return /^[\w-]{10,}$/.test(text) ? text : "";
}

async function shortHash(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tidy(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
