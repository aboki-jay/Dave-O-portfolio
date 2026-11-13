/*
  cloudflare-worker/worker.js
  ---------------------------
  The small amount of code that runs on Cloudflare itself (not in the visitor's browser).
  Almost the whole site is plain files and never touches this. Only these come here:

    /work/confidential-project/...   the password-protected case study   -> confidential-project-lock.js
    /api/notes                       the note wall on the About page      -> note-wall.js
    /about/ and /photos/...          photos from the Google Drive folder  -> about-photos.js

  Which addresses come here is set in wrangler.jsonc ("run_worker_first").
*/

import { handleConfidentialProject } from "./confidential-project-lock.js";
import { handleNotes } from "./note-wall.js";
import { handleAboutPage, handlePhoto } from "./about-photos.js";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/notes") return handleNotes(request, env);
    if (pathname.startsWith("/work/confidential-project")) return handleConfidentialProject(request, env);
    if (pathname === "/about/") return handleAboutPage(request, env, ctx);
    if (pathname.startsWith("/photos/")) return handlePhoto(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};
