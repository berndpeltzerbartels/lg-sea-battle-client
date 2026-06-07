export const ENGINE_ORDERS = [
  { id: 0, name: "astern-full", speed: -4.2 },
  { id: 1, name: "astern-half", speed: -2.2 },
  { id: 2, name: "stop", speed: 0 },
  { id: 3, name: "ahead-slow", speed: 1.6 },
  { id: 4, name: "ahead-one-third", speed: 3.2 },
  { id: 5, name: "ahead-half", speed: 5.2 },
  { id: 6, name: "ahead-two-thirds", speed: 7.2 },
  { id: 7, name: "ahead-full", speed: 9.6 },
  { id: 8, name: "flank", speed: 12.4 }
];

export function engineOrderSpeed(engineOrderId) {
  return ENGINE_ORDERS[engineOrderId]?.speed ?? 0;
}
