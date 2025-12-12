// src/services/cruiseApi.ts

// ---------------- Apify dataset config ----------------

const DATASET_ID = import.meta.env.VITE_APIFY_DATASET_ID;

// src/services/cruiseApi.ts

const APIFY_DATASET_URL =
  "https://api.apify.com/v2/datasets/UMBo39qEIxobhPEUY/items?format=json&clean=true&limit=5000";



// ---------------- Whitelist of cruise lines ----------------

const ALLOWED_CRUISE_LINES = new Set<string>([
  "Carnival Cruise Line Cruises",
  "Celebrity Cruises",
  "Disney Cruise Line Cruises",
  "Holland America Cruises",
  "Margaritaville at Sea Cruises",
  "MSC Cruises",
  "Norwegian Cruise Line Cruises",
  "Princess Cruises",
  "Royal Caribbean Cruises",
  "Silversea Cruises",
  "Viking Cruises",
  "Virgin Voyages Cruises",
]);

// ---------------- Option types ----------------

export type CruiseLineOption = {
  id: string;
  name: string;
};

export type ShipOption = {
  id: string;
  name: string;
  lineId: string;
};

// ---------------- Internal helpers ----------------

function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Normalize ship / line names for fuzzy matching.
 * Strips punctuation/whitespace and lowercases.
 */
function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// ---------------- Apify row shape ----------------

type ApifyCruise = {
  id: string;
  ship_name: string;
  cruise_date: string; // e.g. "2025 Nov 09"
  cruise_title: string;
  cruise_price: string;
  cruise_line: string;
  [key: string]: any; // stop_1_text, stop_2_date, etc.
};

// ---------------- Dataset fetch + cache ----------------

let apifyCache: ApifyCruise[] | null = null;
let apifyCachePromise: Promise<ApifyCruise[]> | null = null;

async function fetchApifyDataset(): Promise<ApifyCruise[]> {
  if (apifyCache) return apifyCache;
  if (apifyCachePromise) return apifyCachePromise;

  if (!APIFY_DATASET_URL) {
    console.warn("APIFY_DATASET_URL is empty – no cruise data will be loaded.");
    apifyCache = [];
    return apifyCache;
  }

  apifyCachePromise = (async () => {
    const res = await fetch(APIFY_DATASET_URL);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Apify dataset error:", res.status, text.slice(0, 200));
      throw new Error(`Apify dataset error: ${res.status}`);
    }
 const cruises: ApifyCruise[] = await res.json();

// ✅ FILTER OUT COMPLETED CRUISES
const todayFiltered = cruises.filter((cruise) => {
  const sailDateIso = apifyDateLabelToIso(cruise.cruise_date);
  if (!sailDateIso) return false;

  // Approx cruise length = stops + embark day
  const durationDays = countCruiseStops(cruise) + 1;

  return !hasCruiseEnded(sailDateIso, durationDays);
});

apifyCache = todayFiltered;
return apifyCache;

  })();

  return apifyCachePromise;
}

// ---------------- End helpers ----------------


function hasCruiseEnded(
  sailDate: string,
  durationDays: number
): boolean {
  const start = new Date(sailDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);

  // Normalize today to avoid timezone edge bugs
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return end < today;
}


// ---------------- Date helpers ----------------

/**
 * Format "2025-11-30" -> "2025 Nov 30" to match Apify `cruise_date`
 * WITHOUT using Date (to avoid timezone shifting).
 */
function formatToApifyDateLabel(sailDate: string): string {
  const parts = sailDate.split("-");
  if (parts.length !== 3) return sailDate;

  const [yearStr, monthStr, dayStr] = parts;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthIndex = Number(monthStr) - 1;
  const monthLabel =
    monthIndex >= 0 && monthIndex < months.length
      ? months[monthIndex]
      : monthStr;

  return `${yearStr} ${monthLabel} ${dayStr}`;
}

