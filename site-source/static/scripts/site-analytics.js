/*
  site-analytics.js
  -----------------
  Visitor statistics. This file only runs when at least one of these is filled in
  site-source/content/site-details.json:

    "cloudflareAnalyticsToken"   Cloudflare Web Analytics: where visits come from, countries,
                                 devices and the most visited pages. Uses no cookies.
    "clarityProjectId"           Microsoft Clarity: heatmaps, scroll depth and replays of visits,
                                 to see where people spend their time on a page.

  Choices made here to respect visitors:
  - Clarity is always told NOT to use cookies, so no cookie banner is needed. The cost is that
    Clarity cannot follow one visitor from page to page; each page is measured separately.
  - Clarity is skipped for visitors whose browser asks not to be tracked.
  - Clarity never loads on the confidential case study or its password page, so nothing from
    those pages is recorded.
  - Nothing runs on the preview on your own computer, so your own testing is not counted.
*/
(function () {
  var tag = document.currentScript;
  if (!tag) return;

  var host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return;

  /* Cloudflare Web Analytics */
  var cloudflareToken = tag.getAttribute("data-cloudflare-token");
  if (cloudflareToken) {
    var beacon = document.createElement("script");
    beacon.type = "module"; // the same form as the snippet Cloudflare hands out
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.setAttribute("data-cf-beacon", JSON.stringify({ token: cloudflareToken }));
    document.head.appendChild(beacon);
  }

  /* Microsoft Clarity */
  var clarityProject = tag.getAttribute("data-clarity-project");
  var privatePage = location.pathname.indexOf("/work/confidential-project") === 0;
  var askedNotToBeTracked = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";
  if (clarityProject && !privatePage && !askedNotToBeTracked) {
    window.clarity =
      window.clarity ||
      function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
    // No cookies, for every visitor everywhere.
    window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
    var clarity = document.createElement("script");
    clarity.async = true;
    clarity.src = "https://www.clarity.ms/tag/" + encodeURIComponent(clarityProject);
    document.head.appendChild(clarity);

    /* Key clicks, sent to Clarity by name so they can be counted and filtered there (Filters, "Custom
       events", or the "Smart events" card on the dashboard). Only the name is sent: never what was
       copied or typed. The names below are what David sees in Clarity, so change them with care.
         Contact: copied email / email link / LinkedIn / X / Contact button
         Resume: downloaded PDF
         Case study opened from: home page / Work page / phone menu / another case study / another page
         Case study: read to the end
         Exploration: opened link / viewed picture
         Now playing: opened in Spotify
         Playlist: opened in Spotify */
    var note = function (name) {
      window.clarity("event", name);
    };
    document.addEventListener(
      "click",
      function (event) {
        var pressed = event.target && event.target.closest ? event.target.closest("a, button") : null;
        if (!pressed) return;
        var named = pressed.getAttribute("data-track"); // a link can name its own event in the page
        if (named) return note(named);
        if (pressed.hasAttribute("data-copy-text")) return note("Contact: copied email");
        var href = pressed.getAttribute("href") || "";
        if (href.indexOf("mailto:") === 0) return note("Contact: email link");
        if (/\/\/([a-z]+\.)?linkedin\.com\//i.test(href)) return note("Contact: LinkedIn");
        if (/\/\/(www\.)?(x|twitter)\.com\//i.test(href)) return note("Contact: X");
        if (/#contact$/.test(href)) return note("Contact: Contact button");
        var study = href.match(/^\/work\/([a-z0-9-]+)\/$/);
        if (study && study[1] !== "brand") {
          var from = "another page";
          if (pressed.closest(".site-nav")) from = "phone menu";
          else if (location.pathname === "/") from = "home page";
          else if (document.querySelector(".case-study")) from = "another case study";
          else if (location.pathname.indexOf("/work/") === 0) from = "Work page";
          note("Case study opened from: " + from);
        }
      },
      true
    );
    // Things the page does itself (site.js announces them): opening an exploration from the board.
    document.addEventListener("site:did", function (event) {
      if (typeof event.detail === "string" && event.detail) note(event.detail);
    });
    // A case study counts as read to the end when its "Next project" block comes into view.
    var ending = document.querySelector(".next-project");
    if (ending) {
      var reachedEnding = function () {
        if (ending.getBoundingClientRect().top > window.innerHeight) return;
        window.removeEventListener("scroll", reachedEnding);
        note("Case study: read to the end");
      };
      window.addEventListener("scroll", reachedEnding, { passive: true });
    }
  }
})();
