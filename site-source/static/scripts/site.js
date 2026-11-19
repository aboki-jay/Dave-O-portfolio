/*
  site.js: the small interactions on the site. No libraries.
  Each block below looks for its own piece of the page and does nothing if it is not there.
*/
(function () {
  "use strict";

  /* A light tap you can feel, on phones that can do it.
     Android phones use their vibration motor. iPhones do not let websites vibrate, but Safari gives
     a small tick whenever a switch is flipped, so a hidden switch is flipped for a moment instead.
     On anything else (computers, older phones) this quietly does nothing. */
  var haptic = function () {
    try {
      if (navigator.vibrate) { navigator.vibrate(10); return; }
      var label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.display = "none";
      var flip = document.createElement("input");
      flip.type = "checkbox";
      flip.setAttribute("switch", "");
      label.appendChild(flip);
      document.head.appendChild(label);
      label.click();
      document.head.removeChild(label);
    } catch (error) { /* no haptics here, which is fine */ }
  };

  /* Phone menu: a sheet that slides up from the bottom. It closes with the x, a tap on the blurred
     page behind it, a pull down on its handle, the Escape key, or by choosing a link. */
  var menuButton = document.querySelector("[data-menu-button]");
  var nav = document.getElementById("site-nav");
  if (menuButton && nav) {
    var backdrop = document.querySelector("[data-menu-backdrop]");
    var closeButton = nav.querySelector("[data-menu-close]");
    var handle = nav.querySelector("[data-menu-handle]");
    var sheetProjects = Array.prototype.slice.call(nav.querySelectorAll("[data-sheet-project]"));
    var phone = window.matchMedia("(max-width: 767px)");
    var isOpen = function () { return nav.classList.contains("is-open"); };
    /* Inside the sheet, Work shows the projects one at a time instead of leaving the page.
       showProject(2) shows the third project; showProject(-1) goes back to the list of links. */
    var showProject = function (index) {
      var showing = index >= 0 && sheetProjects.length > 0;
      nav.classList.toggle("is-work", showing);
      sheetProjects.forEach(function (project, position) { project.hidden = !showing || position !== index; });
      if (!showing) return;
      var body = sheetProjects[index].querySelector(".sheet-project__body");
      if (body) body.scrollTop = 0;
      var close = sheetProjects[index].querySelector("[data-menu-close]");
      if (close) close.focus({ preventScroll: true });
    };
    var setMenu = function (open, quiet) {
      if (open === isOpen()) return;
      if (open) showProject(-1); // the sheet always opens on the list of links
      nav.classList.toggle("is-open", open);
      nav.style.transform = "";
      if (backdrop) backdrop.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("has-open-menu", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (!quiet) haptic();
      if (open && closeButton) closeButton.focus({ preventScroll: true });
      if (!open && !quiet && nav.contains(document.activeElement)) menuButton.focus({ preventScroll: true });
    };
    menuButton.addEventListener("click", function () { setMenu(!isOpen()); });
    if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
    nav.addEventListener("click", function (event) {
      if (!isOpen()) return;
      if (event.target.closest("[data-menu-close]")) { setMenu(false); return; }
      // "Next: …" moves to the following project, and after the last one back to the first.
      if (event.target.closest("[data-sheet-next]")) {
        var showingNow = sheetProjects.findIndex(function (project) { return !project.hidden; });
        haptic();
        showProject((showingNow + 1) % sheetProjects.length);
        return;
      }
      // Work stays in the sheet and shows the first project. Every other link leaves as usual.
      if (event.target.closest("[data-sheet-work]") && sheetProjects.length && phone.matches) {
        event.preventDefault();
        haptic();
        showProject(0);
        return;
      }
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenu(false);
    });
    // Turning the phone or widening the window past phone size puts the links back in the header row.
    var leavePhone = function () { if (!phone.matches) setMenu(false, true); };
    if (phone.addEventListener) phone.addEventListener("change", leavePhone);

    // Pull the handle down to close: the sheet follows the finger, and lets go past 80px closes it.
    if (handle) {
      var dragFrom = null;
      var pulled = 0;
      handle.addEventListener("pointerdown", function (event) {
        if (!isOpen()) return;
        dragFrom = event.clientY;
        pulled = 0;
        nav.classList.add("is-dragging");
        if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", function (event) {
        if (dragFrom === null) return;
        pulled = Math.max(0, event.clientY - dragFrom);
        nav.style.transform = "translateY(" + pulled + "px)";
      });
      var endDrag = function () {
        if (dragFrom === null) return;
        dragFrom = null;
        nav.classList.remove("is-dragging");
        if (pulled > 80) setMenu(false);
        else nav.style.transform = "";
      };
      handle.addEventListener("pointerup", endDrag);
      handle.addEventListener("pointercancel", endDrag);
    }
  }

  /* Image rows (the Resume page): on phones, tapping an image shows it full size over the page.
     A tap anywhere outside the image, the x button or the Escape key puts things back. */
  var imageRows = document.querySelectorAll("[data-image-row]");
  var caseStudyPage = document.querySelector(".case-study");
  var explorationList = document.querySelector("[data-exploration-list]");
  var showFullView = null; // set just below; lets the Exploration board show a picture full size too
  if (imageRows.length || caseStudyPage || explorationList) {
    var viewerPhone = window.matchMedia("(max-width: 767px)");
    var viewer = null;
    var cameFrom = null;
    var closeViewer = function () {
      if (!viewer) return;
      var closing = viewer;
      viewer = null;
      closing.classList.remove("is-open");
      document.documentElement.classList.remove("has-open-viewer");
      haptic();
      window.setTimeout(function () { closing.remove(); }, 220);
      if (cameFrom && cameFrom.focus) cameFrom.focus({ preventScroll: true });
    };
    var openViewer = function (item) {
      if (viewer) return;
      cameFrom = item;
      viewer = document.createElement("div");
      viewer.className = "image-viewer";
      viewer.setAttribute("role", "dialog");
      viewer.setAttribute("aria-modal", "true");
      viewer.setAttribute("aria-label", "Image, full view");
      var close = document.createElement("button");
      close.type = "button";
      close.className = "image-viewer__close";
      close.setAttribute("aria-label", "Close full view");
      close.innerHTML = '<img src="/icons/icon-x-16.svg" width="16" height="16" alt="">';
      // A tile holds a cropped screenshot; the full view shows the whole screenshot, uncropped.
      var picture = item.tagName === "IMG" ? item : item.querySelector("img");
      var large = (picture || item).cloneNode(true);
      large.className = picture ? "image-viewer__item" : large.className + " image-viewer__item";
      large.removeAttribute("style");
      // A very tall screenshot (a long phone screen) is shown at full width and scrolled, so it stays readable.
      if (picture && Number(picture.getAttribute("height")) > 2 * Number(picture.getAttribute("width"))) viewer.classList.add("is-tall");
      large.removeAttribute("role");
      large.removeAttribute("tabindex");
      large.removeAttribute("aria-label");
      if (large.tagName === "IMG") { large.removeAttribute("loading"); large.sizes = "100vw"; } // lets the browser fetch a sharper copy
      viewer.appendChild(close);
      viewer.appendChild(large);
      // Anything that is not the image itself counts as "outside".
      viewer.addEventListener("click", function (event) {
        if (event.target.closest(".image-viewer__item")) return;
        closeViewer();
      });
      document.body.appendChild(viewer);
      document.documentElement.classList.add("has-open-viewer");
      haptic();
      viewer.offsetWidth; // lets the fade-in start from invisible
      viewer.classList.add("is-open");
      close.focus({ preventScroll: true });
    };
    showFullView = openViewer;
    imageRows.forEach(function (row) {
      row.addEventListener("click", function (event) {
        if (!viewerPhone.matches) return;
        var item = event.target.closest("[data-image-row] > *");
        if (item) openViewer(item);
      });
      row.addEventListener("keydown", function (event) {
        if (!viewerPhone.matches || (event.key !== "Enter" && event.key !== " ")) return;
        var item = event.target.closest("[data-image-row] > *");
        if (item) { event.preventDefault(); openViewer(item); }
      });
    });
    // Case study pictures: a click on any of them shows it full size, on every screen size.
    if (caseStudyPage) {
      caseStudyPage.addEventListener("click", function (event) {
        var target = event.target;
        if (target && target.tagName === "IMG" && target.closest(".case-visual--image, .case-gallery__slide--image")) openViewer(target);
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeViewer();
    });
  }

  /* "Copy email" buttons */
  document.querySelectorAll("[data-copy-text]").forEach(function (button) {
    button.addEventListener("click", function () {
      var text = button.getAttribute("data-copy-text");
      var label = button.querySelector("[data-copy-label]");
      var status = button.parentNode.querySelector("[data-copy-status]");
      if (button.classList.contains("is-copied")) return;
      var original = label ? label.textContent : button.getAttribute("aria-label");
      var done = function () {
        // "is-copied" lets the stylesheet swap the button to its green "Copied" state.
        button.classList.add("is-copied");
        if (label) label.textContent = "Copied";
        else button.setAttribute("aria-label", "Copied");
        if (status) status.textContent = "Email address copied";
        setTimeout(function () {
          button.classList.remove("is-copied");
          if (label) label.textContent = original;
          else button.setAttribute("aria-label", original);
          if (status) status.textContent = "";
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          window.prompt("Copy this email address:", text);
        });
      } else {
        window.prompt("Copy this email address:", text);
      }
    });
  });

  /* Home page "Kind words": "Next note" lifts the top note off the pile and shows the one beneath */
  var kindNotes = document.querySelector("[data-kind-notes]");
  if (kindNotes) {
    var notes = Array.prototype.slice.call(kindNotes.querySelectorAll(".kind-note"));
    var nextButton = document.querySelector("[data-next-note]");
    var numberLabel = document.querySelector("[data-note-number]");
    var totalLabel = document.querySelector("[data-note-total]");
    var twoDigits = function (n) { return (n < 10 ? "0" : "") + n; };
    var currentNote = 0;
    if (totalLabel) totalLabel.textContent = twoDigits(notes.length);
    if (nextButton && notes.length < 2) nextButton.hidden = true;
    if (nextButton) {
      nextButton.addEventListener("click", function () {
        var leaving = notes[currentNote];
        currentNote = (currentNote + 1) % notes.length;
        notes.forEach(function (note) { note.classList.remove("is-leaving"); });
        leaving.classList.remove("is-active");
        leaving.classList.add("is-leaving");
        notes[currentNote].classList.add("is-active");
        if (numberLabel) numberLabel.textContent = twoDigits(currentNote + 1);
        setTimeout(function () { leaving.classList.remove("is-leaving"); }, 400);
      });
    }
  }

  /* Selected work (desktop): pointing at a project name shows its picture */
  var switcher = document.querySelector("[data-work-switcher]");
  if (switcher) {
    var rows = Array.prototype.slice.call(switcher.querySelectorAll(".project-row"));
    var activate = function (row) {
      rows.forEach(function (r) { r.classList.toggle("is-active", r === row); });
    };
    rows.forEach(function (row) {
      var titleRow = row.querySelector(".project-row__title-row");
      if (!titleRow) return;
      titleRow.addEventListener("mouseenter", function () { activate(row); });
      row.addEventListener("focusin", function () { activate(row); });
    });
    if (rows.length) activate(rows[0]);

    /* Desktop: scrolling the page also steps through the projects, one at a time. The list is given
       extra room to scroll through (a little over a quarter of the screen per project) and stays in
       place meanwhile. Pointing at a name still works, and so does the keyboard. On phones and
       tablets, and on a screen too short to hold the whole list, none of this happens. */
    var track = switcher.parentElement && switcher.parentElement.hasAttribute("data-work-scroll") ? switcher.parentElement : null;
    if (track && rows.length > 1) {
      var stepLayout = window.matchMedia("(hover: hover) and (min-width: 1100px)");
      var stepping = false;
      var stepSize = 0;
      var stickTop = 0;
      var stepIndex = 0;
      var stepToScroll = function () {
        if (!stepping) return;
        var travelled = stickTop - track.getBoundingClientRect().top; // 0 at the moment the list stops moving
        var index = Math.max(0, Math.min(rows.length - 1, Math.round(travelled / stepSize)));
        if (index !== stepIndex) { stepIndex = index; activate(rows[index]); }
      };
      var setUpSteps = function () {
        track.classList.remove("is-stepping");
        track.style.height = "";
        var listHeight = switcher.offsetHeight;
        stepping = stepLayout.matches && window.innerHeight >= listHeight + 32;
        if (!stepping) return;
        stepSize = Math.round(window.innerHeight * 0.28);
        stickTop = Math.max(16, Math.round((window.innerHeight - listHeight) / 2));
        track.style.setProperty("--stick-top", stickTop + "px");
        // Half a step extra at the end, so the last project stays on screen for a moment before the page ends.
        track.style.height = listHeight + Math.round((rows.length - 0.5) * stepSize) + "px";
        track.classList.add("is-stepping");
        stepToScroll();
      };
      var stepsTimer = null;
      window.addEventListener("scroll", stepToScroll, { passive: true });
      window.addEventListener("resize", function () {
        window.clearTimeout(stepsTimer);
        stepsTimer = window.setTimeout(setUpSteps, 120);
      });
      if (stepLayout.addEventListener) stepLayout.addEventListener("change", setUpSteps);
      setUpSteps();
    }
  }

  /* Case study: contents list, reading progress and the current section */
  var contentsToggle = document.querySelector("[data-contents-toggle]");
  if (contentsToggle) {
    var list = document.getElementById(contentsToggle.getAttribute("aria-controls"));
    var progress = document.querySelector("[data-reading-progress]");
    var article = document.querySelector(".case-study");
    var links = Array.prototype.slice.call(list.querySelectorAll("a"));
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var narrow = window.matchMedia("(max-width: 1099px)");
    var setContents = function (open) {
      contentsToggle.setAttribute("aria-expanded", String(open));
      list.hidden = !open;
    };
    setContents(!narrow.matches);
    if (narrow.addEventListener) narrow.addEventListener("change", function () { setContents(!narrow.matches); });
    contentsToggle.addEventListener("click", function () {
      setContents(contentsToggle.getAttribute("aria-expanded") !== "true");
    });
    list.addEventListener("click", function (event) {
      if (event.target.closest("a") && narrow.matches) setContents(false);
    });
    /* Desktop: the pictures move into one "stage" pinned to the right half of the screen.
       As each section reaches the reading line the stage cross-fades to that section's picture.
       A section with no picture leaves the previous one in place. */
    var rowsWrap = article.querySelector(".case-rows");
    var railItems = Array.prototype.slice.call(article.querySelectorAll(".case-rail__inner > *"));
    var wide = window.matchMedia("(min-width: 1100px)");
    var stage = null;
    var stageFrames = [];
    var buildStage = function () {
      if (stage || !rowsWrap) return;
      stage = document.createElement("div");
      stage.className = "case-stage";
      stage.style.gridRow = "1 / span " + sections.length;
      stageFrames = sections.map(function (section, index) {
        var visual = section ? section.querySelector(".case-row__visual") : null;
        if (visual) stage.appendChild(visual);
        if (section) section.style.gridRow = String(index + 1); // keeps each section in its own row beside the stage
        return visual;
      });
      ["top", "bottom"].forEach(function (edge) {
        var fade = document.createElement("div");
        fade.className = "case-fade case-fade--" + edge;
        fade.style.gridRow = "1 / span " + sections.length;
        rowsWrap.appendChild(fade);
      });
      rowsWrap.appendChild(stage);
      article.classList.add("has-stage");
    };
    var removeStage = function () {
      if (!stage) return;
      stageFrames.forEach(function (visual, index) {
        if (sections[index]) sections[index].style.gridRow = "";
        if (!visual) return;
        visual.classList.remove("is-active");
        sections[index].appendChild(visual);
      });
      rowsWrap.querySelectorAll(".case-fade").forEach(function (fade) { fade.remove(); });
      stage.remove();
      stage = null;
      article.classList.remove("has-stage");
    };
    var showStageFor = function (current) {
      if (!stage) return;
      var active = null;
      for (var i = current; i >= 0 && !active; i--) active = stageFrames[i];
      if (!active) active = stageFrames.filter(Boolean)[0];
      stageFrames.forEach(function (visual) {
        if (visual) visual.classList.toggle("is-active", visual === active);
      });
    };

    var ticking = false;
    var update = function () {
      ticking = false;
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var read = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      if (progress) progress.textContent = Math.round(read * 100) + "%";
      var current = 0;
      sections.forEach(function (section, index) {
        if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.4) current = index;
      });
      links.forEach(function (a, index) {
        if (index === current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      showStageFor(current);
      /* Desktop: the Back button and contents list fade away once the end of the case study
         (where "Next project" begins) scrolls up to them, so they never sit on top of it. */
      railItems.forEach(function (item) {
        var pastEnd = wide.matches && item.getBoundingClientRect().bottom + 24 > rect.bottom;
        item.classList.toggle("is-past-end", pastEnd);
      });
    };
    /* On screens wider than the page (1440px), stretch the grey stage out to the right edge
       of the window so it fills the side instead of stopping short. */
    var fitStage = function () {
      if (!stage) return;
      stage.style.marginRight = "";
      var gap = document.documentElement.clientWidth - rowsWrap.getBoundingClientRect().right;
      if (gap > 0) stage.style.marginRight = -gap + "px";
    };
    var syncStage = function () {
      if (wide.matches) buildStage();
      else removeStage();
      fitStage();
      update();
    };
    if (wide.addEventListener) wide.addEventListener("change", syncStage);
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", syncStage);
    syncStage();
  }

  /* Case study galleries with more than one picture: the arrow shows the next one, and after
     the last it goes back to the first. The caption under the gallery changes with the picture. */
  document.addEventListener("click", function (event) {
    var arrow = event.target.closest ? event.target.closest("[data-gallery-next]") : null;
    if (!arrow) return;
    var gallery = arrow.closest("[data-gallery]");
    if (!gallery) return;
    var slides = Array.prototype.slice.call(gallery.querySelectorAll(".case-gallery__slide"));
    var current = Math.max(0, slides.findIndex(function (slide) { return slide.classList.contains("is-current"); }));
    var next = (current + 1) % slides.length;
    slides[current].classList.remove("is-current");
    slides[next].classList.add("is-current");
    var caption = gallery.querySelector("[data-gallery-caption]");
    if (caption) caption.textContent = slides[next].getAttribute("data-caption") || "";
    var count = gallery.querySelector("[data-gallery-count]");
    if (count) count.textContent = next + 1 + " / " + slides.length;
  });

  /* Case study videos play silently on a loop, like a GIF, but only while they can be seen:
     on screen, in the picture area that is currently showing, and on the current gallery slide.
     Visitors who ask their device to reduce motion get a paused video with play controls instead. */
  var loopVideos = Array.prototype.slice.call(document.querySelectorAll("video[data-autoplay]"));
  if (loopVideos.length) {
    var calmer = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canBeSeen = function (video) {
      var box = video.getBoundingClientRect();
      if (!box.width || !box.height) return false; // on a gallery slide that is not showing
      if (box.bottom < 0 || box.top > window.innerHeight) return false;
      var frame = video.closest(".case-stage .case-row__visual");
      return !frame || frame.classList.contains("is-active");
    };
    var checkVideos = function () {
      loopVideos.forEach(function (video) {
        if (canBeSeen(video)) {
          if (video.preload === "none") video.preload = "metadata";
          if (!calmer && video.paused) { var started = video.play(); if (started && started.catch) started.catch(function () {}); }
        } else if (!video.paused) {
          video.pause();
        }
      });
    };
    if (calmer) loopVideos.forEach(function (video) { video.controls = true; });
    var videoTimer = null;
    var checkVideosSoon = function () {
      if (videoTimer) return;
      videoTimer = window.setTimeout(function () { videoTimer = null; checkVideos(); }, 150);
    };
    window.addEventListener("scroll", checkVideosSoon, { passive: true });
    window.addEventListener("resize", checkVideosSoon);
    document.addEventListener("click", function () { window.setTimeout(checkVideos, 60); });
    window.setInterval(checkVideos, 1000); // the pinned picture area fades between sections without a scroll event of its own
    checkVideos();
  }

  /* About page: highlight the side-menu item for the section in view */
  var tabs = document.querySelector("[data-section-tabs]");
  if (tabs && "IntersectionObserver" in window) {
    var tabLinks = Array.prototype.slice.call(tabs.querySelectorAll("a"));
    var visible = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible[entry.target.id] = entry.isIntersecting; });
      var first = tabLinks.find(function (a) { return visible[a.getAttribute("href").slice(1)]; });
      if (!first) return;
      tabLinks.forEach(function (a) {
        if (a === first) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -55% 0px" });
    tabLinks.forEach(function (a) {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (target) observer.observe(target);
    });
  }

  /* Exploration page: an endless board of tiles (the layout of maybepratik.com/work).
     The explorations are written in the page as an ordinary list (site-source/pages/exploration.html).
     Here each one becomes a tile on a board that repeats in every direction. The board is moved by
     dragging it, with the mouse wheel or trackpad, or with the arrow keys.
       - Mouse: a small card follows the pointer with the name, the description and what a click does.
         A click opens the exploration's link, or shows its picture full size if it has no link.
       - Touch: a tap on a tile shows the same card at the bottom of the screen, with a View button.
     Without this script the page simply shows the list as a grid. */
  if (explorationList) {
    var explorationFigures = Array.prototype.slice.call(explorationList.querySelectorAll(".exploration-tile"));
    var explorations = explorationFigures.map(function (figure) {
      var link = figure.querySelector("a.exploration-tile__link");
      var nameHolder = figure.querySelector(".exploration-tile__link");
      var aboutHolder = figure.querySelector(".exploration-tile__about");
      var media = figure.querySelector(".exploration-tile__media");
      var picture = media ? media.querySelector("img, video") : null;
      return {
        id: figure.id || "",
        name: nameHolder ? nameHolder.textContent.trim() : "",
        about: aboutHolder ? aboutHolder.textContent.trim() : "",
        href: link ? link.getAttribute("href") : "",
        picture: picture,
        note: !picture && media ? media.textContent.trim() : "",
      };
    });

    if (explorations.length) {
      var TILE_GAP = 4; // the thin line between tiles
      var ARROW_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
      var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      var boardHost = explorationList.closest("main") || document.body;
      var board = document.createElement("div");
      board.className = "exploration-canvas";
      board.tabIndex = 0;
      board.setAttribute("role", "group");
      board.setAttribute("aria-label", "Board of explorations. Drag, scroll or use the arrow keys to move around it. The same explorations are listed after the board.");
      var plane = document.createElement("div");
      plane.className = "exploration-canvas__plane";
      plane.setAttribute("aria-hidden", "true");
      var hint = document.createElement("p");
      hint.className = "exploration-canvas__hint";
      hint.setAttribute("aria-hidden", "true");
      hint.textContent = window.matchMedia("(hover: hover)").matches ? "Scroll or drag to explore" : "Drag to explore";
      board.appendChild(plane);
      board.appendChild(hint);
      boardHost.insertBefore(board, explorationList);
      explorationList.classList.add("visually-hidden");
      document.documentElement.classList.add("has-exploration-canvas");

      // The card with the name, description and link.
      var card = document.createElement("div");
      card.className = "exploration-card";
      card.innerHTML = '<p class="exploration-card__name"></p><p class="exploration-card__about"></p><a class="exploration-card__view" target="_blank" rel="noopener"><span></span>' + ARROW_ICON + "</a>";
      document.body.appendChild(card);
      var cardName = card.querySelector(".exploration-card__name");
      var cardAbout = card.querySelector(".exploration-card__about");
      var cardView = card.querySelector(".exploration-card__view");
      var cardFor = null;
      var showCard = function (entry, pinned) {
        if (cardFor !== entry || card.classList.contains("is-pinned") !== pinned) {
          cardFor = entry;
          cardName.textContent = entry.name;
          cardAbout.textContent = entry.about;
          cardAbout.hidden = !entry.about;
          if (entry.href) {
            cardView.hidden = false;
            cardView.setAttribute("href", entry.href);
            cardView.firstChild.textContent = pinned ? "View" : "Click to view";
          } else if (entry.picture) {
            cardView.hidden = false;
            cardView.removeAttribute("href");
            cardView.firstChild.textContent = pinned ? "View larger" : "Click to view larger";
          } else {
            cardView.hidden = true;
          }
          card.classList.toggle("is-pinned", pinned);
          if (pinned) card.style.transform = "";
        }
        card.classList.add("is-shown");
      };
      var hideCard = function () {
        card.classList.remove("is-shown");
        cardFor = null;
      };
      var placeCard = function (x, y) {
        var box = card.getBoundingClientRect();
        var left = x + 16;
        var top = y + 20;
        if (left + box.width > window.innerWidth - 8) left = x - box.width - 12;
        if (top + box.height > window.innerHeight - 8) top = y - box.height - 12;
        card.style.transform = "translate(" + Math.max(8, Math.round(left)) + "px," + Math.max(8, Math.round(top)) + "px)";
      };
      var openEntry = function (entry, tilePicture) {
        if (entry.href) {
          if (entry.href.charAt(0) === "/" || entry.href.charAt(0) === "#") window.location.href = entry.href;
          else window.open(entry.href, "_blank", "noopener");
        } else if (tilePicture && showFullView) {
          showFullView(tilePicture);
        }
      };
      // The pinned card's button (touch): open the link, or the picture if there is no link.
      cardView.addEventListener("click", function (event) {
        if (!cardFor || cardFor.href) return;
        event.preventDefault();
        if (cardFor.picture && showFullView) showFullView(cardFor.picture);
      });

      /* The board itself. Tiles sit on a grid of columns and rows that goes on for ever; only the ones
         on screen exist at any moment, and each shows one of the explorations in turn. */
      var tileWidth = 0;
      var tileHeight = 0;
      var stepX = 0;
      var stepY = 0;
      var viewWidth = 0;
      var viewHeight = 0;
      var panX = 0; // which point of the board is at the top-left corner of the screen
      var panY = 0;
      var onBoard = {}; // the tiles that exist now, by "column,row"
      var wrap = function (value, size) { return ((value % size) + size) % size; };
      var rowShift = explorations.length > 2 ? Math.round(explorations.length / 2) : 1; // so a tile is not above a copy of itself
      var entryAt = function (column, row) { return explorations[wrap(column + row * rowShift, explorations.length)]; };
      var makeTile = function (column, row) {
        var entry = entryAt(column, row);
        var tile = document.createElement("div");
        tile.className = "exploration-canvas__tile" + (entry.href ? " is-link" : entry.picture ? " is-zoom" : "");
        tile.style.left = column * stepX + "px";
        tile.style.top = row * stepY + "px";
        tile.style.width = tileWidth + "px";
        tile.style.height = tileHeight + "px";
        if (entry.picture) {
          var copy = entry.picture.cloneNode(true);
          copy.removeAttribute("loading");
          copy.draggable = false;
          if (copy.tagName === "VIDEO") { copy.muted = true; copy.loop = true; copy.autoplay = !calm; copy.setAttribute("playsinline", ""); }
          tile.appendChild(copy);
        } else {
          tile.textContent = entry.note || entry.name;
        }
        tile.explorationEntry = entry;
        return tile;
      };
      var draw = function () {
        var firstColumn = Math.floor(panX / stepX) - 1;
        var lastColumn = Math.floor((panX + viewWidth) / stepX) + 1;
        var firstRow = Math.floor(panY / stepY) - 1;
        var lastRow = Math.floor((panY + viewHeight) / stepY) + 1;
        var wanted = {};
        for (var column = firstColumn; column <= lastColumn; column++) {
          for (var row = firstRow; row <= lastRow; row++) {
            var key = column + "," + row;
            wanted[key] = true;
            if (!onBoard[key]) {
              onBoard[key] = makeTile(column, row);
              plane.appendChild(onBoard[key]);
            }
          }
        }
        Object.keys(onBoard).forEach(function (key) {
          if (!wanted[key]) { onBoard[key].remove(); delete onBoard[key]; }
        });
        plane.style.transform = "translate3d(" + -Math.round(panX) + "px," + -Math.round(panY) + "px,0)";
      };
      var centreOn = function (index) {
        panX = index * stepX + tileWidth / 2 - viewWidth / 2;
        panY = tileHeight / 2 - viewHeight / 2;
      };
      var measure = function (firstTime) {
        var header = document.querySelector(".site-header");
        document.documentElement.style.setProperty("--canvas-top", (header ? Math.round(header.getBoundingClientRect().bottom) : 0) + "px");
        var box = board.getBoundingClientRect();
        var atX = stepX ? (panX + viewWidth / 2) / stepX : 0; // where we are, counted in tiles
        var atY = stepY ? (panY + viewHeight / 2) / stepY : 0;
        viewWidth = box.width;
        viewHeight = box.height;
        tileWidth = Math.round(Math.min(504, Math.max(280, viewWidth * 0.35)));
        tileHeight = Math.round(tileWidth * 0.75);
        stepX = tileWidth + TILE_GAP;
        stepY = tileHeight + TILE_GAP;
        Object.keys(onBoard).forEach(function (key) { onBoard[key].remove(); delete onBoard[key]; });
        if (firstTime) {
          // Start on the exploration named in the address (from the home page list), or the first with a picture.
          var asked = explorations.findIndex(function (entry) { return entry.id && "#" + entry.id === window.location.hash; });
          var withPicture = explorations.findIndex(function (entry) { return entry.picture; });
          centreOn(asked >= 0 ? asked : Math.max(0, withPicture));
        } else {
          panX = atX * stepX - viewWidth / 2;
          panY = atY * stepY - viewHeight / 2;
        }
        draw();
      };

      var hintGone = false;
      var dropHint = function () {
        if (hintGone) return;
        hintGone = true;
        hint.classList.add("is-hidden");
      };
      var tileAt = function (x, y) {
        var found = document.elementFromPoint(x, y);
        return found && found.closest ? found.closest(".exploration-canvas__tile") : null;
      };
      var lastMouse = null;
      var hoverAt = function (x, y) {
        var tile = tileAt(x, y);
        if (!tile || (cardFor && card.classList.contains("is-pinned"))) { if (!tile) hideCard(); return; }
        showCard(tile.explorationEntry, false);
        placeCard(x, y);
      };

      // Dragging, with a short glide after letting go.
      var drag = null;
      var speedX = 0;
      var speedY = 0;
      var gliding = 0;
      var stopGlide = function () { if (gliding) { window.cancelAnimationFrame(gliding); gliding = 0; } };
      var glide = function () {
        var last = performance.now();
        var frame = function (now) {
          var passed = Math.min(40, now - last);
          last = now;
          panX += speedX * passed;
          panY += speedY * passed;
          var slow = Math.pow(0.94, passed / 16);
          speedX *= slow;
          speedY *= slow;
          draw();
          gliding = Math.abs(speedX) + Math.abs(speedY) > 0.02 ? window.requestAnimationFrame(frame) : 0;
        };
        gliding = window.requestAnimationFrame(frame);
      };
      board.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        stopGlide();
        drag = { id: event.pointerId, kind: event.pointerType, fromX: event.clientX, fromY: event.clientY, panX: panX, panY: panY, moved: false, lastX: event.clientX, lastY: event.clientY, lastTime: performance.now() };
        speedX = 0;
        speedY = 0;
        try { board.setPointerCapture(event.pointerId); } catch (error) { /* dragging still works without it */ }
      });
      board.addEventListener("pointermove", function (event) {
        if (event.pointerType === "mouse") lastMouse = { x: event.clientX, y: event.clientY };
        if (!drag || event.pointerId !== drag.id) {
          if (event.pointerType === "mouse") hoverAt(event.clientX, event.clientY);
          return;
        }
        var movedX = event.clientX - drag.fromX;
        var movedY = event.clientY - drag.fromY;
        if (!drag.moved && Math.abs(movedX) + Math.abs(movedY) > 6) {
          drag.moved = true;
          board.classList.add("is-dragging");
          hideCard();
          dropHint();
        }
        if (!drag.moved) return;
        panX = drag.panX - movedX;
        panY = drag.panY - movedY;
        var now = performance.now();
        var passed = Math.max(1, now - drag.lastTime);
        speedX = 0.7 * ((drag.lastX - event.clientX) / passed) + 0.3 * speedX;
        speedY = 0.7 * ((drag.lastY - event.clientY) / passed) + 0.3 * speedY;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        drag.lastTime = now;
        draw();
      });
      var endDrag = function (event) {
        if (!drag || event.pointerId !== drag.id) return;
        var finished = drag;
        drag = null;
        board.classList.remove("is-dragging");
        if (finished.moved) {
          if (!calm && event.type === "pointerup" && performance.now() - finished.lastTime < 80) glide();
          return;
        }
        if (event.type !== "pointerup") return;
        // A press without a drag: a click or a tap on whatever tile is there.
        var tile = tileAt(event.clientX, event.clientY);
        if (!tile) { hideCard(); return; }
        var entry = tile.explorationEntry;
        if (finished.kind === "mouse") {
          openEntry(entry, tile.querySelector("img"));
        } else if (cardFor === entry && card.classList.contains("is-pinned")) {
          hideCard();
        } else {
          haptic();
          showCard(entry, true);
        }
      };
      board.addEventListener("pointerup", endDrag);
      board.addEventListener("pointercancel", endDrag);
      board.addEventListener("pointerleave", function (event) {
        if (event.pointerType !== "mouse" || drag) return;
        lastMouse = null;
        if (!card.classList.contains("is-pinned")) hideCard();
      });

      // Scrolling: the mouse wheel or a trackpad moves the board up, down and sideways, wherever the
      // pointer is on the page (over the header too). Pinch-to-zoom is left alone, and so is scrolling
      // inside the phone menu or the full-size picture when one of them is open.
      var somethingOnTop = function () {
        var page = document.documentElement.classList;
        return page.contains("has-open-menu") || page.contains("has-open-viewer");
      };
      window.addEventListener("wheel", function (event) {
        if (event.ctrlKey || somethingOnTop()) return;
        event.preventDefault();
        stopGlide();
        var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewHeight : 1;
        var byX = event.deltaX * unit;
        var byY = event.deltaY * unit;
        if (event.shiftKey && !byX) { byX = byY; byY = 0; }
        panX += byX;
        panY += byY;
        dropHint();
        draw();
        if (lastMouse) hoverAt(lastMouse.x, lastMouse.y);
      }, { passive: false });

      // The keys that normally scroll a page move the board: the arrows, Page Up, Page Down and Space.
      // Not while a link or button has the keyboard's attention, so Space still presses that button.
      window.addEventListener("keydown", function (event) {
        if (somethingOnTop() || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target !== document.body && event.target !== board) return;
        var page = Math.round(viewHeight * 0.8);
        var by = {
          ArrowLeft: [-120, 0], ArrowRight: [120, 0], ArrowUp: [0, -120], ArrowDown: [0, 120],
          PageUp: [0, -page], PageDown: [0, page], " ": [0, event.shiftKey ? -page : page],
        }[event.key];
        if (!by) return;
        event.preventDefault();
        stopGlide();
        panX += by[0];
        panY += by[1];
        dropHint();
        draw();
      });

      // The ordinary list is still there for keyboards and screen readers. When one of its links is
      // reached with the Tab key, the board moves to that exploration and shows its card.
      explorationList.addEventListener("focusin", function (event) {
        var figure = event.target.closest ? event.target.closest(".exploration-tile") : null;
        var index = explorationFigures.indexOf(figure);
        if (index < 0) return;
        stopGlide();
        centreOn(index);
        draw();
        showCard(explorations[index], true);
      });
      explorationList.addEventListener("focusout", function () {
        if (card.classList.contains("is-pinned")) hideCard();
      });

      var boardTimer = null;
      window.addEventListener("resize", function () {
        window.clearTimeout(boardTimer);
        boardTimer = window.setTimeout(function () { hideCard(); measure(false); }, 120);
      });
      measure(true);
    }
  }

  /* About page photos: the label follows the pointer while it is over a photo */
  document.querySelectorAll(".about-photo").forEach(function (photo) {
    photo.addEventListener("pointermove", function (event) {
      if (event.pointerType !== "mouse") return;
      var box = photo.getBoundingClientRect();
      photo.style.setProperty("--tag-x", event.clientX - box.left + "px");
      photo.style.setProperty("--tag-y", event.clientY - box.top + "px");
      photo.classList.add("is-tracking");
    });
    photo.addEventListener("pointerleave", function () { photo.classList.remove("is-tracking"); });
  });

  /* About page note wall: "Say something" turns into a note to fill in, then posts it.
     Notes are stored on Cloudflare (see cloudflare-worker/note-wall.js) so every visitor sees them. */
  var wall = document.querySelector("[data-note-wall]");
  if (wall) {
    var NOTE_COLOURS = ["orange", "green", "teal", "cyan", "light-blue", "blue", "purple", "fuchsia", "magenta", "rose"];
    var NOTES_ADDRESS = "/api/notes";
    var composer = wall.querySelector("[data-note-composer]");
    var openButton = wall.querySelector("[data-note-open]");
    var form = wall.querySelector("[data-note-form]");
    var messageField = form.querySelector("textarea");
    var nameField = form.querySelector("[name=name]");
    var errorLine = form.querySelector("[data-note-error]");
    var postButton = form.querySelector("button[type=submit]");
    var dimmer = document.querySelector("[data-note-dimmer]");
    var noteStatus = document.querySelector("[data-note-status]");
    var currentColour = "purple";

    /* Picks a different utility colour at random for the button and the next note. */
    var pickColour = function () {
      var next = currentColour;
      while (next === currentColour) next = NOTE_COLOURS[Math.floor(Math.random() * NOTE_COLOURS.length)];
      composer.classList.remove("note--" + currentColour);
      composer.classList.add("note--" + next);
      currentColour = next;
    };
    var honeypot = form.querySelector("[name=website]");
    var posting = false;
    /* Problems show in red inside the note being written; success is announced to screen readers. */
    var showStatus = function (text, isError) {
      if (errorLine) {
        errorLine.textContent = isError ? text : "";
        errorLine.hidden = !isError;
      }
      if (noteStatus) noteStatus.textContent = isError ? "" : text;
    };
    var addNote = function (note, isNew) {
      var article = document.createElement("article");
      article.className = "note note--" + (NOTE_COLOURS.indexOf(note.colour) >= 0 ? note.colour : "purple") + (isNew ? " is-new" : "");
      var message = document.createElement("p");
      message.className = "note__message";
      message.textContent = note.message;
      var footer = document.createElement("p");
      footer.className = "note__footer";
      var name = document.createElement("span");
      name.className = "note__name";
      name.tabIndex = 0; // lets a tap or the keyboard reveal the date, since phones have no hover
      name.textContent = note.name;
      var date = document.createElement("time");
      date.className = "note__date";
      date.textContent = note.date;
      footer.appendChild(name);
      footer.appendChild(date);
      article.appendChild(message);
      article.appendChild(footer);
      composer.insertAdjacentElement("afterend", article);
    };
    /* "Post" stays switched off until there is both a note and a name. */
    var updatePostButton = function () {
      postButton.disabled = posting || !(messageField.value.trim() && nameField.value.trim());
    };
    var setWriting = function (writing) {
      openButton.hidden = writing;
      form.hidden = !writing;
      if (dimmer) dimmer.hidden = !writing;
      document.body.classList.toggle("is-writing-note", writing);
      if (writing) messageField.focus();
      else openButton.focus();
    };

    /* Load the notes people have already left (oldest first, so the newest ends up next to the button). */
    fetch(NOTES_ADDRESS, { headers: { Accept: "application/json" } })
      .then(function (response) { return response.ok ? response.json() : { notes: [] }; })
      .then(function (data) {
        (data.notes || []).slice().reverse().forEach(function (note) { addNote(note, false); });
      })
      .catch(function () { /* the wall still shows without them */ });
    pickColour();
    openButton.addEventListener("click", function () { setWriting(true); });
    [messageField, nameField].forEach(function (field) {
      field.addEventListener("input", function () {
        updatePostButton();
        if (errorLine && !errorLine.hidden) showStatus("", false);
      });
    });
    if (dimmer) dimmer.addEventListener("click", function () { setWriting(false); });
    form.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setWriting(false);
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      updatePostButton();
      if (postButton.disabled) return;
      posting = true;
      updatePostButton();
      postButton.textContent = "Posting";
      showStatus("", false);
      var finish = function () {
        posting = false;
        postButton.textContent = "Post";
        updatePostButton();
      };
      fetch(NOTES_ADDRESS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          message: messageField.value,
          name: nameField.value,
          colour: currentColour,
          website: honeypot ? honeypot.value : "",
        }),
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw new Error(data.error || "Your note could not be posted. Please try again.");
            return data;
          });
        })
        .then(function (data) {
          if (data.note) addNote(data.note, true);
          form.reset();
          finish();
          setWriting(false);
          pickColour();
          showStatus("Your note was posted.", false);
        })
        .catch(function (error) {
          finish();
          var offline = error instanceof TypeError;
          showStatus(offline ? "Your note could not be posted. Check your connection and try again." : error.message, true);
        });
    });
  }

  /* Password screen: the eye button shows or hides what was typed */
  var passwordToggle = document.querySelector("[data-password-toggle]");
  if (passwordToggle) {
    var input = document.getElementById("password");
    passwordToggle.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      passwordToggle.setAttribute("aria-pressed", String(show));
      passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  }
})();
