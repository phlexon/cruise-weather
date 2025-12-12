// ============================================================
// resolvePortLocation.ts
// Returns { forecastLocation: "lat,lon", nceiStationId }
// ============================================================

export function resolvePortLocation(raw: string): {
  forecastLocation: string;
  nceiStationId?: string;
} {
  if (!raw) {
    return {
      forecastLocation: "25.7617,-80.1918", // Miami fallback
      nceiStationId: "USW00012839"
    };
  }

  const key = raw.toLowerCase();

  // -------------------------
  // FLORIDA / BAHAMAS / CARIBBEAN
  // -------------------------
  if (key.includes("fort lauderdale") || key.includes("port everglades")) {
    return {
      forecastLocation: "26.1224,-80.1373",
      nceiStationId: "USW00012849"
    };
  }

  if (key.includes("miami")) {
    return {
      forecastLocation: "25.7617,-80.1918",
      nceiStationId: "USW00012839"
    };
  }

  if (key.includes("nassau")) {
    return {
      forecastLocation: "25.0478,-77.3554"
    };
  }

  if (key.includes("bimini")) {
    return {
      forecastLocation: "25.7280,-79.3000"
    };
  }

  if (key.includes("cozumel")) {
    return {
      forecastLocation: "20.4220,-86.9223"
    };
  }

  // -------------------------
  // EUROPE (ADD MORE AS NEEDED)
  // -------------------------
  if (key.includes("barcelona")) {
    return {
      forecastLocation: "41.3851,2.1734"
    };
  }

  if (key.includes("livorno") || key.includes("pisa")) {
    return {
      forecastLocation: "43.5485,10.3106"
    };
  }

  if (key.includes("civitavecchia")) {
    return {
      forecastLocation: "42.0930,11.7920"
    };
  }

  if (key.includes("santa cruz de la palma")) {
    return {
      forecastLocation: "28.6833,-17.7667"
    };
  }

  // -------------------------
  // FALLBACK
  // -------------------------
  return {
    forecastLocation: "25.7617,-80.1918",
    nceiStationId: "USW00012839"
  };
}
