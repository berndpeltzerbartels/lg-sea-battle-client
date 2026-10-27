// Fixed pool: water-anchored trail plus a small pressure wave at the two real mast positions.
export function createPeriscopeFoamState(scale, capacity = 144) {
  const headCount = 20;
  const patches = Array.from({length:capacity + headCount}, () => ({born:-Infinity}));
  let now=0, cursor=0, serial=0, lastX=NaN, lastZ=NaN, distanceLeft=0;
  const spacing=.13*scale;
  function reset() { for(const p of patches)p.born=-Infinity; lastX=lastZ=NaN; distanceLeft=0; }
  function update(position, heading, speed, strength, dt) {
    now+=Math.max(0,dt);
    if(!Number.isFinite(lastX)){lastX=position.x;lastZ=position.z;}
    const dx=position.x-lastX,dz=position.z-lastZ,distance=Math.hypot(dx,dz);
    if(distance>scale*30){reset();lastX=position.x;lastZ=position.z;return;}
    const emitting=Math.abs(speed)>.3 && strength>.04;
    const sin=Math.sin(heading),cos=Math.cos(heading),sign=speed>=0?1:-1;
    if(emitting && distance>0) {
      let offset=spacing-distanceLeft, count=0;
      while(offset<=distance && count++<12) {
        const t=offset/distance;
        for(let lane=-1;lane<=1;lane++) {
          const p=patches[cursor];cursor=(cursor+1)%capacity;
          const seed=((serial++*37)%101)/100;
          const x=lane*.045*scale,z=(.11-sign*(.02+seed*.025))*scale;
          p.x=lastX+dx*t+cos*x+sin*z; p.z=lastZ+dz*t-sin*x+cos*z;
          p.heading=heading+lane*.18; p.born=now; p.life=((lane===0?.55:.9)+strength*.5)*1.5;
          p.width=scale*(lane===0?.045:.032)*(.55+.45*strength);
          p.length=scale*(.1+seed*.055)*(.55+.45*strength);
          p.strength=strength; p.seed=seed; p.lane=lane;
          p.coreSeconds=.18*strength;
        }
        offset+=spacing;
      }
      distanceLeft=(distanceLeft+distance)%spacing;
    } else distanceLeft=0;
    if(emitting) {
      let index=capacity;
      for(const mastZ of [.022,.184]) for(const side of [-1,1]) for(let segment=0;segment<5;segment++) {
        const row=segment*.5;
        const p=patches[index++];
        const size=.45+.55*strength;
        const x=side*(.024+row*.046)*scale*size;
        const z=(mastZ+sign*(.035-row*.085)*size)*scale;
        p.x=position.x+cos*x+sin*z; p.z=position.z-sin*x+cos*z;
        p.heading=heading-side*sign*.5; p.born=now-.12; p.life=.36;
        p.width=scale*(.019+strength*.023); p.length=scale*(.045+strength*.055);
        p.strength=strength; p.seed=(row+side+mastZ)*.37; p.head=true;
        p.opacity=(.18+.82*strength)*(1-row*.08);
      }
    }
    lastX=position.x;lastZ=position.z;
  }
  return {patches,update,reset,get now(){return now;}};
}
