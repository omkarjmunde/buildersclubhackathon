
function findMeetings(doc = document) {
  const DAYS = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
  ];

  const FULL = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6
  };

  const ABBR = {
    Mon: 0,
    Tue: 1,
    Tues: 1,
    Wed: 2,
    Thu: 3,
    Thur: 3,
    Thurs: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  };

  const clean = s =>
    String(s || "").replace(/\s+/g, " ").trim();

  const out = [];
  const pad = n => String(n).padStart(2, "0");

  function to24(h, m, ap) {
    h = parseInt(h, 10);
    m = m == null || m === "" ? 0 : parseInt(m, 10);

    if (ap) {
      ap = ap.toLowerCase().replace(/\./g, "");

      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
    }

    if (h < 0 || h > 23 || m < 0 || m > 59) return "";

    return pad(h) + ":" + pad(m);
  }

  // Supports:
  // 7-9pm, 7pm to 9pm, 7:30pm to 9:00pm,
  // 19:00-21:00, and single times such as 7:30pm.
  function parseTimes(str) {
    const time = String.raw`(\d{1,2})(?:[:.](\d{2}))?`;

    const shared = new RegExp(
      String.raw`\b${time}\s*(?:-|–|—|to|until|till)\s*` +
      String.raw`${time}\s*(a\.?m\.?|p\.?m\.?)\b`,
      "i"
    ).exec(str);

    if (shared) {
      const endAp = shared[7].replace(/\./g, "").toLowerCase();
      const startHour = parseInt(shared[1], 10);
      const endHour = parseInt(shared[4], 10);

      // "7-9pm" means 7pm-9pm, but "11-1pm"
      // means 11am-1pm.
      const startAp =
        endAp === "pm" && startHour % 12 > endHour % 12
          ? "am"
          : endAp;

      const start = to24(shared[1], shared[2], startAp);
      const end = to24(shared[4], shared[5], endAp);

      return start && end ? { start, end } : null;
    }

    const tokens = [];
    const re = new RegExp(
      String.raw`\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b` +
      String.raw`|\b([01]?\d|2[0-3]):([0-5]\d)\b`,
      "gi"
    );

    let m;

    while ((m = re.exec(str))) {
      const t = m[3]
        ? to24(m[1], m[2], m[3].replace(/\./g, ""))
        : to24(m[4], m[5]);

      if (t) {
        tokens.push({
          t,
          i: m.index,
          e: re.lastIndex
        });
      }
    }

    if (!tokens.length) return null;

    if (
      tokens.length > 1 &&
      /^\s*(?:-|–|—|to|until|till)\s*$/i.test(
        str.slice(tokens[0].e, tokens[1].i)
      )
    ) {
      return {
        start: tokens[0].t,
        end: tokens[1].t
      };
    }

    return {
      start: tokens[0].t,
      end: ""
    };
  }

  function parseDays(str) {
    const tokens = [];
    let m;

    const full =
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi;

    while ((m = full.exec(str))) {
      tokens.push({
        d: FULL[m[1].toLowerCase()],
        i: m.index,
        e: full.lastIndex
      });
    }

    const abbr = /\b(Mon|Tues?|Wed|Thurs?|Fri|Sat|Sun)\b\.?/gi;

    while ((m = abbr.exec(str))) {
      const key = m[1][0].toUpperCase() +
        m[1].slice(1).toLowerCase();

      tokens.push({
        d: ABBR[key],
        i: m.index,
        e: abbr.lastIndex
      });
    }

    tokens.sort((a, b) => a.i - b.i);

    const set = new Set();

    tokens.forEach((token, i) => {
      set.add(token.d);

      const next = tokens[i + 1];

      if (
        next &&
        /^\s*(?:-|–|—|to|through|thru)\s*$/i.test(
          str.slice(token.e, next.i)
        ) &&
        next.d > token.d
      ) {
        for (let d = token.d; d <= next.d; d++) {
          set.add(d);
        }
      }
    });

    if (/\bweekdays\b/i.test(str)) {
      [0, 1, 2, 3, 4].forEach(d => set.add(d));
    }

    if (/\b(daily|every day)\b/i.test(str)) {
      DAYS.forEach((_, d) => set.add(d));
    }

    return [...set]
      .sort((a, b) => a - b)
      .map(d => DAYS[d]);
  }

  function parseLocation(str) {
    let m = str.match(
      /(?:\b(?:in|at)\b|@|,)\s*((?:the\s+)?(?:Student\s+)?(?:Room|Rm|Hall|Building|Bldg|Lab|Theatre|Theater|Lecture|Studio|Union|Library|Centre|Center|Pub|Cafe|Café|Guild|Joe's|Joe|CS building)\b[^.,;()|]{0,40})/i
    );

    if (m) return clean(m[1]);

    m = str.match(/\b(Zoom|Teams|Google Meet|Discord|Online)\b/i);

    return m ? m[1] : "";
  }

  const blank = {
    source: "",
    days: "",
    start: "",
    end: "",
    frequency: "",
    location: "",
    url: "",
    text: ""
  };

  // 1. Schema.org structured data.
  function walk(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }

    if (!obj || typeof obj !== "object") return;

    const types = [].concat(obj["@type"] || []);

    if (types.some(t => /Event$/i.test(String(t)))) {
      const location = typeof obj.location === "string"
        ? obj.location
        : obj.location?.name || "";

      out.push({
        ...blank,
        source: "structured data",
        text: clean(obj.name),
        start: obj.startDate || "",
        end: obj.endDate || "",
        location: clean(location),
        url: typeof obj.url === "string" ? obj.url : ""
      });
    }

    Object.values(obj).forEach(walk);
  }

  doc.querySelectorAll(
    'script[type="application/ld+json"]'
  ).forEach(script => {
    try {
      walk(JSON.parse(script.textContent));
    } catch {
      // Ignore malformed JSON-LD.
    }
  });

  // 2. Visible page text.
  const seen = new Set();

  const lines = (doc.body?.innerText || "")
    .split(/\n+/)
    .map(clean)
    .filter(Boolean);

  function consider(segment, previous) {
    if (segment.length > 400) return;

    let text = segment;
    let times = parseTimes(text);
    let days = parseDays(text);

    if (
      times &&
      !days.length &&
      previous &&
      previous.length < 120 &&
      parseDays(previous).length
    ) {
      text = previous + " " + segment;
      days = parseDays(text);
    }

    if (!times || !days.length) return;

    const location = parseLocation(text);
    const key = [
      days.join("/"),
      times.start,
      times.end,
      location
    ].join("|");

    if (seen.has(key)) return;
    seen.add(key);

    const frequencyMatch = text.match(
      /\b(weekly|fortnightly|bi-?weekly|monthly|every other|every|each)\b/i
    );

    out.push({
      ...blank,
      source: "page text",
      days: days.join(", "),
      start: times.start,
      end: times.end,
      frequency: frequencyMatch
        ? frequencyMatch[1].toLowerCase()
        : "",
      location,
      text: text.slice(0, 300)
    });
  }

  let previous = "";

  for (const line of lines) {
    line
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .forEach(part => consider(part, previous));

    previous = line;
  }

  // 3. HTML time elements.
  const timeSeen = new Set();

  doc.querySelectorAll("time[datetime]").forEach(el => {
    const context = clean(
      (
        el.closest("li,article,tr,p,div") ||
        el.parentElement ||
        el
      ).textContent
    ).slice(0, 200);

    const datetime = el.getAttribute("datetime");
    const key = datetime + "|" + context;

    if (timeSeen.has(key)) return;
    timeSeen.add(key);

    out.push({
      ...blank,
      source: "time tag",
      start: datetime,
      text: context
    });
  });

  // 4. Calendar feed links.
  const linkSeen = new Set();

  doc.querySelectorAll("a[href]").forEach(a => {
    const url = a.href;

    if (
      !(
        /\.ics(?:[?#]|$)|^webcal:|calendar\.google\.com\/calendar/i
          .test(url)
      ) ||
      linkSeen.has(url)
    ) {
      return;
    }

    linkSeen.add(url);

    out.push({
      ...blank,
      source: "calendar link",
      text: clean(a.textContent) || "Calendar",
      url
    });
  });

  return out;
}
