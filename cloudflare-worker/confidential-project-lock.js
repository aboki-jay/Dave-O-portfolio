/*
  cloudflare-worker/confidential-project-lock.js
  ----------------------------------------------
  Keeps the confidential case study behind a password.

  - Anything under /work/confidential-project/ comes here first.
  - The password is NOT stored in this project. It is a secret saved in Cloudflare
    called CONFIDENTIAL_PROJECT_PASSWORD. Until that secret is set, nobody can get in.
*/

const PROTECTED_PATH = "/work/confidential-project/";
const LOCKED_PAGE = "/work/confidential-project-locked/";
const COOKIE_NAME = "confidential_project_access";
const DAYS_REMEMBERED = 7;

export async function handleConfidentialProject(request, env) {
  const password = env.CONFIDENTIAL_PROJECT_PASSWORD || "";

  // Someone submitted the password form.
  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const attempt = form ? String(form.get("password") || "") : "";
    if (password && (await sameText(attempt, password))) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: PROTECTED_PATH,
          "Set-Cookie": `${COOKIE_NAME}=${await accessToken(password)}; Path=/work/confidential-project; Max-Age=${DAYS_REMEMBERED * 86400}; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      });
    }
    return lockedPage(request, env, { wrongPassword: true });
  }

  // Someone who already entered the right password.
  const cookie = readCookie(request, COOKIE_NAME);
  if (password && cookie && (await sameText(cookie, await accessToken(password)))) {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex");
    return new Response(response.body, { status: response.status, headers });
  }

  // Everyone else sees the password screen.
  return lockedPage(request, env, { wrongPassword: false });
}

async function lockedPage(request, env, { wrongPassword }) {
  const page = await env.ASSETS.fetch(new Request(new URL(LOCKED_PAGE, request.url), { method: "GET" }));
  const headers = new Headers(page.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex");
  const response = new Response(page.body, { status: wrongPassword ? 401 : 200, headers });
  if (!wrongPassword) return response;
  // Switch the screen to its "wrong password" state.
  return new HTMLRewriter()
    .on("[data-gate-field]", { element: (el) => el.setAttribute("class", "field field--error") })
    .on("[data-gate-error]", { element: (el) => el.removeAttribute("hidden") })
    .transform(response);
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const piece of header.split(";")) {
    const [key, ...rest] = piece.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

// The cookie holds a scrambled value derived from the password, never the password itself.
// Changing the password in Cloudflare signs everyone out.
async function accessToken(password) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("confidential-project-access-v1"));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Compares two pieces of text without revealing, through timing, how close a guess was.
async function sameText(a, b) {
  const [ha, hb] = await Promise.all([a, b].map((t) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))));
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}
