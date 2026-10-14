const $ = id => document.getElementById(id);

let rows = [];
let lastTab = { title: "", url: "" };
let siteScanErrors = [];
let siteScanStats = null;

function scrapePage(itemSel, fields) {
  const roots = itemSel
    ? [...document.querySelectorAll(itemSel)]
    : [document];

  return roots.map(root => {
    const row = {};

    for (const { name, sel, attr } of fields) {
      const el = sel ? root.querySelector(sel) : root;

      if (!el) {
        row[name] = null;
      } else if (!attr) {
        row[name] = el.textContent.trim().replace(/\s+/g, " ");
      } else if (attr === "href" || attr === "src") {
        row[name] = el[attr];
      } else {
        row[name] = el.getAttribute(attr);
      }
    }

    return row;
  });
}

function parseFields(text) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const eq = line.indexOf("=");
      const name = eq > -1
        ? line.slice(0, eq).trim()
        : line;

      let rest = eq > -1
        ? line.slice(eq + 1).trim()
        : line;

      let attr = "";
      const at = rest.lastIndexOf("@");

      if (at > -1) {
        attr = rest.slice(at + 1).trim();
        rest = rest.slice(0, at).trim();
      }

      return { name, sel: rest, attr };
    });
}

function toCSV(data) {
  if (!data.length) return "";

  const cols = [
    ...new Set(data.flatMap(row => Object.keys(row)))
  ];

  const escape = value =>
    '"' + String(value ?? "").replace(/"/g, '""') + '"';

  return [
    cols.map(escape).join(","),
    ...data.map(row =>
      cols.map(col => escape(row[col])).join(",")
    )
  ].join("\r\n");
}

function download(filename, content, type) {
  const url = URL.createObjectURL(
    new Blob([content], { type })
  );

  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename
  });

  document.body.append(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// All scraped content is rendered as text, never as HTML.
function el(tag, cls, text) {
  const element = document.createElement(tag);

  if (cls) element.className = cls;
  if (text != null) element.textContent = text;

  return element;
}

function render(data) {
  const box = $("results");
  box.replaceChildren();

  for (const record of data) {
    const row = el("div", "row");

    if (record.source) {
      const when = record.start && record.start.length <= 5
        ? record.start + (record.end ? "–" + record.end : "")
        : [record.start, record.end]
            .filter(Boolean)
            .join(" → ");

      const summary = [
        record.frequency,
        Array.isArray(record.days)
          ? record.days.join(", ")
          : record.days,
        when
      ].filter(Boolean).join(" ") +
        (record.location ? " · " + record.location : "");

      row.append(el("div", "src", record.source));

      row.append(el(
        "b",
        null,
        summary || record.text || "(no details)"
      ));

      if (record.page_url) {
        const page = el(
          "a",
          null,
          record.page_title || record.page_url
        );

        page.href = record.page_url;
        page.target = "_blank";
        page.rel = "noopener noreferrer";

        row.append(page);
      }

      if (record.url && /^https?:/i.test(record.url)) {
        const link = el("a", null, record.url);
        link.href = record.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        row.append(link);
      }

      if (record.text && summary) {
        row.append(el("div", "snip", record.text));
      }
    } else {
      row.append(el(
        "div",
        null,
        Object.entries(record)
          .map(([key, value]) => `${key}: ${value ?? ""}`)
          .join("\n")
      ));

      row.style.whiteSpace = "pre-wrap";
    }

    box.append(row);
  }
}

function buildOutput() {
  const base = {
    page_title: lastTab.title,
    page_url: lastTab.url,
    scraped_at: new Date().toISOString()
  };

  // Custom-selector mode.
  if (!rows.length || !rows[0].source) {
    return { ...base, data: rows };
  }

  const strip = obj =>
    Object.fromEntries(
      Object.entries(obj).filter(
        ([, value]) => value !== "" && value != null
      )
    );

  const meetings = rows
    .filter(record => record.source !== "calendar link")
    .map(record => strip({
      name: record.source === "structured data"
        ? record.text
        : "",
      days: record.days
        ? Array.isArray(record.days)
          ? record.days
          : record.days.split(", ")
        : undefined,
      start: record.start,
      end: record.end,
      frequency: record.frequency,
      location: record.location,
      evidence: record.source === "structured data"
        ? ""
        : record.text,
      source: record.source,
      url: record.url,
      page_url: record.page_url,
      page_title: record.page_title
    }));

  const calendarFeeds = rows
    .filter(record => record.source === "calendar link")
    .map(record => ({
      url: record.url,
      page_url: record.page_url,
      page_title: record.page_title
    }));

  return {
    ...base,
    ...(siteScanStats ? { scan_stats: siteScanStats } : {}),
    ...(siteScanErrors.length
      ? { scan_errors: siteScanErrors }
      : {}),
    meetings,
    calendar_feeds: calendarFeeds
  };
}

function fileBase() {
  try {
    return new URL(lastTab.url)
      .hostname
      .replace(/^www\./, "")
      .replace(/[^a-z0-9.-]/gi, "_") || "page";
  } catch {
    return "page";
  }
}

async function run(func, args) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    lastTab = {
      title: tab.title || "",
      url: tab.url || ""
    };

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func,
      args
    });

    rows = result || [];
    siteScanStats = null;
    siteScanErrors = [];

    render(rows);

    $("status").textContent = rows.length
      ? `Found ${rows.length} result(s). Check the source page to verify them.`
      : "Nothing found. Try the custom selectors below.";

    $("json").disabled = $("csv").disabled = rows.length === 0;
  } catch (error) {
    $("status").textContent =
      "Can't run on this page: " + error.message;
  }
}

