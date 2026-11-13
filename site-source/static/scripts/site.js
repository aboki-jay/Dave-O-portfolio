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
    var phone = window.matchMedia("(max-width: 767px)");
    var isOpen = function () { return nav.classList.contains("is-open"); };
    var setMenu = function (open, quiet) {
      if (open === isOpen()) return;
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
    if (closeButton) closeButton.addEventListener("click", function () { setMenu(false); });
    if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a") && isOpen()) setMenu(false);
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
    if (caption) {
      caption.textContent = slides[next].getAttribute("data-caption") || "";
      caption.hidden = !caption.textContent;
    }
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
