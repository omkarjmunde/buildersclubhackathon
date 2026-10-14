// ─── Popup Script ─────────────────────────────────────────────────────────────

const DEFAULT_KEYWORDS = [
  "deadline", "due", "submission", "assignment", "exam",
  "compulsory", "urgent", "important", "cancelled", "rescheduled",
  "reminder", "assessment", "coursework",
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const settingsBtn       = document.getElementById("settingsBtn");
const settingsPanel     = document.getElementById("settingsPanel");
const mainContent       = document.getElementById("mainContent");
const keywordListEl     = document.getElementById("keywordList");
const newKeywordInput   = document.getElementById("newKeyword");
const addKeywordBtn     = document.getElementById("addKeywordBtn");
const saveSettingsBtn   = document.getElementById("saveSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const itemListEl        = document.getElementById("itemList");
const emptyState        = document.getElementById("emptyState");
const loadingState      = document.getElementById("loadingState");
const lastUpdatedEl     = document.getElementById("lastUpdated");
const tabs              = document.querySelectorAll(".tab");
const debugBtn          = document.getElementById("debugBtn");
const debugPanel        = document.getElementById("debugPanel");
const refreshBtn        = document.getElementById("refreshBtn");
const refreshBar        = document.getElementById("refreshBar");
const refreshBarFill    = document.getElementById("refreshBarFill");
const refreshStatus     = document.getElementById("refreshStatus");

let allItems = [];
let activeFilter = "all";
let tempKeywords = [];

// ── Init ──────────────────────────────────────────────────────────────────────
chrome.storage.local.get(
  ["canvas", "myuob", "outlook", "keywords",
   "canvas_updated", "myuob_updated", "outlook_updated"],
  (data) => {
    loadingState.classList.add("hidden");

    allItems = [
      ...(data.canvas?.assignments  || []),
      ...(data.myuob?.events        || []),
      ...(data.myuob?.announcements || []),
      ...(data.outlook?.emails      || []),
    ];

    allItems.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    updateLastUpdated(data);
    renderItems();
  }
);

// ── Render ────────────────────────────────────────────────────────────────────
function renderItems() {
  const filtered = activeFilter === "all"
    ? allItems
    : allItems.filter((i) => i.source === activeFilter);

  itemListEl.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item";
    li.setAttribute("data-source", item.source);
    li.setAttribute("role", "listitem");
    if (item.url) {
      li.title = "Click to open";
      li.style.cursor = "pointer";
      li.addEventListener("click", () => chrome.tabs.create({ url: item.url }));
    }

    // Badge
    const badgeClass = `badge badge-${item.source}`;
    const badgeLabel = { canvas: "Canvas", myuob: "MyUoB", outlook: "Outlook" }[item.source] || item.source;

    // Due date tag
    let dueDateHtml = "";
    if (item.dueDate) {
      const { label, cls } = formatDue(item.dueDate);
      dueDateHtml = `<span class="due-tag ${cls}">${label}</span>`;
    }

    // Course / sender meta
    const meta = item.course || item.sender || "";

    // Matched keywords (Outlook)
    let keywordsHtml = "";
    if (item.matchedKeywords?.length) {
      const chips = item.matchedKeywords
        .slice(0, 4)
        .map((k) => `<span class="kw-chip">${escHtml(k)}</span>`)
        .join("");
      keywordsHtml = `<div class="keywords-row" aria-label="Matched keywords">${chips}</div>`;
    }

    li.innerHTML = `
      <div class="item-header">
        <span class="item-title">${escHtml(item.title)}</span>
        <span class="${badgeClass}" aria-label="Source: ${badgeLabel}">${badgeLabel}</span>
      </div>
      <div class="item-meta">
        ${dueDateHtml}
        ${meta ? `<span>${escHtml(meta)}</span>` : ""}
      </div>
      ${keywordsHtml}
    `;

    itemListEl.appendChild(li);
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    activeFilter = tab.dataset.filter;
    renderItems();
  });
});

// ── Settings panel ────────────────────────────────────────────────────────────
settingsBtn.addEventListener("click", () => {
  const isOpen = !settingsPanel.classList.contains("hidden");
  if (isOpen) {
    settingsPanel.classList.add("hidden");
  } else {
    chrome.storage.local.get(["keywords"], (data) => {
      tempKeywords = data.keywords?.length ? [...data.keywords] : [...DEFAULT_KEYWORDS];
      renderKeywordTags();
      settingsPanel.classList.remove("hidden");
    });
  }
});

function renderKeywordTags() {
  keywordListEl.innerHTML = "";
  tempKeywords.forEach((kw, idx) => {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";
    tag.setAttribute("role", "listitem");
    tag.innerHTML = `${escHtml(kw)}<button aria-label="Remove ${escHtml(kw)}">×</button>`;
    tag.querySelector("button").addEventListener("click", () => {
      tempKeywords.splice(idx, 1);
      renderKeywordTags();
    });
    keywordListEl.appendChild(tag);
  });
}

addKeywordBtn.addEventListener("click", addKeyword);
newKeywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addKeyword();
});