/** "2025 Nov 09" -> "2025-11-09" */
function apifyDateLabelToIso(label: string): string | null {
  const m = label.match(/^(\d{4})\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (!m) return null;
  const [, yearStr, monStr, dayStr] = m;

  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const monthIndex = months[monStr];
  if (monthIndex == null) return null;

  const d = new Date(Number(yearStr), monthIndex, Number(dayStr));
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Count how many stops a cruise has (for choosing the "best" record). */
function countCruiseStops(c: ApifyCruise): number {
  return Object.keys(c).filter(
    (k) => k.startsWith("stop_") && k.endsWith("_text") && Boolean(c[k])
  ).length;
}

/** Add N days to an ISO date string "YYYY-MM-DD". */
function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Turn "Departing from Miami, Florida" into "Miami, Florida" */
function extractPortName(text: string): string {
  return text.replace(/^Departing from\s*/i, "").trim();
}

// ---------------- Public types ----------------

export type CruiseDay = {
  dayNumber: number;
  date: string; // "YYYY-MM-DD"
  portName: string;
  rawStopText: string;
};

export type CruiseItineraryRequest = {
  shipName: string; // e.g. "Allure Of The Seas"
  sailDate: string; // "2025-11-30"
};

export type CruiseSummary = {
  id: string;
  title: string;
  cruiseLine: string;
  shipName: string;
  departIso: string; // "YYYY-MM-DD"
  raw: ApifyCruise;
};

// ---------------- De-dupe helpers ----------------

/** De-duplicate cruise summaries for the same logical sailing. */
function dedupeCruiseSummaries(cruises: CruiseSummary[]): CruiseSummary[] {
  const map = new Map<string, CruiseSummary>();

  for (const c of cruises) {
    const key = `${normalizeName(c.shipName)}|${c.departIso}|${c.title.trim()}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, c);
      continue;
    }

    // Prefer the one with more stops (more complete itinerary data).
    const newStopCount = countCruiseStops(c.raw);
    const existingStopCount = countCruiseStops(existing.raw);

    if (newStopCount > existingStopCount) {
      map.set(key, c);
    }
  }

  return Array.from(map.values());
}

// ---------------- Cruise options (lines + ships) ----------------

/**
 * Build dynamic cruise lines + ship lists from the Apify dataset,
 * filtered to the whitelisted cruise lines.
 */
export async function getCruiseOptionsFromApify(): Promise<{
  lines: CruiseLineOption[];
  ships: ShipOption[];
}> {
  const cruises = await fetchApifyDataset();

  const lineMap = new Map<string, CruiseLineOption>();
  const ships: ShipOption[] = [];

  for (const c of cruises) {
    const rawLineName = c.cruise_line?.trim();
    const shipName = c.ship_name?.trim();
    if (!rawLineName || !shipName) continue;

    // Only include whitelisted cruise lines
    if (!ALLOWED_CRUISE_LINES.has(rawLineName)) continue;

    const lineId = slugifyId(rawLineName);
    if (!lineMap.has(lineId)) {
      lineMap.set(lineId, { id: lineId, name: rawLineName });
    }

    const shipId = slugifyId(`${rawLineName}-${shipName}`);
    if (!ships.some((s) => s.id === shipId)) {
      ships.push({ id: shipId, name: shipName, lineId });
    }
  }

  const lines = Array.from(lineMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  ships.sort((a, b) => {
    const lineCmp = a.lineId.localeCompare(b.lineId);
    if (lineCmp !== 0) return lineCmp;
    return a.name.localeCompare(b.name);
  });

  return { lines, ships };
}

// ---------------- Search by date (used for calendar / matching) ----------------

/**
 * Return all cruises that depart on the given sailDate (YYYY-MM-DD).
 * Results are de-duplicated so you don't see the same ship/route multiple times.
 */
export async function searchCruisesByDate(
  sailDate: string
): Promise<CruiseSummary[]> {
  const cruises = await fetchApifyDataset();
  const matches: CruiseSummary[] = [];

  for (const c of cruises) {
    if (!c.cruise_date) continue;
    const iso = apifyDateLabelToIso(c.cruise_date);
    if (!iso) continue;

    if (iso === sailDate) {
      matches.push({
        id: c.id,
        title: c.cruise_title ?? "",
        cruiseLine: c.cruise_line ?? "",
        shipName: c.ship_name ?? "",
        departIso: iso,
        raw: c,
      });
    }
  }

  const deduped = dedupeCruiseSummaries(matches);

  // Optional: sort for nicer display (by ship then title)
  deduped.sort((a, b) => {
    const shipCmp = a.shipName.localeCompare(b.shipName);
    if (shipCmp !== 0) return shipCmp;
    return a.title.localeCompare(b.title);
  });

  return deduped;
}

// ---------------- Ship sailings for calendar ----------------

/**
 * All upcoming sailings for a given ship name (used by SailingsCalendar).
 * Uses fuzzy normalization so slight name differences in the dataset
 * won't break matching.
 */
export async function getShipSailingsFromApify(
  shipName: string
): Promise<CruiseSummary[]> {
  const cruises = await fetchApifyDataset();
  const targetNorm = normalizeName(shipName);

  const candidates: CruiseSummary[] = [];

  for (const c of cruises) {
    if (!c.ship_name || !c.cruise_date) continue;

    const shipNorm = normalizeName(c.ship_name);
    if (!shipNorm) continue;

    // Strong match: exact normalized name
    const strongMatch = shipNorm === targetNorm;

    // Fuzzy: one contains the other (handles small differences)
    const fuzzyMatch =
      !strongMatch &&
      (shipNorm.includes(targetNorm) || targetNorm.includes(shipNorm));

    if (!strongMatch && !fuzzyMatch) continue;

    const iso = apifyDateLabelToIso(c.cruise_date);
    if (!iso) continue;

    candidates.push({
      id: c.id,
      title: c.cruise_title ?? "",
      cruiseLine: c.cruise_line ?? "",
      shipName: c.ship_name ?? "",
      departIso: iso,
      raw: c,
    });
  }

  if (!candidates.length) {
    console.warn("[Ship sailings] No matches for ship:", shipName);
    return [];
  }

  const deduped = dedupeCruiseSummaries(candidates);

  deduped.sort((a, b) => a.departIso.localeCompare(b.departIso));

  console.log("[Ship sailings] matches for", shipName, "count:", deduped.length, {
    dates: deduped.map((c) => c.departIso),
  });

  return deduped;
}

// ---------------- Itinerary lookup (ship + sail date) ----------------

/**
 * Fetch itinerary for a given ship & sail date from Apify dataset.
 * Returns an array of CruiseDay objects (one per stop), aligned so
 * Day 1 is the selected sail date and "at sea" days are preserved.
 */
export async function getItineraryFromApify(
  params: CruiseItineraryRequest
): Promise<CruiseDay[]> {
  console.log("GET ITINERARY FROM APIFY:", params);

  const cruises = await fetchApifyDataset();
  console.log("Apify cruises count:", cruises.length);

  if (!cruises || cruises.length === 0) {
    console.warn("No cruises in Apify dataset");
    return [];
  }

  const targetShipNorm = normalizeName(params.shipName);
  const targetLabel = formatToApifyDateLabel(params.sailDate); // "2025 Nov 30"
  const targetIso = params.sailDate; // "YYYY-MM-DD"
  console.log("Looking for ship/date:", targetShipNorm, targetLabel);

  // Build candidate list: same (normalized) ship AND (same label OR same ISO date)
  const candidates: ApifyCruise[] = cruises.filter((c) => {
    if (!c.ship_name || !c.cruise_date) return false;

    const shipNorm = normalizeName(c.ship_name);
    if (shipNorm !== targetShipNorm) return false;

    if (c.cruise_date === targetLabel) return true;

    const iso = apifyDateLabelToIso(c.cruise_date);
    return iso === targetIso;
  });

  let cruise: ApifyCruise | null = null;

  if (candidates.length > 0) {
    // Choose the candidate with the most stops (most complete itinerary)
    cruise = candidates.reduce((best, current) => {
      const bestStops = countCruiseStops(best);
      const currentStops = countCruiseStops(current);
      return currentStops > bestStops ? current : best;
    });
  } else {
    console.warn(
      "No exact itinerary match found for ship/date — falling back to first cruise in dataset."
    );
    cruise = cruises[0];
  }

  console.log(
    "Using Apify cruise for itinerary:",
    cruise.ship_name,
    cruise.cruise_date,
    "stops:",
    countCruiseStops(cruise)
  );

  const days: CruiseDay[] = [];
  const baseLabel = cruise.cruise_date; // e.g. "2025 Nov 30"

  // Start lastIso as the departure date if we can parse it, otherwise the requested sail date
  let lastIso = apifyDateLabelToIso(baseLabel) ?? params.sailDate;

  for (let i = 1; i <= 20; i++) {
    const dateKey = `stop_${i}_date`;
    const textKey = `stop_${i}_text`;
    const stopDate = cruise[dateKey];
    const stopText = cruise[textKey];

    // We *must* have text, but date can be missing ("At sea" days etc.)
    if (!stopText) continue;

    let isoDate: string;

    if (stopDate) {
      // Normal case: parse the date from Apify
      const yearMatch = baseLabel.match(/^(\d{4})/);
      const year = yearMatch ? yearMatch[1] : "2025";

      const m = String(stopDate).match(/(\d{1,2})\s+([A-Za-z]{3})/);
      if (m) {
        const [, dayStr, monthStr] = m;
        const label = `${year} ${monthStr} ${dayStr.padStart(2, "0")}`;
        isoDate = apifyDateLabelToIso(label) ?? lastIso;
      } else {
        isoDate = lastIso;
      }

      lastIso = isoDate;
    } else {
      // No date from Apify → synthesize based on previous stop
      if (lastIso) {
        isoDate = addDaysIso(lastIso, 1);
        lastIso = isoDate;
      } else {
        isoDate = params.sailDate;
        lastIso = isoDate;
      }
    }

    const portName = extractPortName(stopText);

    days.push({
      dayNumber: days.length + 1,
      date: isoDate,
      portName,
      rawStopText: stopText,
    });
  }

  console.log("Mapped Apify cruise days (raw):", days);

  // Align itinerary to the selected sail date:
  // drop any stops BEFORE params.sailDate, then re-number days.
  const sailIso = params.sailDate; // "YYYY-MM-DD"

  const filtered = days.filter((d) => {
    if (!d.date) return true;
    // string compare works because it's ISO "YYYY-MM-DD"
    return d.date >= sailIso;
  });

   const normalized = (filtered.length ? filtered : days).map(
    (d, index): CruiseDay => ({
      ...d,
      dayNumber: index + 1,
    })
  );

  console.log("Mapped Apify cruise days (aligned to sail date):", normalized);

  // 🔹 NEW: insert synthetic "At sea" days to fill gaps between port dates
  const expanded: CruiseDay[] = [];

  for (let i = 0; i < normalized.length; i++) {
    const current = normalized[i];
    expanded.push(current);

    if (i < normalized.length - 1) {
      const next = normalized[i + 1];

      // Only if both have valid dates
      if (current.date && next.date) {
        let cursor = current.date;

        // Walk forward one day at a time until we reach the next port date
        // For any missing day, add an "At sea" stop.
        while (true) {
          const nextDay = addDaysIso(cursor, 1);

          // Stop once we've reached or passed the next real stop date
          if (nextDay >= next.date) break;

          expanded.push({
            dayNumber: 0, // will be re-numbered below
            date: nextDay,
            portName: "At sea",
            rawStopText: "At sea",
          });

          cursor = nextDay;
        }
      }
    }
  }

  // Re-number all days sequentially
  const finalDays: CruiseDay[] = expanded.map((d, index) => ({
    ...d,
    dayNumber: index + 1,
  }));

  console.log("Mapped Apify cruise days (with sea days):", finalDays);

  return finalDays;
}

