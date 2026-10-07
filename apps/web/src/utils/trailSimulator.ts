export interface TrailWaypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  canopy_density: number;
  temperature_c: number;
  description: string;
}

export const OLYMPIC_TRAIL_WAYPOINTS: TrailWaypoint[] = [
  {
    id: "wp-1",
    name: "Valley Floor & Nurse Log Verge",
    latitude: 47.9250,
    longitude: -123.6300,
    elevation_m: 185,
    canopy_density: 0.88,
    temperature_c: 11.2,
    description: "Saturated mossy loam carpeted by sword ferns and decaying cedar nurse logs.",
  },
  {
    id: "wp-2",
    name: "Mid-Slope Hemlock Groves",
    latitude: 47.9350,
    longitude: -123.6430,
    elevation_m: 360,
    canopy_density: 0.65,
    temperature_c: 15.0,
    description: "Towering western hemlock and Sitka spruce filtering dappled morning sunlight.",
  },
  {
    id: "wp-3",
    name: "Old-Growth Douglas-fir Ridge",
    latitude: 47.9450,
    longitude: -123.6530,
    elevation_m: 610,
    canopy_density: 0.86,
    temperature_c: 15.2,
    description: "Thick grooved bark on centuries-old conifers with rich cone caches.",
  },
  {
    id: "wp-4",
    name: "Eagle Eye Rocky Bluff",
    latitude: 47.9550,
    longitude: -123.6630,
    elevation_m: 870,
    canopy_density: 0.15,
    temperature_c: 19.5,
    description: "Open windward precipice catching warm thermal updrafts from the valley.",
  },
  {
    id: "wp-5",
    name: "Subalpine Berry Meadow",
    latitude: 47.9650,
    longitude: -123.6730,
    elevation_m: 1210,
    canopy_density: 0.25,
    temperature_c: 8.8,
    description: "High elevation alpine scrub dotted with wild mountain huckleberry shrubs.",
  },
];
