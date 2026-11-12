/*
  cloudflare-worker/worker.js
  ---------------------------
  The small amount of code that runs on Cloudflare itself (not in the visitor's browser).
  Almost the whole site is plain files and never touches this. Only two things come here:

    /work/confidential-project/...   the password-protected case study  -> confidential-project-lock.js
    /api/notes                       the note wall on the About page     -> note-wall.js

  Which addresses come here is set in wrangler.jsonc ("run_worker_first").
*/

import { handleConfidentialProject } from "./confidential-project-lock.js";
import { handleNotes } from "./note-wall.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/notes") return handleNotes(request, env);
    if (pathname.startsWith("/work/confidential-project")) return handleConfidentialProject(request, env);
    return env.ASSETS.fetch(request);
  },
};
