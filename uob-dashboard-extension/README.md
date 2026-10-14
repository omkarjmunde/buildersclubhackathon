# UoB Dashboard — Chrome Extension

A Chrome extension that aggregates deadlines, assignments and important notifications from:
- **Canvas** (canvas.bham.ac.uk)
- **MyUoB** (myuob.bham.ac.uk)
- **Outlook Web** (outlook.office.com)

---

## Features

- Unified popup showing all upcoming deadlines sorted by due date
- Colour-coded urgency tags (overdue / due soon / upcoming)
- Outlook keyword filtering — only emails matching your keywords are shown
- Browser notifications for deadlines within 48 hours
- Filter tabs by source (Canvas / MyUoB / Outlook)
- Fully configurable keyword list in the Settings panel

---

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `uob-dashboard-extension` folder
4. The extension icon will appear in your toolbar

---

## How it works

The extension uses **content scripts** that run automatically when you visit each site.  
They scrape data from the page (or the Canvas API for assignments) and store it locally  
using `chrome.storage.local`. The popup reads that stored data — no external server needed.

**To populate data:**
1. Visit `canvas.bham.ac.uk` (any page — the script runs on all Canvas pages)
2. Visit `myuob.bham.ac.uk/dashboard/student-home`
3. Visit `outlook.office.com/mail/inbox`

The data persists until you visit those pages again to refresh it.

---

## Adding/editing keywords

Click the ⚙️ icon in the popup. You can add or remove keywords that filter your Outlook emails.  
Default keywords include: `deadline`, `exam`, `submission`, `urgent`, `cancelled`, etc.

---

## Icon

Replace `icons/icon128.png` with a real 128×128 PNG icon before publishing.  
A simple placeholder is sufficient for local use — Chrome just needs the file to exist.

---

## Notes on selectors

MyUoB and Outlook periodically update their page markup. If items stop appearing:
- Open DevTools on the relevant page
- Inspect the elements you want to scrape
- Update the CSS selectors in `content-scripts/myuob.js` or `content-scripts/outlook.js`
