/*
  site-sounds.js: the interface sounds.

  Sounds are made in the browser by an open source kit, @web-kits/audio by Raphael Salaja
  (MIT licence, kept in scripts/audio-kit). There are no audio files: each sound is a short
  recipe in sounds/core-sound-pack.json, the kit's own "core" pack.

  What plays:
    - a click when a button is pressed, a lighter tap for links
    - a two-note chirp for "copy email" and for the speaker button
    - a soft blip when the mouse moves onto a project name (Selected work) or a project tile (home)
    - a faint tick while the page scrolls
  The speaker button in the navigation turns everything off or on, and the choice is remembered.

  Browsers do not allow a page to make sound until the visitor has clicked, tapped or pressed a key.
  That is a browser rule and cannot be switched off, so right after a page loads (or is refreshed)
  scrolling is silent. The first tap, click or key press anywhere on the page starts the sound;
  it does not have to be on a button.
*/

const KIT_FILE = "/scripts/audio-kit/web-kits-audio.js";
const SOUND_PACK = "/sounds/core-sound-pack.json";
const STORAGE_KEY = "site-sound";

/* Settings you can ask to change */
const SOUND_ON_BY_DEFAULT = true; // what a first-time visitor gets
const OVERALL_VOLUME = 0.6; // 0 is silent, 1 is the pack's full volume
const SCROLL_TICK_EVERY = 140; // pixels of scrolling between ticks
const SCROLL_TICK_VOLUME = 0.45; // ticks are quieter than clicks

let soundOn = readChoice();
let kit = null;
let pack = null;
let loading = null;
let unlocked = false;

function readChoice() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "on") return true;
    if (saved === "off") return false;
  } catch (error) {
    /* private browsing: fall through to the default */
  }
  return SOUND_ON_BY_DEFAULT;
}

function saveChoice() {
  try {
    window.localStorage.setItem(STORAGE_KEY, soundOn ? "on" : "off");
  } catch (error) {
    /* the choice simply lasts for this page */
  }
}

/* Download the kit and the sound pack once, only when sound is wanted. */
function load() {
  loading ??= Promise.all([import(KIT_FILE), fetch(SOUND_PACK).then((response) => response.json())]).then(([module, data]) => {
    kit = module;
    pack = module.definePatch(data);
  });
  return loading;
}

/* Must be called from a click, tap or key press: that is when the browser lets sound start.
   When the kit has already been fetched, sound is started in the same instant as the press, which
   is what iPhones insist on. If the kit is still on its way, it is started as soon as it arrives. */
function unlock() {
  if (unlocked) return Promise.resolve();
  const start = () =>
    kit.ensureReady().then(() => {
      if (unlocked) return;
      kit.setMasterVolume(OVERALL_VOLUME);
      unlocked = true;
    });
  return kit ? start() : load().then(start);
}

function play(name, options, evenIfOff) {
  if (!soundOn && !evenIfOff) return;
  const go = () => {
    try {
      pack.play(name, options);
    } catch (error) {
      /* a missing sound should never break the page */
    }
  };
  if (unlocked) go();
  else unlock().then(go).catch(() => {});
}

/* ---------- Speaker button ---------- */

const toggles = Array.from(document.querySelectorAll("[data-sound-toggle]"));

function showChoice() {
  for (const button of toggles) {
    button.setAttribute("aria-pressed", String(soundOn));
    button.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    button.title = soundOn ? "Sound is on" : "Sound is off";
  }
}

for (const button of toggles) {
  button.addEventListener("click", () => {
    soundOn = !soundOn;
    saveChoice();
    showChoice();
    // Rising chirp for on; falling chirp for off (played once more, then silence).
    if (soundOn) play("toggle-on");
    else if (unlocked) play("toggle-off", undefined, true);
  });
}
showChoice();

/* ---------- Clicks and taps ---------- */

const PRESSABLE = "a[href], button, [role=button], summary, input[type=submit]";

function soundFor(element) {
  if (element.matches("[data-sound-toggle]")) return null; // the speaker button has its own sound
  if (element.matches("[data-copy-text]")) return "copy";
  if (element.matches("button, .button, input[type=submit]")) return "click";
  return "tap";
}

