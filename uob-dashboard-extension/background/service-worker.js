// ─── Service Worker ───────────────────────────────────────────────────────────

const DEADLINE_WARN_MS = 48 * 60 * 60 * 1000;

// URLs to open for each source when a manual refresh is triggered
const REFRESH_URLS = {
  canvas:  "https://canvas.bham.ac.uk/",
  myuob:   "https://myuob.bham.ac.uk/dashboard/student-home",
  outlook: "https://outlook.cloud.microsoft/mail/inbox",
};

// ── Receive data from content scripts ────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CANVAS_DATA") {
    mergeData("canvas", message.payload);
    notifyRefreshProgress("canvas", sender.tab?.id);
    sendResponse({ ok: true });

  } else if (message.type === "MYUOB_DATA") {
    mergeData("myuob", message.payload);
    notifyRefreshProgress("myuob", sender.tab?.id);
    sendResponse({ ok: true });

  } else if (message.type === "OUTLOOK_DATA") {
    mergeData("outlook", message.payload);
    notifyRefreshProgress("outlook", sender.tab?.id);
    sendResponse({ ok: true });

  } else if (message.type === "START_REFRESH") {
    startRefresh();
    sendResponse({ ok: true });
  }

  return true;
});

// ── Merge data into storage ───────────────────────────────────────────────────
function mergeData(source, payload) {
  chrome.storage.local.set(
    { [source]: payload, [`${source}_updated`]: Date.now() },
    () => checkUpcomingDeadlines()
  );
}

// ── Refresh: open background tabs, wait for scripts, close them ───────────────
let refreshTabs = {};   // tabId → source
let refreshDone = {};   // source → boolean

function startRefresh() {
  refreshTabs = {};
  refreshDone = { canvas: false, myuob: false, outlook: false };

  // Notify popup that refresh started
  broadcastRefreshState("started", 0);

  Object.entries(REFRESH_URLS).forEach(([source, url]) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      refreshTabs[tab.id] = source;
    });
  });

  // Safety timeout — close tabs and mark done after 30s regardless
  setTimeout(() => finishRefresh(true), 30000);
}

function notifyRefreshProgress(source, tabId) {
  refreshDone[source] = true;

  // Close the background tab for this source
  if (tabId) {
    // Small delay so the content script finishes sending before we close
    setTimeout(() => {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) { /* tab already closed */ }
      });
    }, 500);
  }

  const doneCount = Object.values(refreshDone).filter(Boolean).length;
  const total = Object.keys(refreshDone).length;
  const pct = Math.round((doneCount / total) * 100);

  broadcastRefreshState("progress", pct, source);

  if (doneCount === total) finishRefresh(false);
}

function finishRefresh(timedOut) {
  // Close any tabs still open
  Object.keys(refreshTabs).forEach(tabId => {
    chrome.tabs.remove(parseInt(tabId), () => {
      if (chrome.runtime.lastError) { /* already closed */ }
    });
  });
  refreshTabs = {};
  broadcastRefreshState("done", 100);
}

function broadcastRefreshState(state, pct, source) {
  // Send to all extension views (the popup listens for this)
  chrome.runtime.sendMessage({
    type: "REFRESH_STATE",
    state,   // "started" | "progress" | "done"
    pct,
    source,
  }).catch(() => { /* popup may be closed */ });
}

// ── Watch for MyUoB tabs and inject script as fallback ────────────────────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  const isMyUoB = tab.url.includes("myuob.bham.ac.uk") ||
                  tab.url.includes("myday.cloud");

  if (isMyUoB) {
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        files: ["content-scripts/myuob.js"],
      }).catch(() => { /* script may already be running */ });
    }, 3000);
  }
});

// ── Alarm: re-check deadlines every 30 minutes ───────────────────────────────
chrome.alarms.create("deadline-check", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "deadline-check") checkUpcomingDeadlines();
});

// ── Notify for deadlines within warning window ────────────────────────────────
function checkUpcomingDeadlines() {
  chrome.storage.local.get(["canvas", "myuob", "notified"], (data) => {
    const notified = data.notified || {};
    const now = Date.now();
    const deadlines = [
      ...(data.canvas?.assignments || []),
      ...(data.myuob?.events || []),
    ];

    deadlines.forEach((item) => {
      if (!item.dueDate) return;
      const due = new Date(item.dueDate).getTime();
      const diff = due - now;
      if (diff > 0 && diff <= DEADLINE_WARN_MS && !notified[item.id]) {
        const hoursLeft = Math.round(diff / (1000 * 60 * 60));
        chrome.notifications.create(item.id, {
          type: "basic",
          iconUrl: "../icons/icon128.png",
          title: `Due in ~${hoursLeft}h`,
          message: item.title,
          priority: 2,
        });
        notified[item.id] = true;
      }
    });

    chrome.storage.local.set({ notified });
  });
}
