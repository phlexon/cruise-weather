// api/ncei-normals.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow frontend from any origin (for local dev + prod)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const stationId = req.query.stationId;
  if (!stationId || typeof stationId !== "string") {
    res.status(400).json({ error: "Missing or invalid stationId" });
    return;
  }

  try {
    const url = new URL("https://www.ncei.noaa.gov/access/services/data/v1");
    url.searchParams.set("dataset", "normals-monthly-1991-2020");
    url.searchParams.set("stations", stationId);
    url.searchParams.set("format", "json");
    url.searchParams.set(
      "dataTypes",
      [
        "MLY-TMAX-NORMAL",
        "MLY-TMIN-NORMAL",
        "MLY-TAVG-NORMAL",
        "MLY-PRCP-NORMAL",
      ].join(",")
    );
    url.searchParams.set("startDate", "0001-01-01");
    url.searchParams.set("endDate", "9996-12-31");
    url.searchParams.set("units", "standard");

    const upstream = await fetch(url.toString());
    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/json"
    );
    res.send(text);
  } catch (err) {
    console.error("Error proxying NCEI normals:", err);
    res.status(500).json({ error: "Failed to fetch NCEI normals" });
  }
}
