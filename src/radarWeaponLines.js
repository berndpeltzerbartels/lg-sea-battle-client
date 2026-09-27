export function drawRadarWeaponLines(ctx, centerX, centerY, radius, radarHeading, shipHeading, cannonYaw, flakYaw) {
  for (const yaw of [cannonYaw, flakYaw]) {
    if (![yaw, radarHeading, shipHeading].every(Number.isFinite)) continue;
    const angle = shipHeading + yaw - radarHeading;
    const dx = Math.sin(angle), dy = -Math.cos(angle);
    ctx.save();
    ctx.strokeStyle = 'rgba(155, 229, 223, 0.42)';
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(centerX + dx * radius * 0.12, centerY + dy * radius * 0.12);
    ctx.lineTo(centerX + dx * radius * 0.86, centerY + dy * radius * 0.86);
    ctx.stroke();
    ctx.restore();
  }
}