$("find").addEventListener("click", () => {
  run(findMeetings, []);
});

$("scrape").addEventListener("click", () => {
  const fields = parseFields($("fields").value);

  if (!fields.length) {
    $("status").textContent = "Add at least one field.";
    return;
  }

  run(scrapePage, [$("item").value.trim(), fields]);
});

$("json").addEventListener("click", () => {
  download(
    fileBase() + "-meetings.json",
    JSON.stringify(buildOutput(), null, 2),
    "application/json"
  );
});

$("csv").addEventListener("click", () => {
  download(
    fileBase() + "-meetings.csv",
    toCSV(rows),
    "text/csv;charset=utf-8"
  );
});

// --------------------------------------------------
// Website-wide recursive crawler
// --------------------------------------------------

$("scanSite").addEventListener("click", scanWebsite);

async function scanWebsite() {
  const button = $("scanSite");
  const status = $("status");

  let start;

  try {
    start = new URL($("siteUrl").value.trim());

    if (!["http:", "https:"].includes(start.protocol)) {
      throw new Error("Use an HTTP or HTTPS website URL.");
    }
  } catch (error) {
    status.textContent =
      error.message || "Enter a valid website URL.";
    return;
  }

  // Request access to the selected website.
  // This must be called from the button-click flow.
  let granted;

  try {
    granted = await chrome.permissions.request({
      origins: [start.origin + "/*"]
    });
  } catch (error) {
    status.textContent =
      "Could not request website access: " + error.message;
    return;
  }

  if (!granted) {
    status.textContent = "Website access was not granted.";
    return;
  }

  button.disabled = true;
  $("find").disabled = true;
  $("scrape").disabled = true;
  $("json").disabled = true;
  $("csv").disabled = true;

  const canonical = value => {
    const url = new URL(value);

    // Treat fragment-only differences as the same page.
    url.hash = "";

    // Normalize trailing slashes except for the root page.
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.href;
  };

  const startURL = canonical(start.href);

  // Queue every discovered page and process until no pages remain.
  // There is intentionally no page-count or link-depth limit.
  const queue = [startURL];
  const queued = new Set([startURL]);
  const visited = new Set();
  const records = [];
  const errors = [];

  function sameOrigin(value) {
    try {
      return new URL(value).origin === start.origin;
    } catch {
      return false;
    }
  }

  function addLink(value, baseURL) {
    try {
      const url = new URL(value, baseURL);

      if (!["http:", "https:"].includes(url.protocol)) return;
      if (url.origin !== start.origin) return;

      // Skip common non-HTML resources.
      if (
        /\.(?:pdf|jpg|jpeg|png|gif|svg|webp|zip|docx?|xlsx?|pptx?|mp4|mp3|wav|ics|woff2?|ttf|eot)$/i
          .test(url.pathname)
      ) {
        return;
      }

      const key = canonical(url.href);

      if (queued.has(key) || visited.has(key)) return;

      queued.add(key);
      queue.push(key);
    } catch {
      // Ignore invalid URLs.
    }
  }

  async function fetchText(url, timeout = 15000) {
    const response = await fetch(url, {
      credentials: "omit",
      redirect: "follow",
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    if (!sameOrigin(response.url)) {
      throw new Error("Redirected outside the selected website.");
    }

    return response;
  }

  async function readSitemap(url, state) {
    if (!sameOrigin(url) || state.seen.has(url)) return;

    state.seen.add(url);

    try {
      const response = await fetchText(url);
      const xml = await response.text();

      const xmlDoc = new DOMParser().parseFromString(
        xml,
        "application/xml"
      );

      if (xmlDoc.querySelector("parsererror")) return;

      const isIndex = !!xmlDoc.querySelector("sitemap loc");
      const selector = isIndex ? "sitemap loc" : "url loc";

      for (const element of xmlDoc.querySelectorAll(selector)) {
        const link = element.textContent.trim();

        if (!sameOrigin(link)) continue;

        if (isIndex) {
          // Sitemap indexes can point to other sitemap indexes.
          // The seen set prevents loops.
          await readSitemap(link, state);
        } else {
          addLink(link, start.href);
        }
      }
    } catch {
      // Sitemaps are optional; ordinary links are still crawled.
    }
  }

  async function seedSitemaps() {
    const state = { seen: new Set() };

    // First look for sitemap declarations in robots.txt.
    try {
      const robotsURL = new URL("/robots.txt", start.origin).href;
      const response = await fetchText(robotsURL);
      const text = await response.text();

      const sitemaps = text.match(
        /^\s*Sitemap:\s*\S+/gim
      ) || [];

      for (const line of sitemaps) {
        const url = line.replace(/^\s*Sitemap:\s*/i, "").trim();

        if (sameOrigin(url)) {
          await readSitemap(url, state);
        }
      }
    } catch {
      // robots.txt may not exist or may not be accessible.
    }

    // Also try common sitemap locations.
    for (const path of ["/sitemap.xml", "/sitemap_index.xml"]) {
      const url = new URL(path, start.origin).href;
      await readSitemap(url, state);
    }
  }

  try {
    rows = [];
    siteScanErrors = [];
    siteScanStats = null;
    render([]);

    status.textContent = "Discovering pages and sitemaps…";

    // Sitemap URLs are added to the same queue as ordinary links.
    await seedSitemaps();

    // Ensure the supplied starting URL is scanned first.
    const startIndex = queue.indexOf(startURL);

    if (startIndex > 0) {
      queue.splice(startIndex, 1);
      queue.unshift(startURL);
    }

    // Core recursive crawl:
    // every page is fetched, parsed, scraped, and its links are queued.
    // The loop ends only when no discovered pages remain.
    while (queue.length > 0) {
      const pageURL = queue.shift();

      if (visited.has(pageURL)) continue;

      visited.add(pageURL);

      status.textContent =
        `Scanned ${visited.size} page(s). ` +
        `Queue: ${queue.length}. Reading ${pageURL}`;

      try {
        const response = await fetchText(pageURL);

        const contentType =
          response.headers.get("content-type") || "";

        // Non-HTML resources are not parsed as pages.
        if (
          !contentType.includes("text/html") &&
          !contentType.includes("application/xhtml+xml")
        ) {
          continue;
        }

        const html = await response.text();

        const pageDoc = new DOMParser().parseFromString(
          html,
          "text/html"
        );

        // Extract meeting/event information from this page.
        const found = findMeetings(pageDoc);
        const pageTitle = pageDoc.title || "";

        for (const record of found) {
          records.push({
            ...record,
            page_url: pageURL,
            page_title: pageTitle
          });
        }

        // IMPORTANT:
        // Inspect links on EVERY fetched HTML page.
        // Newly discovered links are added to the queue and later scanned.
        for (const link of pageDoc.querySelectorAll("a[href]")) {
          addLink(link.getAttribute("href"), pageURL);
        }

        // Also inspect canonical URLs when present.
        const canonicalLink = pageDoc.querySelector(
          'link[rel="canonical"][href]'
        );

        if (canonicalLink) {
          addLink(canonicalLink.getAttribute("href"), pageURL);
        }

        // Discover URLs in iframes that are on the same origin.
        for (const frame of pageDoc.querySelectorAll("iframe[src]")) {
          addLink(frame.getAttribute("src"), pageURL);
        }

        // Discover same-origin links in common metadata elements.
        for (const meta of pageDoc.querySelectorAll(
          'meta[http-equiv="refresh"][content]'
        )) {
          const content = meta.getAttribute("content") || "";
          const match = content.match(/url\s*=\s*['"]?([^'";]+)['"]?/i);

          if (match) {
            addLink(match[1].trim(), pageURL);
          }
        }
      } catch (error) {
        errors.push({
          url: pageURL,
          error: error.message || String(error)
        });
      }
    }

    // Deduplicate identical findings from the same page.
    // Keep page_url in the key so results from different pages remain traceable.
    const unique = new Map();

    for (const record of records) {
      const key = [
        record.page_url,
        record.source,
        Array.isArray(record.days)
          ? record.days.join(",")
          : record.days,
        record.start,
        record.end,
        record.location,
        record.url,
        record.text
      ].join("|");

      if (!unique.has(key)) {
        unique.set(key, record);
      }
    }

    rows = [...unique.values()];

    lastTab = {
      title: "Website scan: " + start.hostname,
      url: start.href
    };

    siteScanErrors = errors;
    siteScanStats = {
      pages_scanned: visited.size,
      pages_discovered: queued.size,
      pages_failed: errors.length,
      pages_remaining: queue.length,
      crawl_scope: "same-origin"
    };

    render(rows);

    $("json").disabled = rows.length === 0;
    $("csv").disabled = rows.length === 0;

    status.textContent =
      `Finished: scanned ${visited.size} page(s), ` +
      `found ${rows.length} result(s), ` +
      `${errors.length} page(s) failed. ` +
      `All discovered same-origin HTML links have been processed.`;
  } catch (error) {
    status.textContent =
      "Website scan failed: " + error.message;
  } finally {
    button.disabled = false;
    $("find").disabled = false;
    $("scrape").disabled = false;
  }
}
