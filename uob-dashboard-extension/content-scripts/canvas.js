// ─── Canvas Content Script ────────────────────────────────────────────────────
// Runs on canvas.bham.ac.uk pages.
// Scrapes upcoming assignments from the dashboard "To Do" list and
// the /api/v1/planner/items endpoint that Canvas exposes to logged-in users.

(async function scrapeCanvas() {
  // ── 1. Try the Canvas Planner API (most reliable) ──────────────────────
  try {
    const now = new Date().toISOString();
    const url = `/api/v1/planner/items?start_date=${now}&per_page=50`;
    const resp = await fetch(url, { credentials: "include" });

    if (resp.ok) {
      const items = await resp.json();
      const assignments = items
        .filter((i) => i.plannable_type === "assignment" || i.plannable_type === "quiz")
        .map((i) => ({
          id: `canvas-${i.plannable_id}`,
          title: i.plannable.title,
          course: i.context_name || "Canvas",
          dueDate: i.plannable_date || i.plannable.due_at || null,
          url: i.html_url || `https://canvas.bham.ac.uk/calendar`,
          source: "canvas",
          type: i.plannable_type,
        }));

      chrome.runtime.sendMessage({ type: "CANVAS_DATA", payload: { assignments } });
      return;
    }
  } catch (e) {
    // API unavailable — fall through to DOM scraping
  }

  // ── 2. Fallback: scrape the dashboard DOM ──────────────────────────────
  const assignments = [];
  // Canvas dashboard "To Do" sidebar items
  document.querySelectorAll(".planner-item").forEach((el) => {
    const titleEl = el.querySelector(".PlannerItem-title, [class*='title']");
    const dateEl = el.querySelector("time");
    const linkEl = el.querySelector("a");
    if (titleEl) {
      assignments.push({
        id: `canvas-dom-${Math.random().toString(36).slice(2)}`,
        title: titleEl.textContent.trim(),
        course: "",
        dueDate: dateEl ? dateEl.getAttribute("datetime") : null,
        url: linkEl ? linkEl.href : window.location.href,
        source: "canvas",
        type: "assignment",
      });
    }
  });

  chrome.runtime.sendMessage({ type: "CANVAS_DATA", payload: { assignments } });
})();
