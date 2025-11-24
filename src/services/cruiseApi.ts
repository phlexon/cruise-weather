// src/services/cruiseApi.ts

// ---------- Dataset config ----------

const APIFY_DATASET_ID = import.meta.env.VITE_APIFY_DATASET_ID;

if (!APIFY_DATASET_ID) {
  console.warn(
    "VITE_APIFY_DATASET_ID is missing. Cruise data will fail to load."
  );
}

// src/services/cruiseApi.ts

// 🔴 IMPORTANT: put the SAME dataset ID here that worked earlier in your app
// Example: "FfayYPyD3xppEzvzN" – but replace this with YOUR real ID.
const APIFY_DATASET_URL =
  "https://api.apify.com/v2/datasets/UMBo39qEIxobhPEUY/items?format=json&limit=1000&clean=true";



// ---------- Whitelist of cruise lines ----------

const WHITELIST_CRUISE_LINES = new Set<string>([
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

// ---------- option types ----------

export type CruiseLineOption = {
  id: string;
  name: string;
};

export type ShipOption = {
  id: string;
  name: string;
  lineId: string;
};

function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ---------- Apify base type ----------

type ApifyCruise = {
  id: string;
  ship_name: string;
  cruise_date: string; // e.g. "2025 Nov 09"
  cruise_title: string;
  cruise_price: string;
  cruise_line: string;
  [key: string]: any; // stop_1_text, stop_2_date, etc.
};

// ---------- fetch helper ----------

async function fetchApifyDataset(): Promise<ApifyCruise[]> {
  if (!APIFY_DATASET_URL) {
    throw new Error("APIFY_DATASET_URL is not configured.");
  }

  const res = await fetch(APIFY_DATASET_URL);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Apify dataset error:", res.status, text);
    throw new Error(`Apify dataset error: ${res.status}`);
  }
  const cruises: ApifyCruise[] = await res.json();
  return cruises ?? [];
}

// ---------- dynamic cruise options ----------

/**
 * Build dynamic cruise lines + ship lists from the Apify dataset,
 * filtered to the whitelisted cruise lines.
 */
export async function getCruiseOptionsFromApify(): Promise<{
  lines: CruiseLineOption[];
  ships: ShipOption[];
}> {
  const cruises = await fetchApifyDataset();

  const lineMapAll = new Map<string, CruiseLineOption>();
  const shipsAll: ShipOption[] = [];

  for (const c of cruises) {
    const lineName = c.cruise_line?.trim();
    const shipName = c.ship_name?.trim();
    if (!lineName || !shipName) continue;

    const lineId = slugifyId(lineName);
    if (!lineMapAll.has(lineId)) {
      lineMapAll.set(lineId, { id: lineId, name: lineName });
    }

    const shipId = slugifyId(`${lineName}-${shipName}`);
    if (!shipsAll.some((s) => s.id === shipId)) {
      shipsAll.push({ id: shipId, name: shipName, lineId });
    }
  }

  // Apply whitelist to lines
  const whitelistedLines = Array.from(lineMapAll.values()).filter((line) =>
    WHITELIST_CRUISE_LINES.has(line.name)
  );

  let finalLines: CruiseLineOption[];
  let finalShips: ShipOption[];

  if (whitelistedLines.length > 0) {
    // ✅ Normal case: whitelist matches something
    const allowedLineIds = new Set(whitelistedLines.map((l) => l.id));
    finalLines = whitelistedLines.sort((a, b) => a.name.localeCompare(b.name));
    finalShips = shipsAll
      .filter((s) => allowedLineIds.has(s.lineId))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // ⚠️ Fallback: whitelist matched nothing → show ALL lines/ships
    console.warn(
      "Cruise whitelist matched no lines; falling back to all cruise lines."
    );
    finalLines = Array.from(lineMapAll.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    finalShips = shipsAll.sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    lines: finalLines,
    ships: finalShips,
  };
}


// ---------- itinerary types & helpers ----------

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

/** Turn "Departing from Miami, Florida" into "Miami, Florida" */
function extractPortName(text: string): string {
  return text.replace(/^Departing from\s*/i, "").trim();
}

/** Parse "09 Nov 16:00" or "12 Nov 08:00 - 18:00" to "YYYY-MM-DD" */
function parseStopDateToIso(stopDate: string, cruiseDateLabel: string): string {
  // cruiseDateLabel looks like "2025 Nov 09"
  const yearMatch = cruiseDateLabel.match(/^(\d{4})/);
  const year = yearMatch ? yearMatch[1] : "2025";

  const m = stopDate.match(/(\d{2})\s+([A-Za-z]{3})/);
  if (!m) return cruiseDateLabel; // fallback
  const [, dayStr, monthStr] = m;

  const baseStr = `${year} ${monthStr} ${dayStr}`;
  const d = new Date(baseStr);
  if (Number.isNaN(d.getTime())) return cruiseDateLabel;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

// ---------- summaries & search ----------

export type CruiseSummary = {
  id: string;
  title: string;
  cruiseLine: string;
  shipName: string;
  departIso: string; // "YYYY-MM-DD"
  raw: ApifyCruise;
};

/** De-duplicate cruise summaries for the same logical sailing. */
function dedupeCruiseSummaries(cruises: CruiseSummary[]): CruiseSummary[] {
  const map = new Map<string, CruiseSummary>();

  for (const c of cruises) {
    const key = `${c.shipName.trim()}|${c.departIso}|${c.title.trim()}`;
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

/**
 * Return all cruises that depart on the given sailDate (YYYY-MM-DD).
 * Results are de-duplicated and filtered to whitelisted cruise lines.
 */
export async function searchCruisesByDate(
  sailDate: string
): Promise<CruiseSummary[]> {
  const cruises = await fetchApifyDataset();
  const matches: CruiseSummary[] = [];

  for (const c of cruises) {
    if (!c.cruise_date) continue;

    // Only keep whitelisted cruise lines
    const lineName = c.cruise_line?.trim();
    if (!lineName || !WHITELIST_CRUISE_LINES.has(lineName)) continue;

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

  deduped.sort((a, b) => {
    const shipCmp = a.shipName.localeCompare(b.shipName);
    if (shipCmp !== 0) return shipCmp;
    return a.title.localeCompare(b.title);
  });

  return deduped;
}

/**
 * Return all sailings for a given ship name (for the calendar).
 * Uses the same CruiseSummary shape.
 */
export async function getShipSailingsFromApify(
  shipName: string
): Promise<CruiseSummary[]> {
  if (!shipName) return [];

  const cruises = await fetchApifyDataset();
  const matches: CruiseSummary[] = [];

  const targetShip = shipName.trim().toLowerCase();

  for (const c of cruises) {
    const lineName = c.cruise_line?.trim();
    if (!lineName || !WHITELIST_CRUISE_LINES.has(lineName)) continue;

    const thisShip = c.ship_name?.trim().toLowerCase();
    if (!thisShip || thisShip !== targetShip) continue;

    const iso = apifyDateLabelToIso(c.cruise_date);
    if (!iso) continue;

    matches.push({
      id: c.id,
      title: c.cruise_title ?? "",
      cruiseLine: c.cruise_line ?? "",
      shipName: c.ship_name ?? "",
      departIso: iso,
      raw: c,
    });
  }

  const deduped = dedupeCruiseSummaries(matches);

  deduped.sort((a, b) => a.departIso.localeCompare(b.departIso));

  return deduped;
}

// ---------- itinerary lookup (ship + date, expanded with sea days) ----------

/**
 * Fetch itinerary for a given ship & sail date from Apify dataset.
 * Returns one CruiseDay per *calendar day* of the cruise, filling
 * gaps between ports with "Day at sea" so day counts match the
 * advertised length (e.g. 14 days).
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

  const targetShip = params.shipName.trim().toLowerCase();
  const targetLabel = formatToApifyDateLabel(params.sailDate); // "2025 Nov 30"
  const targetIso = params.sailDate; // "YYYY-MM-DD"

  console.log("Looking for ship/date:", targetShip, targetLabel);

  // Build candidate list: same ship AND (same label OR same ISO date)
  const candidates: ApifyCruise[] = cruises.filter((c) => {
    const shipName = c.ship_name?.trim().toLowerCase();
    const cruiseDate = c.cruise_date;
    if (!shipName || !cruiseDate) return false;
    if (shipName !== targetShip) return false;

    if (cruiseDate === targetLabel) return true;

    const iso = apifyDateLabelToIso(cruiseDate);
    return iso === targetIso;
  });

  let cruise: ApifyCruise;

  if (candidates.length > 0) {
    // Choose the candidate with the most stops (most complete itinerary)
    cruise = candidates.reduce((best, current) => {
      const bestStops = countCruiseStops(best);
      const currentStops = countCruiseStops(current);
      return currentStops > bestStops ? current : best;
    });
  } else {
    console.warn(
      "No exact itinerary match found for ship/date — falling back to first cruise for this ship (or first overall)."
    );
    const firstForShip =
      cruises.find(
        (c) => c.ship_name?.trim().toLowerCase() === targetShip
      ) ?? cruises[0];
    cruise = firstForShip;
  }

  console.log(
    "Using Apify cruise for itinerary:",
    cruise.ship_name,
    cruise.cruise_date,
    "stops:",
    countCruiseStops(cruise)
  );

  const baseLabel = cruise.cruise_date; // e.g. "2025 Nov 30"
  const rawDays: CruiseDay[] = [];

  // Start lastIso as the departure date if we can parse it, otherwise the requested sail date
  let lastIso = apifyDateLabelToIso(baseLabel) ?? params.sailDate;

  // Build raw *port* days, then we will expand to every calendar day.
  for (let i = 1; i <= 20; i++) {
    const dateKey = `stop_${i}_date`;
    const textKey = `stop_${i}_text`;

    const stopDateRaw = cruise[dateKey] as string | undefined;
    let stopText = cruise[textKey] as string | undefined;

    // If Apify has a date but no text, treat as "Day at sea" (rare but safe).
    if (!stopText && stopDateRaw) {
      stopText = "Day at sea";
    }

    // Nothing here at all → skip this index
    if (!stopText && !stopDateRaw) {
      continue;
    }

    // Decide the ISO date
    let isoDate: string;

    if (stopDateRaw && stopDateRaw.trim()) {
      // Normal case: Apify gave us a date string like "09 Nov 16:00"
      isoDate = parseStopDateToIso(stopDateRaw, baseLabel);
      lastIso = isoDate;
    } else {
      // No explicit date; synthesize based on the previous day
      if (lastIso) {
        isoDate = addDaysIso(lastIso, 1);
        lastIso = isoDate;
      } else {
        isoDate = params.sailDate;
        lastIso = isoDate;
      }
    }

    const portName = extractPortName(stopText ?? "");

    rawDays.push({
      dayNumber: rawDays.length + 1,
      date: isoDate,
      portName,
      rawStopText: stopText ?? "",
    });
  }

  console.log("Mapped Apify cruise days (raw ports only):", rawDays);

  // --- Expand raw port days into *every* calendar day -------------

  const validWithDates = rawDays.filter((d) => d.date);
  if (!validWithDates.length) {
    console.warn("No dated stops found; returning raw days.");
    return rawDays;
  }

  const byDate = new Map<string, CruiseDay>();
  for (const d of validWithDates) {
    if (!d.date) continue;
    if (!byDate.has(d.date)) {
      byDate.set(d.date, d);
    }
  }

  const sailIso = params.sailDate;
  const portDates = Array.from(byDate.keys()).sort();
  const lastPortDate = portDates[portDates.length - 1];

  if (!lastPortDate || lastPortDate < sailIso) {
    console.warn(
      "Last port date is before sail date; returning raw days.",
      sailIso,
      lastPortDate
    );
    return rawDays;
  }

  const expanded: CruiseDay[] = [];
  let currentIso = sailIso;
  let dayIndex = 1;

  while (currentIso <= lastPortDate) {
    const base = byDate.get(currentIso);

    if (base) {
      expanded.push({
        ...base,
        dayNumber: dayIndex,
        date: currentIso,
      });
    } else {
      expanded.push({
        dayNumber: dayIndex,
        date: currentIso,
        portName: "Day at sea",
        rawStopText: "Day at sea",
      });
    }

    dayIndex += 1;
    currentIso = addDaysIso(currentIso, 1);
  }

  console.log("Expanded cruise days (ports + sea days):", expanded);

  return expanded;
}
