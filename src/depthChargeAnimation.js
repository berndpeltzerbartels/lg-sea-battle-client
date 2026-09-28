import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';

const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

// Visual-only controller: explicit triggers can later come from replicated server events.
export function createDepthChargeAnimator(model, { onLaunch = () => {}, onSplash = () => {}, onChange = () => {}, replenishMagazine = false, queueWhileReloading = false } = {}) {
  const cupPositions = model.racks.map(rack => rack.cup?.position.clone());
  const initial = model.racks.map(rack => rack.charges.map(charge => ({
    parent: charge.root.parent, position: charge.root.position.clone(), rotation: charge.root.rotation.clone(), enabled: charge.root.isEnabled()
  })));
  const lanes = model.racks.map(() => ({ loaded: 0, reserve: 1, animation: null, pending: null }));
  let sequence = 0;
  let disposed = false;

  function setArm(rack, angle) {
    if (!rack.loadingArm) return;
    rack.loadingArm.rotation.z = angle;
    rack.loadingCradle.rotation.z = -angle;
  }

  function launch(rack, animation) {
    const thrower = !!rack.cup;
    const source = rack.charges[animation.chargeIndex];
    const world = source.mesh.computeWorldMatrix(true).clone();
    const projectile = source.mesh.clone(`${source.mesh.name}_flight_${sequence++}`, null, true);
    projectile.parent = null;
    projectile.rotationQuaternion = Quaternion.Identity();
    world.decompose(projectile.scaling, projectile.rotationQuaternion, projectile.position);
    projectile.setEnabled(true);
    source.root.setEnabled(false);
    const direction = Vector3.TransformNormal(thrower ? new Vector3(Math.sign(rack.root.position.x), 0, 0) : new Vector3(0, 0, -1), rack.root.computeWorldMatrix(true)).normalize();
    const velocity = direction.scale(thrower ? 20 : 1.2).add(animation.shipVelocity);
    velocity.y += thrower ? 4.5 : 0;
    const origin = projectile.position.clone();
    const flightTime = (velocity.y + Math.sqrt(velocity.y ** 2 + 19.62 * Math.max(0, origin.y))) / 9.81;
    // Offline preview mirrors the server's lateral spread; gameplay always supplies its impact point.
    const landingPosition = animation.landingPosition ?? (thrower
      ? Vector3.TransformCoordinates(new Vector3(0, 0, rack.root.position.z), model.root.computeWorldMatrix(true))
        .add(direction.scale(24)).add(animation.shipVelocity.scale(1.3))
      : null);
    if (landingPosition && flightTime > 0) {
      velocity.x = (landingPosition.x - origin.x) / flightTime;
      velocity.z = (landingPosition.z - origin.z) / flightTime;
    }
    animation.flight = { mesh: projectile, origin, velocity, flightTime, rotation: projectile.rotationQuaternion.clone() };
    animation.launched = true;
    onLaunch(origin.clone(), direction, thrower);
  }

  function updateFlight(animation) {
    const flight = animation.flight;
    if (!flight) return;
    const t = Math.min(Math.max(0, animation.age - animation.launchAt), flight.flightTime);
    flight.mesh.position.copyFrom(flight.origin.add(flight.velocity.scale(t)));
    flight.mesh.position.y -= 4.905 * t * t;
    flight.mesh.rotationQuaternion.copyFrom(flight.rotation.multiply(Quaternion.RotationAxis(Vector3.Right(), t * 1.8)));
    if (t >= flight.flightTime) {
      const impact = flight.mesh.position.clone();
      impact.y = 0;
      flight.mesh.dispose();
      animation.flight = null;
      onSplash(impact, flight.velocity.clone());
    }
  }

  const controller = {
    get active() { return lanes.some(lane => lane.animation); },
    state() {
      return lanes.map(lane => ({ busy: !!lane.animation, remaining: Number(lane.loaded !== null) + Number(lane.reserve !== null) }));
    },
    fire(index, shipVelocity = Vector3.Zero(), landingPosition = null) {
      const lane = lanes[index];
      const thrower = !!model.racks[index]?.cup;
      // A server release may arrive just before the last local reload frame.
      if (!disposed && lane?.animation && queueWhileReloading && replenishMagazine && !lane.pending) {
        lane.pending = { velocity: shipVelocity.clone(), position: landingPosition?.clone() ?? null };
        return true;
      }
      if (disposed || !lane || lane.animation || lane.loaded === null) return false;
      lane.animation = { age: 0, chargeIndex: lane.loaded, reloadIndex: lane.reserve, shipVelocity: shipVelocity.clone(), launchAt: thrower ? 0 : .45, launched: false, transferStarted: false, seated: false, flight: null };
      lane.loaded = null;
      lane.animation.landingPosition = landingPosition?.clone() ?? null;
      if (thrower) launch(model.racks[index], lane.animation);
      onChange(controller.state());
      return true;
    },
    update(dt) {
      if (disposed || !Number.isFinite(dt) || dt <= 0) return;
      lanes.forEach((lane, index) => {
        const animation = lane.animation;
        if (!animation) return;
        const rack = model.racks[index];
        const thrower = !!rack.cup;
        animation.age += dt;
        const age = animation.age;
        if (thrower) {
          const stroke = .065 * (smooth(age / .1) - smooth((age - .16) / .45));
          rack.cup.position.copyFrom(cupPositions[index]);
          rack.cup.position.x += Math.sign(rack.root.position.x) * stroke;
          rack.cup.position.y += stroke;
        }
        if (!thrower && !animation.launched) {
          const charge = rack.charges[animation.chargeIndex].root;
          const progress = Math.min(age / .45, 1);
          charge.position.z = initial[index][0].position.z - .15 * progress * progress;
          charge.rotation.x = -.15 * progress * progress / .051;
        }
        if (!thrower) rack.gate.rotation.x = -1.4 * (smooth(age / .18) - smooth((age - .65) / .3));
        if (!animation.launched && age >= animation.launchAt) launch(rack, animation);
        updateFlight(animation);
        if (animation.reloadIndex !== null && age >= 1.2) {
          const spare = rack.charges[animation.reloadIndex].root;
          if (!animation.transferStarted) {
            spare.setEnabled(true);
            if (thrower) {
              spare.parent = rack.loadingCradle;
              spare.position.setAll(0);
            }
            animation.transferStarted = true;
          }
          const progress = smooth((age - 1.2) / 1.6);
          if (!animation.seated) {
            if (thrower) setArm(rack, rack.armRestAngle + (rack.armLoadAngle - rack.armRestAngle) * progress);
            else {
              Vector3.LerpToRef(initial[index][1].position, initial[index][0].position, progress, spare.position);
              spare.rotation.x = -(initial[index][1].position.z - initial[index][0].position.z) * progress / .051;
            }
            if (progress >= 1) {
              spare.parent = initial[index][0].parent;
              spare.position.copyFrom(initial[index][0].position);
              spare.rotation.copyFrom(initial[index][0].rotation);
              lane.loaded = animation.reloadIndex;
              lane.reserve = null;
              animation.seated = true;
            }
          }
          if (thrower && age >= 3) setArm(rack, rack.armLoadAngle + (rack.armRestAngle - rack.armLoadAngle) * smooth((age - 3) / 1.2));
        }
        const refill = replenishMagazine && animation.seated;
        if (refill && age >= 2.9 && !animation.flight) {
          // Reuse the hidden fired model for the next magazine round; no geometry accumulates.
          const incoming = rack.charges[animation.chargeIndex].root;
          if (!animation.refillStarted) {
            incoming.parent = initial[index][1].parent;
            incoming.rotation.copyFrom(initial[index][1].rotation);
            incoming.setEnabled(true);
            animation.refillStarted = true;
          }
          if (thrower) {
            incoming.position.copyFrom(initial[index][1].position);
            incoming.position.y -= .12 * (1 - smooth((age - 3.8) / .9));
            incoming.setEnabled(age >= 3.8);
          } else {
            const rise = smooth((age - 2.9) / 1.2);
            const roll = smooth((age - 4.1) / .6);
            incoming.position.set(0, -.052 + .119 * rise, .28 - .055 * rise);
            if (age >= 4.1) {
              incoming.position.y = .067 + (initial[index][1].position.y - .067) * roll;
              incoming.position.z = .225 + (initial[index][1].position.z - .225) * roll;
            }
            incoming.rotation.x = -(.055 * rise + .045 * roll) / .051;
          }
          if (age >= 4.7) lane.reserve = animation.chargeIndex;
        }
        const finishAt = refill ? 4.8 : (animation.reloadIndex === null ? 1 : (thrower ? 4.25 : 2.9));
        if (age >= finishAt && animation.launched && !animation.flight) {
          lane.animation = null;
          onChange(controller.state());
          if (lane.pending) {
            const pending = lane.pending;
            lane.pending = null;
            controller.fire(index, pending.velocity, pending.position);
          }
        }
      });
    },
    reset() {
      if (disposed || controller.active) return false;
      model.racks.forEach((rack, index) => {
        rack.charges.forEach((charge, chargeIndex) => {
          const rest = initial[index][chargeIndex];
          charge.root.parent = rest.parent;
          charge.root.position.copyFrom(rest.position);
          charge.root.rotation.copyFrom(rest.rotation);
          charge.root.setEnabled(rest.enabled);
        });
        setArm(rack, rack.armRestAngle);
        if (rack.gate) rack.gate.rotation.x = 0;
        if (rack.cup) rack.cup.position.copyFrom(cupPositions[index]);
        lanes[index] = { loaded: 0, reserve: 1, animation: null, pending: null };
      });
      onChange(controller.state());
      return true;
    },
    dispose() {
      for (const lane of lanes) { lane.animation?.flight?.mesh.dispose(); lane.animation = null; lane.pending = null; }
      disposed = true;
    }
  };
  return controller;
}
