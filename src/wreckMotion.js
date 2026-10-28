// Parameters originate in ShipWreckSnapshot; elapsed-time motion matches WreckPhysics.java.
export function wreckPose(wreck, age) {
  const ship=wreck.ship;
  const duration=Number.isFinite(wreck.sinkSeconds)&&wreck.sinkSeconds>0?wreck.sinkSeconds:19;
  const depth=Number.isFinite(wreck.sinkDepth)?wreck.sinkDepth:39.05;
  age=Math.max(0,age);
  const t=Math.max(0,Math.min(1,age/duration));
  const ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const submerged=ship.vehicleType==='submarine'&&ship.y<-.88;
  const side=Number.isFinite(wreck.sinkSide)?wreck.sinkSide:1;
  return {x:ship.x,y:(ship.vehicleType==='torpedo-boat'?-.6:ship.y)-ease*depth,z:ship.z,
    pitch:submerged?0:-.28*ease,yaw:ship.heading,roll:submerged?0:side*(.12+1.45*ease),finished:age>=duration};
}
