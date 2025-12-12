export const PORT_LOOKUP: Record<
  string,
  { forecastLocation: string; lat: number; lon: number; nceiStationId?: string }
> = {
  // -------------------------
  // UNITED STATES — HOME PORTS
  // -------------------------
  "miami": {
    forecastLocation: "Miami, FL",
    lat: 25.7617,
    lon: -80.1918,
    nceiStationId: "USW00012839",
  },
  "fort lauderdale": {
    forecastLocation: "Fort Lauderdale, FL",
    lat: 26.1224,
    lon: -80.1373,
    nceiStationId: "USW00012849",
  },
  "port canaveral": {
    forecastLocation: "Port Canaveral, FL",
    lat: 28.4101,
    lon: -80.6372,
    nceiStationId: "USW00012815",
  },
  "tampa": {
    forecastLocation: "Tampa, FL",
    lat: 27.9506,
    lon: -82.4572,
    nceiStationId: "USW00012842",
  },
  "jacksonville": {
    forecastLocation: "Jacksonville, FL",
    lat: 30.3322,
    lon: -81.6557,
  },
  "mobile": {
    forecastLocation: "Mobile, AL",
    lat: 30.6954,
    lon: -88.0399,
  },
  "new orleans": {
    forecastLocation: "New Orleans, LA",
    lat: 29.9511,
    lon: -90.0715,
  },
  "galveston": {
    forecastLocation: "Galveston, TX",
    lat: 29.3013,
    lon: -94.7977,
    nceiStationId: "USW00012923",
  },
  "los angeles": {
    forecastLocation: "Los Angeles, CA",
    lat: 34.0522,
    lon: -118.2437,
  },
  "san pedro": {
    forecastLocation: "San Pedro, CA",
    lat: 33.7361,
    lon: -118.2923,
  },
  "long beach": {
    forecastLocation: "Long Beach, CA",
    lat: 33.7701,
    lon: -118.1937,
  },
  "san diego": {
    forecastLocation: "San Diego, CA",
    lat: 32.7157,
    lon: -117.1611,
  },
  "seattle": {
    forecastLocation: "Seattle, WA",
    lat: 47.6062,
    lon: -122.3321,
  },
  "new york": {
    forecastLocation: "New York, NY",
    lat: 40.7128,
    lon: -74.0060,
  },
  "cape liberty": {
    forecastLocation: "Bayonne, NJ",
    lat: 40.6687,
    lon: -74.1143,
  },
  "boston": {
    forecastLocation: "Boston, MA",
    lat: 42.3601,
    lon: -71.0589,
  },
  "baltimore": {
    forecastLocation: "Baltimore, MD",
    lat: 39.2904,
    lon: -76.6122,
  },

  // -------------------------
  // BAHAMAS
  // -------------------------
  "nassau": {
    forecastLocation: "Nassau, Bahamas",
    lat: 25.047984,
    lon: -77.355413,
  },
  "coco cay": {
    forecastLocation: "Coco Cay, Bahamas",
    lat: 25.816,
    lon: -77.945,
  },
  "half moon cay": {
    forecastLocation: "Half Moon Cay, Bahamas",
    lat: 24.5743,
    lon: -75.9513,
  },
  "princess cays": {
    forecastLocation: "Princess Cays, Bahamas",
    lat: 25.1436,
    lon: -77.259,
  },
  "bimini": {
    forecastLocation: "Bimini, Bahamas",
    lat: 25.728,
    lon: -79.298,
  },

  // -------------------------
  // CARIBBEAN
  // -------------------------
  "cozumel": {
    forecastLocation: "Cozumel, Mexico",
    lat: 20.4229839,
    lon: -86.9223432,
  },
  "costa maya": {
    forecastLocation: "Costa Maya, Mexico",
    lat: 18.7334,
    lon: -87.7006,
  },
  "progreso": {
    forecastLocation: "Progreso, Mexico",
    lat: 21.2833,
    lon: -89.6667,
  },
  "amber cove": {
    forecastLocation: "Amber Cove, Dominican Republic",
    lat: 19.757,
    lon: -70.568,
  },
  "puerto plata": {
    forecastLocation: "Puerto Plata, Dominican Republic",
    lat: 19.7808,
    lon: -70.6871,
  },
  "ocho rios": {
    forecastLocation: "Ocho Rios, Jamaica",
    lat: 18.4057,
    lon: -77.1048,
  },
  "falmouth": {
    forecastLocation: "Falmouth, Jamaica",
    lat: 18.4937,
    lon: -77.6550,
  },
  "montego bay": {
    forecastLocation: "Montego Bay, Jamaica",
    lat: 18.4762,
    lon: -77.8939,
  },
  "grand cayman": {
    forecastLocation: "George Town, Cayman Islands",
    lat: 19.2869,
    lon: -81.3678,
  },
  "roatan": {
    forecastLocation: "Roatán, Honduras",
    lat: 16.316,
    lon: -86.54,
  },
  "mahogany bay": {
    forecastLocation: "Mahogany Bay, Honduras",
    lat: 16.316,
    lon: -86.54,
  },
  "belize": {
    forecastLocation: "Belize City, Belize",
    lat: 17.5046,
    lon: -88.1962,
  },
  "grand turk": {
    forecastLocation: "Cockburn Town, Turks and Caicos",
    lat: 21.467458,
    lon: -71.13891,
  },
  "st thomas": {
    forecastLocation: "Charlotte Amalie, USVI",
    lat: 18.3419,
    lon: -64.9307,
  },
  "st maarten": {
    forecastLocation: "Philipsburg, St. Maarten",
    lat: 18.0260,
    lon: -63.0458,
  },
  "antigua": {
    forecastLocation: "St. John's, Antigua",
    lat: 17.1274,
    lon: -61.8468,
  },
  "st kitts": {
    forecastLocation: "Basseterre, St. Kitts",
    lat: 17.3026,
    lon: -62.7177,
  },
  "martinique": {
    forecastLocation: "Fort-de-France, Martinique",
    lat: 14.6104,
    lon: -61.08,
  },
  "grenada": {
    forecastLocation: "St. George's, Grenada",
    lat: 12.0561,
    lon: -61.7486,
  },
  "barbados": {
    forecastLocation: "Bridgetown, Barbados",
    lat: 13.1132,
    lon: -59.5988,
  },

  // -------------------------
  // BERMUDA
  // -------------------------
  "king's wharf": {
    forecastLocation: "Dockyard, Bermuda",
    lat: 32.325,
    lon: -64.837,
  },

  // -------------------------
  // PANAMA / CENTRAL AMERICA
  // -------------------------
  "cartagena": {
    forecastLocation: "Cartagena, Colombia",
    lat: 10.391,
    lon: -75.4794,
  },
  "colon": {
    forecastLocation: "Colón, Panama",
    lat: 9.3589,
    lon: -79.9001,
  },
  "puerto limon": {
    forecastLocation: "Puerto Limón, Costa Rica",
    lat: 9.99,
    lon: -83.036,
  },

  // -------------------------
  // MEDITERRANEAN
  // -------------------------
  "barcelona": {
    forecastLocation: "Barcelona, Spain",
    lat: 41.3851,
    lon: 2.1734,
  },
  "civitavecchia": {
    forecastLocation: "Civitavecchia, Italy",
    lat: 42.0924,
    lon: 11.7835,
  },
  "naples": {
    forecastLocation: "Naples, Italy",
    lat: 40.8518,
    lon: 14.2681,
  },
  "athens": {
    forecastLocation: "Piraeus, Greece",
    lat: 37.948,
    lon: 23.643,
  },
  "istanbul": {
    forecastLocation: "Istanbul, Türkiye",
    lat: 41.0082,
    lon: 28.9784,
  },
  "malta": {
    forecastLocation: "Valletta, Malta",
    lat: 35.8989,
    lon: 14.5146,
  },
  "kotor": {
    forecastLocation: "Kotor, Montenegro",
    lat: 42.4247,
    lon: 18.7712,
  },

  // -------------------------
  // NORTHERN EUROPE / NORWAY
  // -------------------------
  "bergen": {
    forecastLocation: "Bergen, Norway",
    lat: 60.3913,
    lon: 5.3221,
  },
  "flam": {
    forecastLocation: "Flåm, Norway",
    lat: 60.8611,
    lon: 7.1134,
  },
  "alesund": {
    forecastLocation: "Ålesund, Norway",
    lat: 62.4722,
    lon: 6.1549,
  },
  "geiranger": {
    forecastLocation: "Geiranger, Norway",
    lat: 62.1024,
    lon: 7.2057,
  },
  "maloy": {
    forecastLocation: "Måløy, Norway",
    lat: 61.9354,
    lon: 5.1139,
  },
  "floro": {
    forecastLocation: "Florø, Norway",
    lat: 61.5994,
    lon: 5.0328,
  },

  // -------------------------
  // MIDDLE EAST
  // -------------------------
  "dubai": {
    forecastLocation: "Dubai, UAE",
    lat: 25.2048,
    lon: 55.2708,
  },
  "abu dhabi": {
    forecastLocation: "Abu Dhabi, UAE",
    lat: 24.4539,
    lon: 54.3773,
  },
  "doha": {
    forecastLocation: "Doha, Qatar",
    lat: 25.2854,
    lon: 51.5310,
  },

  // -------------------------
  // ASIA
  // -------------------------
  "singapore": {
    forecastLocation: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
  },
  "tokyo": {
    forecastLocation: "Tokyo, Japan",
    lat: 35.6762,
    lon: 139.6503,
  },
  "osaka": {
    forecastLocation: "Osaka, Japan",
    lat: 34.6937,
    lon: 135.5023,
  },
  "hong kong": {
    forecastLocation: "Hong Kong",
    lat: 22.3193,
    lon: 114.1694,
  },
  "seoul": {
    forecastLocation: "Incheon, South Korea",
    lat: 37.4563,
    lon: 126.7052,
  },

  // -------------------------
  // AUSTRALIA / NEW ZEALAND
  // -------------------------
  "sydney": {
    forecastLocation: "Sydney, Australia",
    lat: -33.8688,
    lon: 151.2093,
  },
  "melbourne": {
    forecastLocation: "Melbourne, Australia",
    lat: -37.8136,
    lon: 144.9631,
  },
  "brisbane": {
    forecastLocation: "Brisbane, Australia",
    lat: -27.4698,
    lon: 153.0251,
  },
  "auckland": {
    forecastLocation: "Auckland, New Zealand",
    lat: -36.8485,
    lon: 174.7633,
  },
  "wellington": {
    forecastLocation: "Wellington, New Zealand",
    lat: -41.2865,
    lon: 174.7762,
  },

  // -------------------------
  // HAWAII
  // -------------------------
  "honolulu": {
    forecastLocation: "Honolulu, HI",
    lat: 21.3099,
    lon: -157.8581,
  },
  "kahului": {
    forecastLocation: "Kahului, Maui",
    lat: 20.889,
    lon: -156.47,
  },
  "hilo": {
    forecastLocation: "Hilo, Big Island",
    lat: 19.7297,
    lon: -155.09,
  },
  "kona": {
    forecastLocation: "Kailua-Kona, Big Island",
    lat: 19.63999,
    lon: -155.99693,
  },
  "nawiliwili": {
    forecastLocation: "Nawiliwili, Kauai",
    lat: 21.9639,
    lon: -159.352,
  },

  // -------------------------
  // ALASKA
  // -------------------------
  "juneau": {
    forecastLocation: "Juneau, AK",
    lat: 58.3019,
    lon: -134.4197,
    nceiStationId: "USW00025309",
  },
  "skagway": {
    forecastLocation: "Skagway, AK",
    lat: 59.4583,
    lon: -135.3139,
  },
  "ketchikan": {
    forecastLocation: "Ketchikan, AK",
    lat: 55.3422,
    lon: -131.6461,
  },
  "sitka": {
    forecastLocation: "Sitka, AK",
    lat: 57.0531,
    lon: -135.33,
  },

  // -------------------------
  // CANADA / NEW ENGLAND
  // -------------------------
  "halifax": {
    forecastLocation: "Halifax, Nova Scotia",
    lat: 44.6488,
    lon: -63.5752,
  },
  "saint john": {
    forecastLocation: "Saint John, New Brunswick",
    lat: 45.2733,
    lon: -66.0633,
  },
  "quebec city": {
    forecastLocation: "Québec City, Canada",
    lat: 46.8139,
    lon: -71.2082,
  },
  "charlottetown": {
    forecastLocation: "Charlottetown, PEI",
    lat: 46.2382,
    lon: -63.1311,
  },
  "portland maine": {
    forecastLocation: "Portland, ME",
    lat: 43.6591,
    lon: -70.2568,
  },

  // -------------------------
  // SOUTH AMERICA
  // -------------------------
  "buenos aires": {
    forecastLocation: "Buenos Aires, Argentina",
    lat: -34.6037,
    lon: -58.3816,
  },
  "rio de janeiro": {
    forecastLocation: "Rio de Janeiro, Brazil",
    lat: -22.9068,
    lon: -43.1729,
  },
  "valparaiso": {
    forecastLocation: "Valparaíso, Chile",
    lat: -33.0472,
    lon: -71.6127,
  },

  // -------------------------
  // TRANSATLANTIC FAVORITES
  // -------------------------
  "southampton": {
    forecastLocation: "Southampton, UK",
    lat: 50.9097,
    lon: -1.4043,
  },
  "lisbon": {
    forecastLocation: "Lisbon, Portugal",
    lat: 38.7223,
    lon: -9.1393,
  },
  "funchal": {
    forecastLocation: "Funchal, Madeira",
    lat: 32.6669,
    lon: -16.9241,
  }
};