function pressed(target) {
  const element = target instanceof Element ? target.closest(PRESSABLE) : null;
  if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return;
  const name = soundFor(element);
  if (name) play(name, { jitter: { detune: 40, volume: 0.08 } });
}

// With a mouse the sound plays the moment the button goes down, so it is heard even when
// the click takes you to another page. Touch and keyboard use the normal click instead,
// so starting a scroll with a finger on a button stays silent.
let mouseHandledIt = false;
document.addEventListener(
  "pointerdown",
  (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    mouseHandledIt = true;
    pressed(event.target);
  },
  true
);
document.addEventListener("pointerup", () => setTimeout(() => (mouseHandledIt = false), 60), true);
document.addEventListener(
  "click",
  (event) => {
    if (mouseHandledIt) return;
    pressed(event.target);
  },
  true
);
// The first tap, click or key press anywhere on the page starts the sound, not only one on a
// button or link. Each of these counts as permission in one browser or another, so all are
// listened for until sound is running.
const STARTING_GESTURES = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
function startOnGesture() {
  if (!soundOn || unlocked) return;
  unlock()
    .then(() => {
      if (unlocked) for (const type of STARTING_GESTURES) window.removeEventListener(type, startOnGesture, true);
    })
    .catch(() => {});
}
for (const type of STARTING_GESTURES) window.addEventListener(type, startOnGesture, { capture: true, passive: true });

/* ---------- Hovering ---------- */

// Places where pointing with a mouse changes what is shown, and the sound each one makes:
//   - a project name on the Selected work page (the picture beside it switches)
//   - a project tile on the home page (the tile opens up)
//   - a tile on the Exploration page (its arrow appears)
const HOVER_SOUNDS = [
  { target: "[data-work-switcher] .project-row__title-row", sound: "tab-switch", volume: 0.6 },
  { target: ".work-tile", sound: "focus", volume: 1 },
  { target: ".exploration-tile", sound: "focus", volume: 1 },
];
// Same condition the stylesheet uses for these hover effects: a mouse, on a wide screen.
const hoverLayout = window.matchMedia("(hover: hover) and (min-width: 1100px)");
let hovered = null;

document.addEventListener(
  "pointerover",
  (event) => {
    if (event.pointerType !== "mouse" || !hoverLayout.matches || !(event.target instanceof Element)) return;
    for (const item of HOVER_SOUNDS) {
      const element = event.target.closest(item.target);
      if (!element) continue;
      if (element === hovered) return; // still on the same item
      hovered = element;
      // Hovering is not a click, so it can only make sound once sound has been unlocked.
      if (soundOn && unlocked) play(item.sound, { volume: item.volume, jitter: { detune: 30 } });
      return;
    }
    hovered = null; // moved onto something else, so coming back will sound again
  },
  true
);

/* ---------- Scrolling ---------- */

let lastScrollY = window.scrollY;
let travelled = 0;
let lastTickAt = 0;

window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    const distance = Math.abs(y - lastScrollY);
    lastScrollY = y;
    // Silent until sound is unlocked, and for sudden jumps (such as "back to top").
    if (!soundOn || !unlocked || distance > 1200) {
      travelled = 0;
      return;
    }
    travelled += distance;
    const now = performance.now();
    if (travelled >= SCROLL_TICK_EVERY && now - lastTickAt >= 45) {
      travelled = 0;
      lastTickAt = now;
      play("tick", { volume: SCROLL_TICK_VOLUME, jitter: { detune: 90, volume: 0.15 } });
    }
  },
  { passive: true }
);

/* Fetch the kit straight away, so it is ready by the time of the first tap or click.
   Then see whether the browser already allows sound. It usually does when the visitor arrived
   by clicking a link on this site, which lets hover and scroll sounds carry on from page to
   page without another click. If it does not (a refresh, or a first visit), the first tap,
   click or key press anywhere on the page starts it. */
async function tryEarlyUnlock() {
  await load();
  const started = await Promise.race([
    kit.ensureReady().then((context) => context && context.state === "running"),
    new Promise((resolve) => setTimeout(() => resolve(false), 400)),
  ]);
  if (started && !unlocked) {
    kit.setMasterVolume(OVERALL_VOLUME);
    unlocked = true;
  }
}
if (soundOn) tryEarlyUnlock().catch(() => {});
