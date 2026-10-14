// ─── MyUoB Content Script ─────────────────────────────────────────────────────
// Injected into myuob.bham.ac.uk (and as a fallback via the service worker).
// Uses the myday API that the page itself calls, then falls back to DOM scraping.

// Guard against double execution
if (window.__uobMyUoBLoaded) {
  console.log("[UoB Dashboard] MyUoB script already loaded, skipping.");
} else {
window.__uobMyUoBLoaded = true;

// THIS LINE confirms the script is actually running — check F12 console for it
console.log("[UoB Dashboard] ✅ MyUoB script injected on:", location.href);

const clean = text => (text || "").replace(/\s+/g, " ").trim();
const isVisible = el => {
  try {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  } catch { return false; }
};

// ── Extract a date string from an element ─────────────────────────────────────
function findDate(el) {
  const timeEl = el.querySelector("time");
  if (timeEl?.getAttribute("datetime")) return timeEl.getAttribute("datetime");
  if (timeEl) return clean(timeEl.innerText);
  const dateEl = el.querySelector('[class*="date" i], [class*="time" i], [datetime]');
  if (dateEl?.getAttribute("datetime")) return dateEl.getAttribute("datetime");
  if (dateEl) return clean(dateEl.innerText);
  const text = clean(el.innerText);
  const m = text.match(
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{0,4}|\d{1,2}:\d{2}(?:\s*[ap]m)?)\b/i
  );
  return m ? m[0] : null;
}

// ── Try the myday REST API ─────────────────────────────────────────────────────
async function tryAPI() {
  const events = [];
  const announcements = [];

  // The session token is stored in a cookie — myday uses it automatically
  // via credentials:include. We try several known endpoint patterns.
  const endpoints = [
    // Timetable
    { url: "https://api.myday.cloud/timetable/v1/timetable", type: "event" },
    { url: "https://api.myday.cloud/timetable/v2/timetable", type: "event" },
    { url: "https://api.myday.cloud/timetable/v1/activities", type: "event" },
    // Tasks
    { url: "https://api.myday.cloud/todo/v1/tasks", type: "task" },
    { url: "https://api.myday.cloud/tasks/v1/tasks", type: "task" },
    // Notifications (not news/newsroom — those 404)
    { url: "https://api.myday.cloud/notification/v1/notifications", type: "announcement" },
    { url: "https://api.myday.cloud/notifications/v1/notifications", type: "announcement" },
  ];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep.url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      console.log(`[UoB Dashboard] API ${ep.url} → ${resp.status}`);

      if (!resp.ok) continue;

      const data = await resp.json();
      // myday APIs return arrays or objects with an items/data/activities key
      const items = Array.isArray(data)
        ? data
        : data.items || data.activities || data.tasks ||
          data.notifications || data.data || [];

      console.log(`[UoB Dashboard] API returned ${items.length} items from ${ep.url}`);

      items.forEach(item => {
        const entry = {
          id: `myuob-api-${item.id || Math.random().toString(36).slice(2)}`,
          title: item.name || item.title || item.description ||
                 item.moduleName || item.subject || item.message || "Item",
          dueDate: item.startDateTime || item.start || item.dueDate ||
                   item.due || item.date || item.createdAt || null,
          url: item.url || item.link || "https://myuob.bham.ac.uk/dashboard/student-home",
          source: "myuob",
          type: ep.type,
          detail: item.location || item.room || item.venue || "",
        };
        if (ep.type === "event") events.push(entry);
        else announcements.push(entry);
      });

      // If we got data, no need to try more endpoints of the same type
      if (items.length > 0) break;

    } catch (err) {
      console.log(`[UoB Dashboard] API error ${ep.url}:`, err.message);
    }
  }

  return { events, announcements };
}

// ── DOM scrape (runs after SPA renders) ───────────────────────────────────────
function domScrape() {
  console.log("[UoB Dashboard] Running DOM scrape…");
  const events = [];
  const announcements = [];
  const seen = new Set();

  // Dump everything visible with a class suggesting it's a content block
  const selectors = [
    '[class*="tile"]', '[class*="Tile"]',
    '[class*="widget"]', '[class*="Widget"]',
    '[class*="card"]', '[class*="Card"]',
    '[class*="panel"]', '[class*="Panel"]',
    '[class*="event"]', '[class*="Event"]',
    '[class*="task"]', '[class*="Task"]',
    '[class*="assignment"]',
    '[class*="deadline"]',
    '[class*="notification"]',
    '[class*="announce"]',
    'article',
    '[role="article"]',
    '[role="listitem"]',
  ];

  const candidates = selectors.flatMap(sel => {
    try { return [...document.querySelectorAll(sel)]; } catch { return []; }
  }).filter((el, i, arr) => arr.indexOf(el) === i && isVisible(el));

  console.log(`[UoB Dashboard] DOM candidates: ${candidates.length}`);

  candidates.forEach(el => {
    const raw = clean(el.innerText);
    if (raw.length < 8 || raw.length > 600) return;
    const key = raw.slice(0, 60);
    if (seen.has(key)) return;
    seen.add(key);

    const titleEl = el.querySelector("h1,h2,h3,h4,h5,strong,[class*='title' i],[class*='heading' i]");
    const title = titleEl ? clean(titleEl.innerText) : raw.slice(0, 120);
    if (!title || title.length < 4) return;

    const linkEl = el.querySelector("a[href]");
    const dueDate = findDate(el);
    const isEvent = /\b(\d{1,2}:\d{2}|lecture|seminar|lab|tutorial|workshop|session)\b/i.test(raw);

    const item = {
      id: `myuob-dom-${Math.random().toString(36).slice(2)}`,
      title,
      dueDate,
      url: linkEl ? linkEl.href : location.href,
      source: "myuob",
      type: isEvent ? "event" : "announcement",
    };
    if (isEvent) events.push(item);
    else announcements.push(item);
  });

  return { events, announcements };
}

// ── Wait for tiles to appear ───────────────────────────────────────────────────
function waitForTiles(timeout = 12000) {
  return new Promise(resolve => {
    const check = () =>
      document.querySelectorAll('[class*="tile" i], [class*="widget" i], [class*="card" i], article').length > 1;
    if (check()) { resolve(); return; }
    const obs = new MutationObserver(() => {
      if (check()) { obs.disconnect(); resolve(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(); }, timeout);
  });
}

// ── Send results ───────────────────────────────────────────────────────────────
function send(events, announcements) {
  console.log(`[UoB Dashboard] Sending: ${events.length} events, ${announcements.length} announcements`);
  chrome.runtime.sendMessage(
    { type: "MYUOB_DATA", payload: { events, announcements } },
    resp => console.log("[UoB Dashboard] Background response:", resp)
  );
}

// ── Entry point ────────────────────────────────────────────────────────────────
(async () => {
  // 1. Try the API first (instant, reliable if endpoints are correct)
  const apiResult = await tryAPI();

  if (apiResult.events.length > 0 || apiResult.announcements.length > 0) {
    send(apiResult.events, apiResult.announcements);
    return;
  }

  console.log("[UoB Dashboard] API returned nothing — waiting for DOM tiles…");

  // 2. Wait for the SPA to render then scrape
  await waitForTiles();
  const domResult = domScrape();
  send(domResult.events, domResult.announcements);
})();

} // end guard
