/*
  cloudflare-worker/now-playing.js
  --------------------------------
  Tells the About page what David is listening to on Spotify, and which playlists he has made.

    GET /api/now-playing   the song playing right now, or else the last song he played
    GET /api/playlists     the playlists David chose to show (listed in playlists-to-show.js), in his order

  The answers are small pieces of data the page turns into the "Now playing" row and the playlist list:
    { state: "playing" | "last" | "off", name, artists, album, year, length, cover, url, playedAt }
    { state: "ok" | "off", playlists: [{ name, songs, cover, url }] }
  "off" means there is nothing to show (not set up, or Spotify could not be reached); that part of the
  page then stays hidden. The page shows a song's name, artists and cover; the rest is there if the
  design ever wants it.

  Which playlists: only the ones named in playlists-to-show.js. Their name, cover and number of songs
  are read from Spotify each time, and one that David has set to private is skipped.

  It needs three secrets, saved in Cloudflare (and in .dev.vars for the preview on your own computer):
    SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET   from the app David made at developer.spotify.com
    SPOTIFY_REFRESH_TOKEN                      made once by running "node connect-spotify.js"
  Spotify only allows this while the account that owns that app has Premium.
  None of the three ever reaches the visitor's browser: only the details above do.
*/

import { PLAYLISTS_TO_SHOW } from "./playlists-to-show.js";

const SECONDS_BEFORE_ASKING_ABOUT_THE_SONG_AGAIN = 30; // however many people open the page, Spotify is asked at most this often
const SECONDS_BEFORE_ASKING_ABOUT_PLAYLISTS_AGAIN = 600; // a new or renamed playlist shows up within ten minutes
const BROWSER_KEEPS_FOR_SECONDS = 30; // how long a visitor's own browser may reuse an answer before asking the site again
const SONG_COVER_WIDTH = 64; // shown small, at the centre of the record
const PLAYLIST_COVER_WIDTH = 120; // shown at 40px; this stays sharp on phone screens
const MOST_PLAYLISTS = 30; // each one is a separate question to Spotify, so keep the list reasonable

// Spotify hands out a pass that works for an hour. It is kept here, in memory, until it runs out.
let pass = { value: "", until: 0 };

export function handleNowPlaying(request, env, ctx) {
  return answerFromSpotify(request, env, ctx, "/api/now-playing", SECONDS_BEFORE_ASKING_ABOUT_THE_SONG_AGAIN, whatIsPlaying);
}

export function handlePlaylists(request, env, ctx) {
  return answerFromSpotify(request, env, ctx, "/api/playlists", SECONDS_BEFORE_ASKING_ABOUT_PLAYLISTS_AGAIN, chosenPlaylists);
}

// The shared routine: hand back the answer kept from a moment ago, or ask Spotify and keep the new one.
async function answerFromSpotify(request, env, ctx, address, seconds, ask) {
  if (request.method !== "GET") return json({ state: "off" }, BROWSER_KEEPS_FOR_SECONDS, 405);
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) return json({ state: "off" }, BROWSER_KEEPS_FOR_SECONDS);

  const shelf = caches.default;
  const label = new Request(new URL(address, request.url).toString());
  const kept = await shelf.match(label);
  if (kept) {
    // Cloudflare relabels a saved answer as "keep for 4 hours" on its way out, which would leave a
    // visitor's browser showing an old song. Put our own, short label back on it.
    const fresh = new Response(kept.body, kept);
    fresh.headers.set("Cache-Control", `public, max-age=${BROWSER_KEEPS_FOR_SECONDS}`);
    return fresh;
  }

  let answer;
  try {
    answer = await ask(await spotifyReader(env));
  } catch (error) {
    console.error(`${address}:`, error.message || error);
    answer = { state: "off" };
  }
  // When something went wrong (nothing came back, or a playlist was left out), try again soon rather
  // than keeping a poor answer for ten minutes.
  const { incomplete, ...shown } = answer;
  const keepFor = answer.state === "off" || incomplete ? Math.min(seconds, 60) : seconds;
  ctx.waitUntil(shelf.put(label, json(shown, keepFor))); // how long Cloudflare keeps it
  return json(shown, Math.min(keepFor, BROWSER_KEEPS_FOR_SECONDS)); // how long the visitor's browser may
}

async function accessPass(env) {
  if (pass.value && Date.now() < pass.until) return pass.value;
  const reply = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!reply.ok) throw new Error(`Spotify would not renew the connection (${reply.status}). Run "node connect-spotify.js" again.`);
  const data = await reply.json();
  pass = { value: data.access_token, until: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000 };
  return pass.value;
}

