import type { VercelRequest, VercelResponse } from "@vercel/node";

type NceiMonthlyNormalRow = {
  STATION: string;
  NAME: string;
  MONTH?: string;
  DATE?: string;
  "MLY-TMAX-NORMAL"?: string;
  "MLY-TMIN-NORMAL"?: string;
  "MLY-TAVG-NORMAL"?: string;
  "MLY-PRCP-NORMAL"?: string;
};

// Example normals for Fort Lauderdale (USW00012849)
const SAMPLE_NORMALS: Record<string, NceiMonthlyNormalRow[]> = {
  USW00012849: [
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "1", "MLY-TMAX-NORMAL": "76", "MLY-TMIN-NORMAL": "60", "MLY-PRCP-NORMAL": "2.5" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "2", "MLY-TMAX-NORMAL": "78", "MLY-TMIN-NORMAL": "62", "MLY-PRCP-NORMAL": "2.3" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "3", "MLY-TMAX-NORMAL": "80", "MLY-TMIN-NORMAL": "65", "MLY-PRCP-NORMAL": "3.0" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "4", "MLY-TMAX-NORMAL": "83", "MLY-TMIN-NORMAL": "69", "MLY-PRCP-NORMAL": "3.4" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "5", "MLY-TMAX-NORMAL": "86", "MLY-TMIN-NORMAL": "73", "MLY-PRCP-NORMAL": "5.4" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "6", "MLY-TMAX-NORMAL": "88", "MLY-TMIN-NORMAL": "76", "MLY-PRCP-NORMAL": "7.3" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "7", "MLY-TMAX-NORMAL": "89", "MLY-TMIN-NORMAL": "77", "MLY-PRCP-NORMAL": "6.4" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "8", "MLY-TMAX-NORMAL": "90", "MLY-TMIN-NORMAL": "77", "MLY-PRCP-NORMAL": "7.0" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "9", "MLY-TMAX-NORMAL": "89", "MLY-TMIN-NORMAL": "77", "MLY-PRCP-NORMAL": "8.3" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "10", "MLY-TMAX-NORMAL": "86", "MLY-TMIN-NORMAL": "74", "MLY-PRCP-NORMAL": "6.3" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "11", "MLY-TMAX-NORMAL": "81", "MLY-TMIN-NORMAL": "69", "MLY-PRCP-NORMAL": "4.1" },
    { STATION: "USW00012849", NAME: "FORT LAUDERDALE INTL", MONTH: "12", "MLY-TMAX-NORMAL": "78", "MLY-TMIN-NORMAL": "63", "MLY-PRCP-NORMAL": "2.6" },
  ],

  DEFAULT: [
    {
      STATION: "DEFAULT",
      NAME: "GENERIC MARITIME CLIMATE",
      MONTH: "1",
      "MLY-TMAX-NORMAL": "75",
      "MLY-TMIN-NORMAL": "60",
      "MLY-PRCP-NORMAL": "3.0",
    },
  ]
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const stationId = (req.query.stationId || "").toString().trim().toUpperCase();
  console.log("[API] Request for station", stationId);

  const rows = SAMPLE_NORMALS[stationId] || SAMPLE_NORMALS.DEFAULT;
  res.status(200).json(rows);
}
