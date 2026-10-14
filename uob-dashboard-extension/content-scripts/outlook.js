// ─── Outlook Content Script ───────────────────────────────────────────────────
// Works on both outlook.cloud.microsoft and outlook.office.com.
// Adapted from a proven Outlook DOM extractor — uses the same selectors and
// visibility checks that are confirmed to work, but auto-scans for keyword
// matches instead of requiring a button click.

if (window.__uobOutlookLoaded) {
  // prevent double-injection on SPA navigation
} else {
window.__uobOutlookLoaded = true;

const DEFAULT_KEYWORDS = [
  "deadline", "due", "submission", "assignment", "exam",
  "compulsory", "urgent", "important", "cancelled", "rescheduled",
  "reminder", "assessment", "coursework",
];

// ── Utilities (from your friend's proven code) ────────────────────────────────
const clean = text => (text || "").replace(/\s+/g, " ").trim();

const isVisible = el => {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 &&
    getComputedStyle(el).visibility !== "hidden";
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getVisibleRows() {
  return [...document.querySelectorAll('[role="option"], [role="listitem"]')]
    .filter(el => isVisible(el) && clean(el.innerText));
}

function getEmails(text) {
  return [...new Set(text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [])];
}

function getFieldLines(text, fieldNames) {
  const lines = text.split(/\n+/).map(clean).filter(Boolean);
  const pattern = new RegExp(`^(?:${fieldNames.join("|")})\\s*:?\\s*(.*)$`, "i");
  return lines.flatMap(line => {
    const match = line.match(pattern);
    return match ? [clean(match[1])] : [];
  }).filter(Boolean);
}

function findBestBody(main) {
  const selectors = [
    '[data-testid*="message-body" i]',
    '[class*="allowTextSelection"]',
    '[role="document"]',
    '[dir="auto"]',
  ];
  const candidates = selectors
    .flatMap(sel => [...main.querySelectorAll(sel)])
    .filter((el, i, arr) =>
      arr.indexOf(el) === i &&
      isVisible(el) &&
      clean(el.innerText).length > 0 &&
      clean(el.innerText).length < clean(main.innerText).length
    );
  const ranked = candidates
    .map(el => ({
      el,
      text: clean(el.innerText),
      score:
        (el.matches('[data-testid*="message-body" i]') ? 4 : 0) +
        (el.matches('[role="document"]') ? 3 : 0) +
        (el.matches('[class*="allowTextSelection"]') ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  return ranked[0]?.text || "";
}

// ── Extract data from the currently open message pane ─────────────────────────
function extractOpenMessage() {
  const main = document.querySelector('[role="main"]') || document.body;
  const fullText = clean(main.innerText || "");

  const subjectHeading = [...main.querySelectorAll("h1, h2, [role=heading]")].find(isVisible);
  const subjectLine = getFieldLines(fullText, ["Subject"])[0] || "";
  const subject = (subjectHeading ? clean(subjectHeading.innerText) : null) || subjectLine || null;

  const senderLines = getFieldLines(fullText, ["From", "Sender"]);
  const senderText = senderLines[0] || "";
  const senderEmail = getEmails(senderText)[0] || null;
  const senderName = clean(senderText.replace(/<[^>]*>/g, "").replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "")) || null;

  const receivedLines = getFieldLines(fullText, ["Received", "Date", "Sent"]);
  const receivedEl = [...main.querySelectorAll("time, [datetime]")].find(el =>
    isVisible(el) && el.hasAttribute("datetime")
  );
  const receivedDateTime =
    receivedEl?.getAttribute("datetime") ||
    (receivedEl ? clean(receivedEl.innerText) : null) ||
    receivedLines[0] || null;

  const body = findBestBody(main);

  return { subject, senderName, senderEmail, receivedDateTime, body, fullText };
}

// ── Check if a row's visible text matches any keyword ─────────────────────────
function rowMatchesKeywords(row, lowerKeywords) {
  const text = clean(row.innerText).toLowerCase();
  return lowerKeywords.some(kw => text.includes(kw));
}

// ── Main scan ─────────────────────────────────────────────────────────────────
async function scanInbox(lowerKeywords) {
  console.log("[UoB Dashboard] Outlook script running on:", location.href);
  console.log("[UoB Dashboard] Keywords:", lowerKeywords);

  // Wait for the mail list to render
  await waitForRows();

  const rows = getVisibleRows();
  console.log(`[UoB Dashboard] Found ${rows.length} visible rows`);

  const matchingRows = rows.filter(row => rowMatchesKeywords(row, lowerKeywords));
  console.log(`[UoB Dashboard] Rows matching keywords: ${matchingRows.length}`);

  const emails = [];
  const originalUrl = location.href;

  // Click each matching row, wait for message pane, extract data
  for (const row of matchingRows.slice(0, 10)) { // cap at 10 to avoid being slow
    try {
      row.click();
      await sleep(1000); // wait for message pane to render

      const data = extractOpenMessage();
      if (!data.subject && !data.body) continue;

      const combined = ((data.subject || "") + " " + (data.body || "")).toLowerCase();
      const matched = lowerKeywords.filter(kw => combined.includes(kw));

      emails.push({
        id: `outlook-${Math.random().toString(36).slice(2)}`,
        title: data.subject || clean(row.innerText).slice(0, 80),
        sender: data.senderName || data.senderEmail || "",
        dueDate: data.receivedDateTime || null,
        url: location.href,
        source: "outlook",
        type: "email",
        matchedKeywords: matched,
      });

      console.log(`[UoB Dashboard] Extracted: "${data.subject}" — matched: [${matched.join(", ")}]`);
    } catch (err) {
      console.warn("[UoB Dashboard] Error processing row:", err.message);
    }
  }

  console.log(`[UoB Dashboard] Total emails extracted: ${emails.length}`);

  chrome.runtime.sendMessage(
    { type: "OUTLOOK_DATA", payload: { emails } },
    resp => console.log("[UoB Dashboard] Outlook data sent:", resp)
  );
}

// ── Wait for mail list rows to appear ────────────────────────────────────────
function waitForRows(timeout = 15000) {
  return new Promise(resolve => {
    if (getVisibleRows().length > 0) { resolve(); return; }
    const observer = new MutationObserver(() => {
      if (getVisibleRows().length > 0) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(); }, timeout);
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────
chrome.storage.local.get(["keywords"], data => {
  const keywords = data.keywords?.length ? data.keywords : DEFAULT_KEYWORDS;
  scanInbox(keywords.map(k => k.toLowerCase()));
});

} // end guard
