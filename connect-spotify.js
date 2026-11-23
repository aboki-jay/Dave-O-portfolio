/*
  connect-spotify.js
  ------------------
  Run once (node connect-spotify.js) to let the website read what David is playing on Spotify.
  It is only needed again if the "Now playing" card stops working because Spotify cancelled the
  permission (for example after a password change).

  Before running it, the file .dev.vars in this folder must hold the two values from the app David
  made at https://developer.spotify.com/dashboard :
      SPOTIFY_CLIENT_ID=...
      SPOTIFY_CLIENT_SECRET=...
  and that app must list this exact Redirect URI:  http://127.0.0.1:8888/callback

  What happens:
    1. Spotify opens in the browser and asks David to agree to two things only:
       seeing what he is playing now, and what he played recently.
       (The playlists on the About page are public ones he named, which need no extra permission.)
    2. Spotify sends a one-time code back to this computer (nowhere else).
    3. That code is swapped for a long-lasting permission, saved in .dev.vars as SPOTIFY_REFRESH_TOKEN.
  Nothing secret is printed on screen, and .dev.vars is never uploaded (it is in .gitignore).
  Afterwards the same three values are added to Cloudflare as secrets so the live site can use them.
*/

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { exec } = require("child_process");

const SECRETS_FILE = path.join(__dirname, ".dev.vars");
const PORT = 8888;
const RETURN_ADDRESS = `http://127.0.0.1:${PORT}/callback`;
const ASKING_FOR = "user-read-currently-playing user-read-recently-played";
const MINUTES_TO_WAIT = 5;

function readSecrets() {
  const values = {};
  if (!fs.existsSync(SECRETS_FILE)) return values;
  for (const line of fs.readFileSync(SECRETS_FILE, "utf8").split(/\r?\n/)) {
    const found = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (found) values[found[1]] = found[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

// Puts NAME=value in .dev.vars, replacing an earlier line with the same name.
function saveSecret(name, value) {
  const lines = fs.existsSync(SECRETS_FILE) ? fs.readFileSync(SECRETS_FILE, "utf8").split(/\r?\n/) : [];
  const kept = lines.filter((line) => !new RegExp(`^\\s*${name}\\s*=`).test(line));
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  kept.push(`${name}=${value}`);
  fs.writeFileSync(SECRETS_FILE, kept.join("\n") + "\n");
}

const page = (heading, text) =>
  `<!doctype html><meta charset="utf-8"><title>${heading}</title><body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 16px;line-height:1.5"><h1 style="font-size:24px">${heading}</h1><p>${text}</p>`;

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = readSecrets();
if (!id || !secret) {
  console.log("Not ready yet: .dev.vars needs both SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET filled in.");
  process.exit(1);
}

const check = crypto.randomBytes(16).toString("hex"); // proves the answer belongs to this request
const askAddress =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: RETURN_ADDRESS, scope: ASKING_FOR, state: check, show_dialog: "true" });

const finish = (server, code, message) => {
  console.log(message);
  server.close();
  setTimeout(() => process.exit(code), 300);
};

const server = http.createServer(async (request, response) => {
  const asked = new URL(request.url, RETURN_ADDRESS);
  if (asked.pathname !== "/callback") {
    response.writeHead(404).end();
    return;
  }
  const send = (heading, text) => response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page(heading, text));
  if (asked.searchParams.get("state") !== check) {
    send("Not connected", "This answer did not match the request. Close this tab and run the connection again.");
    return finish(server, 1, "Not connected: the answer did not match the request.");
  }
  if (asked.searchParams.get("error") || !asked.searchParams.get("code")) {
    send("Not connected", "Spotify did not give permission. Close this tab and run the connection again if you want to retry.");
    return finish(server, 1, "Not connected: permission was not given (" + (asked.searchParams.get("error") || "no code") + ").");
  }
  try {
    const reply = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: asked.searchParams.get("code"), redirect_uri: RETURN_ADDRESS }),
    });
    const data = await reply.json().catch(() => ({}));
    if (!reply.ok || !data.refresh_token) throw new Error(`Spotify answered ${reply.status}${data.error ? " (" + data.error + ")" : ""}`);
    saveSecret("SPOTIFY_REFRESH_TOKEN", data.refresh_token);
    send("Spotify is connected", "You can close this tab and go back to Claude.");
    finish(server, 0, "Connected. The permission is saved in .dev.vars as SPOTIFY_REFRESH_TOKEN.");
  } catch (error) {
    send("Not connected", "Something went wrong while finishing the connection. Close this tab and go back to Claude.");
    finish(server, 1, "Not connected: " + (error.message || error));
  }
});

server.on("error", (error) => {
  console.log(`Could not start (${error.code || error.message}). Something else may be using port ${PORT}.`);
  process.exit(1);
});
server.listen(PORT, "127.0.0.1", () => {
  console.log("Opening Spotify in your browser. Log in if asked, then click Agree.");
  console.log("If nothing opens, copy this address into your browser:\n" + askAddress);
  const opener = process.platform === "win32" ? `start "" "${askAddress}"` : process.platform === "darwin" ? `open "${askAddress}"` : `xdg-open "${askAddress}"`;
  exec(opener, () => {});
  setTimeout(() => finish(server, 1, `Stopped waiting after ${MINUTES_TO_WAIT} minutes. Run it again when you are ready.`), MINUTES_TO_WAIT * 60000).unref();
});
