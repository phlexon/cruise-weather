import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const stationId = req.query.stationId as string;

  if (!stationId) {
    return res.status(400).json({ error: "Missing stationId" });
  }

  const token = process.env.NCEI_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "Missing NCEI_TOKEN env variable" });
  }

  const url =
    `https://www.ncei.noaa.gov/cdo-web/api/v2/normals/monthly?station=${stationId}`;

  try {
    const reply = await fetch(url, {
      headers: {
        token,
        "Content-Type": "application/json",
      },
    });

    const json = await reply.json();
    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: "Proxy failed", details: err });
  }
}