// Gives back a function that reads one address from Spotify with the current pass.
async function spotifyReader(env) {
  const headers = { Authorization: "Bearer " + (await accessPass(env)) };
  return async (address) => {
    const reply = await fetch("https://api.spotify.com/v1" + address, { headers });
    if (reply.status === 401) pass = { value: "", until: 0 }; // the pass was turned down: get a new one next time
    if (reply.status === 204) return null; // nothing to report (nothing is playing)
    if (!reply.ok) throw new Error(`Spotify answered ${reply.status} for ${address}`);
    return reply.json();
  };
}

async function whatIsPlaying(fromSpotify) {
  // 1. Something playing, or paused part-way through?
  const now = await fromSpotify("/me/player/currently-playing");
  const song = now && now.currently_playing_type === "track" ? now.item : null;
  if (song) return describe(song, now.is_playing ? "playing" : "last", "");

  // 2. Otherwise the last song that was played.
  const recent = await fromSpotify("/me/player/recently-played?limit=1");
  const last = recent && recent.items && recent.items[0];
  if (last && last.track) return describe(last.track, "last", last.played_at || "");

  return { state: "off" };
}

function describe(song, state, playedAt) {
  const album = song.album || {};
  const artists = Array.isArray(song.artists) ? song.artists : [];
  const seconds = Math.round(Number(song.duration_ms || 0) / 1000);
  return {
    state,
    name: song.name || "",
    artists: artists.map((artist) => artist.name).filter(Boolean).join(", "),
    album: album.name || "",
    year: String(album.release_date || "").slice(0, 4),
    length: seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "",
    cover: pickPicture(album.images, SONG_COVER_WIDTH),
    url: (song.external_urls && song.external_urls.spotify) || "https://open.spotify.com/",
    playedAt,
  };
}

async function chosenPlaylists(fromSpotify) {
  // The links in playlists-to-show.js end in the playlist's code, for example .../playlist/3p0Lp423rk0yg7WVqy1DYY
  const codes = PLAYLISTS_TO_SHOW.map((link) => (String(link).match(/playlist[/:]([A-Za-z0-9]{22})/) || [])[1]).filter(Boolean);
  const wanted = "name,public,images,external_urls,items(total),tracks(total)"; // Spotify renamed "tracks" to "items" in 2026
  // Ask for them one at a time (gentler on Spotify than all at once), and try a second time if one fails.
  // A playlist that still fails is left out this time, so one hiccup does not empty the whole list.
  const readOne = async (code) => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await fromSpotify(`/playlists/${code}?fields=${encodeURIComponent(wanted)}`);
      } catch (error) {
        if (attempt === 2) console.error("playlist left out this time:", error.message || error);
        else await new Promise((resume) => setTimeout(resume, 400));
      }
    }
    return undefined;
  };
  const found = [];
  for (const code of [...new Set(codes)].slice(0, MOST_PLAYLISTS)) found.push(await readOne(code));
  const leftOut = found.filter((playlist) => playlist === undefined).length;
  const playlists = found
    // A playlist David has set to private stops here, even if it is on the list.
    .filter((playlist) => playlist && playlist.public !== false)
    .map((playlist) => {
      const count = (playlist.items && playlist.items.total) ?? (playlist.tracks && playlist.tracks.total);
      return {
        name: playlist.name || "",
        songs: Number.isFinite(Number(count)) ? Number(count) : null,
        cover: pickPicture(playlist.images, PLAYLIST_COVER_WIDTH),
        url: (playlist.external_urls && playlist.external_urls.spotify) || "",
      };
    })
    .filter((playlist) => playlist.name && /^https:\/\/open\.spotify\.com\//.test(playlist.url));
  return { state: "ok", playlists, incomplete: leftOut > 0 };
}

// Spotify offers each picture in a few sizes. Take the smallest one that is at least as wide as wanted.
function pickPicture(pictures, wanted) {
  const list = (Array.isArray(pictures) ? pictures : []).filter((picture) => picture && picture.url);
  if (!list.length) return "";
  const bigEnough = list.filter((picture) => Number(picture.width || 0) >= wanted).sort((a, b) => a.width - b.width);
  const chosen = bigEnough[0] || list.slice().sort((a, b) => Number(b.width || 0) - Number(a.width || 0))[0];
  return /^https:\/\//.test(chosen.url) ? chosen.url : "";
}

function json(data, seconds, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${seconds}`,
      "X-Robots-Tag": "noindex",
    },
  });
}
