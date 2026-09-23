// Match the server's editor-to-world coordinate and base-height contract.
// The sampling grid is local to the bounds center, exactly as in WorldMap.
export function editorIslandToLand(island, landscape) {
  const xs = island.polygon.map(p => Number(p.x));
  const zs = island.polygon.map(p => Number(p.z));
  const seaFloorHeight = Number(island.seaFloorHeight ?? -80);
  const baseLevel = island.baseLevel ?? "seaFloor";
  let baseHeight = seaFloorHeight;
  if (baseLevel === "beach") baseHeight = 0.1;
  if (baseLevel === "plateau") {
    const base = landscape?.islands?.find(candidate => candidate.id === island.baseLandmassId);
    const points = (base?.heights ?? []).filter(point => point.plateauGroupId === island.basePlateauGroupId);
    baseHeight = points.length ? points.reduce((sum, point) => sum + Number(point.h), 0) / points.length : 0.1;
  }
  return {
    ...island,
    name: island.id,
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    z: (Math.min(...zs) + Math.max(...zs)) / 2,
    seaFloorHeight,
    baseHeight,
    baseLevel,
    heightPoints: island.heights ?? []
  };
}
