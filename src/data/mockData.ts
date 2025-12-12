export const cruiseLines = [
  { id: "rcl", name: "Royal Caribbean" },
  { id: "ccl", name: "Carnival" },
  { id: "dcl", name: "Disney Cruise Line" }
];

export const ships = [
  { id: "oasis", name: "Oasis of the Seas", lineId: "rcl" },
  { id: "allure", name: "Allure of the Seas", lineId: "rcl" },
  { id: "vista", name: "Carnival Vista", lineId: "ccl" },
  { id: "magic", name: "Carnival Magic", lineId: "ccl" },
  { id: "dream", name: "Disney Dream", lineId: "dcl" }
];

export const sampleItinerary = [
  {
    dayNumber: 1,
    date: "2025-02-01",
    location: "Miami (Embarkation)",
    description: "Hot & sunny, perfect sail away day.",
    icon: "sunny",
    high: 86,
    low: 76,
    rainChance: 10
  },
  {
    dayNumber: 2,
    date: "2025-02-02",
    location: "At Sea",
    description: "Warm with a light breeze.",
    icon: "partly",
    high: 84,
    low: 75,
    rainChance: 15
  },
  {
    dayNumber: 3,
    date: "2025-02-03",
    location: "Cozumel",
    description: "Partly cloudy, great for excursions.",
    icon: "partly",
    high: 85,
    low: 77,
    rainChance: 20
  }
];