function addKeyword() {
  const val = newKeywordInput.value.trim().toLowerCase();
  if (val && !tempKeywords.includes(val)) {
    tempKeywords.push(val);
    renderKeywordTags();
  }
  newKeywordInput.value = "";
  newKeywordInput.focus();
}

saveSettingsBtn.addEventListener("click", () => {
  chrome.storage.local.set({ keywords: tempKeywords }, () => {
    settingsPanel.classList.add("hidden");
  });
});

cancelSettingsBtn.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

// ── Refresh button ────────────────────────────────────────────────────────────
refreshBtn.addEventListener("click", () => {
  startRefresh();
});

function startRefresh() {
  // Disable button and start spin animation
  refreshBtn.disabled = true;
  refreshBtn.classList.add("spinning");
  refreshBar.classList.remove("hidden");
  setRefreshProgress(0, "Opening Canvas, MyUoB & Outlook…");

  chrome.runtime.sendMessage({ type: "START_REFRESH" });
}

function setRefreshProgress(pct, statusText) {
  refreshBarFill.style.width = pct + "%";
  refreshStatus.textContent = statusText;
}

function finishRefresh() {
  setRefreshProgress(100, "Done ✓");
  refreshBtn.classList.remove("spinning");
  refreshBtn.disabled = false;

  // Reload the popup data then hide the bar
  setTimeout(() => {
    refreshBar.classList.add("hidden");
    reloadData();
  }, 800);
}

// Listen for progress updates from the service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "REFRESH_STATE") return;

  if (message.state === "started") {
    setRefreshProgress(5, "Opening tabs…");

  } else if (message.state === "progress") {
    const labels = { canvas: "Canvas", myuob: "MyUoB", outlook: "Outlook" };
    setRefreshProgress(message.pct, `✓ ${labels[message.source] || message.source} updated`);

  } else if (message.state === "done") {
    finishRefresh();
  }
});

// ── Reload data from storage (used after refresh) ─────────────────────────────
function reloadData() {
  chrome.storage.local.get(
    ["canvas", "myuob", "outlook", "canvas_updated", "myuob_updated", "outlook_updated"],
    (data) => {
      allItems = [
        ...(data.canvas?.assignments   || []),
        ...(data.myuob?.events         || []),
        ...(data.myuob?.announcements  || []),
        ...(data.outlook?.emails       || []),
      ];
      allItems.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      updateLastUpdated(data);
      renderItems();
    }
  );
}

function updateLastUpdated(data) {
  const sources = [
    { key: "canvas_updated",  label: "Canvas" },
    { key: "myuob_updated",   label: "MyUoB" },
    { key: "outlook_updated", label: "Outlook" },
  ];
  const parts = sources
    .filter(s => data[s.key])
    .map(s => `${s.label} ${timeAgo(data[s.key])}`);

  lastUpdatedEl.textContent = parts.length
    ? parts.join(" · ")
    : "No data yet — press ↻ to refresh.";
}

// ── Debug button ──────────────────────────────────────────────────────────────
if (debugBtn) {
  debugBtn.addEventListener("click", () => {
    const isVisible = !debugPanel.classList.contains("hidden");
    if (isVisible) {
      debugPanel.classList.add("hidden");
      debugBtn.textContent = "Show debug info";
      return;
    }
    chrome.storage.local.get(null, (all) => {
      const summary = {
        canvas_assignments: all.canvas?.assignments?.length ?? "none",
        myuob_events: all.myuob?.events?.length ?? "none",
        myuob_announcements: all.myuob?.announcements?.length ?? "none",
        outlook_emails: all.outlook?.emails?.length ?? "none",
        canvas_updated: all.canvas_updated ? new Date(all.canvas_updated).toLocaleTimeString() : "never",
        myuob_updated: all.myuob_updated ? new Date(all.myuob_updated).toLocaleTimeString() : "never",
        outlook_updated: all.outlook_updated ? new Date(all.outlook_updated).toLocaleTimeString() : "never",
        raw_canvas_sample: all.canvas?.assignments?.[0] ?? null,
        raw_myuob_sample: all.myuob?.events?.[0] ?? all.myuob?.announcements?.[0] ?? null,
        raw_outlook_sample: all.outlook?.emails?.[0] ?? null,
      };
      debugPanel.textContent = JSON.stringify(summary, null, 2);
      debugPanel.classList.remove("hidden");
      debugBtn.textContent = "Hide debug info";
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDue(dateStr) {
  const due = new Date(dateStr);
  if (isNaN(due)) return { label: dateStr, cls: "due-upcoming" };

  const now = Date.now();
  const diff = due.getTime() - now;
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days  = Math.floor(hours / 24);

  if (diff < 0) {
    return { label: `Overdue ${days > 0 ? days + "d ago" : hours + "h ago"}`, cls: "due-overdue" };
  }
  if (diff <= 48 * 60 * 60 * 1000) {
    return { label: `Due in ${hours}h`, cls: "due-soon" };
  }
  return {
    label: `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    cls: "due-upcoming",
  };
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
