export const worldLandmasses = [
  {
    kind: "coastline",
    name: "western_coast",
    x: -126,
    z: 58,
    rx: 72,
    rz: 66,
    heightScale: 1,
    coastRoughness: 0.22,
    fjords: [
      { angle: 1.95, width: 0.2, reach: 0.9 }
    ]
  },
  { kind: "island", name: "north_island", x: -32, z: 54, radius: 21, heightScale: 1.1, rx: 28, rz: 22 },
  { kind: "island", name: "east_island", x: 58, z: 10, radius: 28, heightScale: 0.9, rx: 36, rz: 27 },
  { kind: "island", name: "south_island", x: 18, z: -76, radius: 24, heightScale: 1.25, rx: 32, rz: 25 },
  { kind: "island", name: "far_island", x: -92, z: -26, radius: 16, heightScale: 0.75, rx: 22, rz: 17 },
  {
    kind: "coastline",
    name: "volcanic_highland",
    x: 312,
    z: -214,
    rx: 86,
    rz: 74,
    heightScale: 1.55,
    peakBoost: 34,
    coastRoughness: 0.22,
    caldera: { radius: 0.38, rim: 0.18, depth: 18 },
    fjords: [
      { angle: 2.72, width: 0.17, reach: 0.88 },
      { angle: -1.18, width: 0.14, reach: 0.76 }
    ]
  },
  {
    kind: "coastline",
    name: "fjord_coast",
    x: 194,
    z: -344,
    rx: 64,
    rz: 54,
    heightScale: 1.05,
    peakBoost: 10,
    coastRoughness: 0.24,
    fjords: [
      { angle: 0.42, width: 0.18, reach: 0.82 },
      { angle: -2.38, width: 0.13, reach: 0.7 }
    ]
  },
  { kind: "island", name: "outer_stack", x: 410, z: -315, radius: 22, heightScale: 1.0, rx: 30, rz: 23 },
  { kind: "island", name: "needle_rocks", x: 240, z: -112, radius: 17, heightScale: 1.35, rx: 24, rz: 18 },
  { kind: "island", name: "low_skerries", x: 118, z: -238, radius: 14, heightScale: 0.82, rx: 20, rz: 16 },
  {
    kind: "coastline",
    name: "storm_peak",
    x: -430,
    z: -405,
    rx: 78,
    rz: 62,
    heightScale: 2.05,
    peakBoost: 82,
    coastRoughness: 0.2,
    fjords: [
      { angle: 0.9, width: 0.13, reach: 0.72 }
    ]
  },
  { kind: "island", name: "storm_north_stack", x: -372, z: -312, radius: 16, heightScale: 1.15, rx: 22, rz: 17 },
  { kind: "island", name: "storm_west_rocks", x: -536, z: -390, radius: 18, heightScale: 1.0, rx: 25, rz: 18 },
  { kind: "island", name: "storm_south_skerries", x: -462, z: -512, radius: 14, heightScale: 0.9, rx: 20, rz: 16 },
  { kind: "island", name: "storm_outer_needle", x: -318, z: -482, radius: 12, heightScale: 1.45, rx: 18, rz: 14 },
  { kind: "island", name: "l_passage_west_arm", x: 486, z: -548, radius: 24, heightScale: 1.0, rx: 38, rz: 20 },
  { kind: "island", name: "l_passage_north_arm", x: 536, z: -502, radius: 22, heightScale: 0.95, rx: 22, rz: 38 },
  { kind: "island", name: "l_passage_outer_rock", x: 592, z: -555, radius: 15, heightScale: 1.2, rx: 20, rz: 16 },
  {
    kind: "coastline",
    name: "northern_ridge",
    x: 24,
    z: 760,
    rx: 220,
    rz: 96,
    heightScale: 1.28,
    peakBoost: 38,
    coastRoughness: 0.24,
    fjords: [
      { angle: 3.02, width: 0.12, reach: 0.8 },
      { angle: -2.52, width: 0.16, reach: 0.68 }
    ]
  },
  {
    kind: "coastline",
    name: "eastern_delta_coast",
    x: 835,
    z: 118,
    rx: 168,
    rz: 128,
    heightScale: 0.72,
    peakBoost: 4,
    coastRoughness: 0.28,
    fjords: [
      { angle: -1.78, width: 0.2, reach: 0.88 },
      { angle: -1.42, width: 0.15, reach: 0.72 },
      { angle: -2.05, width: 0.13, reach: 0.64 }
    ],
    waterways: [
      { from: { x: 86, z: 8 }, to: { x: 22, z: 0 }, width: 18 },
      { from: { x: 22, z: 0 }, to: { x: -52, z: -10 }, width: 30 },
      { from: { x: -52, z: -10 }, to: { x: -154, z: -80 }, width: 18 },
      { from: { x: -46, z: -3 }, to: { x: -164, z: 0 }, width: 20 },
      { from: { x: -38, z: 6 }, to: { x: -138, z: 72 }, width: 17 }
    ],
    lakes: [
      { x: -48, z: -5, rx: 32, rz: 21 }
    ]
  },
  { kind: "island", name: "delta_outer_bar", x: 632, z: 92, radius: 13, heightScale: 0.7, rx: 19, rz: 15 },
  { kind: "island", name: "delta_split_rocks", x: 672, z: 164, radius: 11, heightScale: 0.8, rx: 16, rz: 13 },
  { kind: "island", name: "delta_south_bar", x: 604, z: 18, radius: 12, heightScale: 0.65, rx: 17, rz: 14 },
  {
    kind: "coastline",
    name: "southern_cliffs",
    x: 148,
    z: -855,
    rx: 232,
    rz: 118,
    heightScale: 1.38,
    peakBoost: 24,
    coastRoughness: 0.24,
    fjords: [
      { angle: 0.12, width: 0.14, reach: 0.78 },
      { angle: -0.48, width: 0.11, reach: 0.66 }
    ]
  },
  { kind: "island", name: "southern_gate_rocks", x: -96, z: -706, radius: 18, heightScale: 1.15, rx: 25, rz: 18 },
  { kind: "island", name: "southern_outer_stack", x: 332, z: -698, radius: 20, heightScale: 1.05, rx: 28, rz: 21 },
  {
    kind: "coastline",
    name: "western_continent",
    x: -2350,
    z: 120,
    rx: 820,
    rz: 1750,
    heightScale: 1.18,
    peakBoost: 46,
    coastRoughness: 0.26,
    fjords: [
      { angle: 1.46, width: 0.1, reach: 0.78 },
      { angle: 1.18, width: 0.16, reach: 0.62 },
      { angle: 1.82, width: 0.13, reach: 0.68 },
      { angle: 2.22, width: 0.1, reach: 0.55 }
    ]
  },
  { kind: "island", name: "western_sound_stack", x: -1310, z: 520, radius: 28, heightScale: 1.2, rx: 38, rz: 28 },
  { kind: "island", name: "western_south_rocks", x: -1460, z: -630, radius: 22, heightScale: 1.05, rx: 30, rz: 24 }
];

export function worldMapSnapshot() {
  return {
    version: 1,
    landmasses: worldLandmasses
  };
}
