/*
  cloudflare-worker/note-wall.js
  ------------------------------
  Stores and serves the notes people leave on the About page.

    GET  /api/notes   the latest notes, newest first
    POST /api/notes   add a note (it appears for everyone straight away)

  Notes live in a small Cloudflare database called "NOTES_DB" (see wrangler.jsonc).
  Because anyone can post, a few limits keep spam and floods off the page. Change the
  numbers in LIMITS below to make them stricter or looser.

  To remove a note: Cloudflare dashboard > Storage & Databases > D1 > the notes database >
  open the "notes" table and delete the row. Or ask Claude to remove it.
*/

const LIMITS = {
  messageLength: 140, // characters in a note
  nameLength: 40, // characters in a name
  notesShown: 60, // how many notes the page loads
  perPersonEvery10Minutes: 3, // notes one visitor can post in 10 minutes
  perPersonPerDay: 10, // notes one visitor can post in a day
  everyonePerHour: 40, // notes the whole site accepts in an hour
};

const COLOURS = ["orange", "green", "teal", "cyan", "light-blue", "blue", "purple", "fuchsia", "magenta", "rose"];

export async function handleNotes(request, env) {
  if (!env.NOTES_DB) return json({ error: "The note wall is not set up yet." }, 503);
  try {
    await ensureTable(env.NOTES_DB);
    if (request.method === "GET") return listNotes(env.NOTES_DB);
    if (request.method === "POST") return addNote(request, env.NOTES_DB);
    return json({ error: "Not allowed." }, 405);
  } catch (error) {
    console.error("note wall error", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

async function listNotes(db) {
  const { results } = await db
    .prepare("SELECT message, name, colour, created_at FROM notes ORDER BY id DESC LIMIT ?")
    .bind(LIMITS.notesShown)
    .all();
  return json({ notes: results.map(publicNote) });
}

async function addNote(request, db) {
  // Only accept posts sent from the site's own pages.
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Not allowed." }, 403);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "That note could not be read." }, 400);

  // A hidden field real visitors never see. Automated spam fills it in, so those posts are quietly dropped.
  if (body.website) return json({ note: null }, 201);

  const message = tidy(body.message);
  const name = tidy(body.name);
  if (!message || !name) return json({ error: "Please add a note and your name." }, 400);
  if (message.length > LIMITS.messageLength) return json({ error: `Notes can be up to ${LIMITS.messageLength} characters.` }, 400);
  if (name.length > LIMITS.nameLength) return json({ error: `Names can be up to ${LIMITS.nameLength} characters.` }, 400);
  if (hasLink(message) || hasLink(name)) return json({ error: "Links are not allowed in notes." }, 400);

  const now = new Date();
  const ago = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();
  const visitor = await visitorId(request);

  const counts = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN visitor = ?1 AND created_at > ?2 THEN 1 ELSE 0 END) AS mine_recent,
         SUM(CASE WHEN visitor = ?1 AND created_at > ?3 THEN 1 ELSE 0 END) AS mine_today,
         SUM(CASE WHEN created_at > ?4 THEN 1 ELSE 0 END) AS everyone_hour
       FROM notes WHERE created_at > ?3`
    )
    .bind(visitor, ago(10), ago(24 * 60), ago(60))
    .first();
  if ((counts?.mine_recent || 0) >= LIMITS.perPersonEvery10Minutes) return json({ error: "That was quick. Please wait a few minutes before posting again." }, 429);
  if ((counts?.mine_today || 0) >= LIMITS.perPersonPerDay) return json({ error: "You have reached today's limit for notes." }, 429);
  if ((counts?.everyone_hour || 0) >= LIMITS.everyonePerHour) return json({ error: "The wall is busy right now. Please try again later." }, 429);

  const colour = COLOURS.includes(body.colour) ? body.colour : COLOURS[Math.floor(Math.random() * COLOURS.length)];
  const createdAt = now.toISOString();
  await db.prepare("INSERT INTO notes (message, name, colour, created_at, visitor) VALUES (?, ?, ?, ?, ?)").bind(message, name, colour, createdAt, visitor).run();

  // The visitor marker is only needed for the limits above, so it is wiped after two days.
  await db.prepare("UPDATE notes SET visitor = '' WHERE visitor != '' AND created_at < ?").bind(ago(48 * 60)).run();

  return json({ note: publicNote({ message, name, colour, created_at: createdAt }) }, 201);
}

/* ---------- helpers ---------- */

let tableReady;
function ensureTable(db) {
  tableReady ??= db
    .prepare(
      `CREATE TABLE IF NOT EXISTS notes (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         message TEXT NOT NULL,
         name TEXT NOT NULL,
         colour TEXT NOT NULL,
         created_at TEXT NOT NULL,
         visitor TEXT NOT NULL DEFAULT ''
       )`
    )
    .run()
    .catch((error) => {
      tableReady = undefined;
      throw error;
    });
  return tableReady;
}

// What the page receives: never the visitor marker.
function publicNote(row) {
  const date = new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).replace(",", "");
  return { message: row.message, name: row.name, colour: COLOURS.includes(row.colour) ? row.colour : "purple", date };
}

// Trims the text, removes invisible control characters and squeezes runs of spaces and blank lines.
function tidy(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁠-⁯﻿]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function hasLink(text) {
  return /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz)\b)/i.test(text);
}

// A scrambled stand-in for the visitor's internet address, so the address itself is never stored.
async function visitorId(request) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("note-wall|" + address));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
