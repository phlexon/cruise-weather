import { PORT_LOOKUP } from "./portLookup";

export function resolvePortLocation(rawPortName: string) {
  if (!rawPortName) {
    return { forecastLocation: "Miami, FL", lat: 25.7617, lon: -80.1918 };
  }

  const key = rawPortName.toLowerCase().trim();

  // Direct match
  if (PORT_LOOKUP[key]) {
    return PORT_LOOKUP[key];
  }

  // Partial match (e.g., "Cozumel, Mexico" matching "cozumel")
  const match = Object.keys(PORT_LOOKUP).find((k) => key.includes(k));
  if (match) {
    return PORT_LOOKUP[match];
  }

  // FINAL fallback: Miami as a safe default
  return { forecastLocation: "Miami, FL", lat: 25.7617, lon: -80.1918 };
}
