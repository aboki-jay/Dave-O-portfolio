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
  }
})();
