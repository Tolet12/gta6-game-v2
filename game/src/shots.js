// ?shot=<scene> staging: pose real gameplay states, then let the real
// simulation run so every frame is alive. Deterministic from the seed.
export function applyShot(api, name) {
  const S = api.internals;
  const { missions, wanted, police, player } = api;
  if (name === 'cover') {
    S.money = 250; S.rep = 2;
    missions.start(0);
    // A fresh red car on the central avenue, rolling north through downtown.
    const c = api.spawnCar(3.4, 150, Math.PI, 0xe23b3b);
    player.x = c.x + 2; player.z = c.z;
    api.enterNearestCar();
    if (S.driving) { S.driving.speed = 16; S.driving.health = 9999; S.carCamAngle = Math.PI; }
    S.cruise = 0.7;
    S.camYaw = Math.PI;
  } else if (name === 'chase') {
    S.money = 640; S.rep = 3;
    const c = api.spawnCar(56.6, 100, Math.PI, 0xffc93f);
    // Clear traffic out of the chase segment so nothing T-bones the shot.
    for (const t of api.traffic) if (Math.abs(t.x - 56.6) < 9 && t.z > 35 && t.z < 135) { t.x = -170; t.z = -160; t.speed = 0; }
    player.x = c.x + 2; player.z = c.z;
    api.enterNearestCar();
    if (S.driving) { S.driving.speed = 18; S.driving.health = 99999; S.carCamAngle = Math.PI; }
    S.cruise = 0.6;
    // Keep pedestrians out of the chase corridor so the star count stays 4.
    api.peds.forEach((p, i) => { p.axis = 'x'; p.line = -180; p.off = 9.6; p.along = -170 + i * 9; p.syncPos(); });
    wanted.setStars(4);
    S.starsLock = 4; // hold the posed 4-star level for the frame
    // Police close behind, lights flashing, not yet touching.
    for (let i = 0; i < 3; i++) {
      const u = police.spawnUnit(api.world, c.x, c.z);
      u.x = c.x + (i === 0 ? -2.7 : i === 1 ? 2.7 : 0); u.z = c.z + (i === 2 ? 13.5 : 8 + i * 0.6);
      u.angle = Math.PI; u.speed = 17;
    }
    S.camYaw = Math.PI;
  } else if (name === 'mission') {
    S.money = 390; S.rep = 2;
    missions.start(1); // Hot Package
    // Pin the pickup to a downtown intersection so the frame is urban:
    // beacon, pedestrians and traffic all around the player.
    const t = { x: 60, z: 0 };
    missions.active.target = t;
    missions.setBeacon(t.x, t.z);
    player.x = t.x + 6; player.z = t.z + 7;
    player.angle = Math.atan2(t.x - player.x, t.z - player.z);
    S.camYaw = player.angle;
    api.peds.slice(0, 4).forEach((p, i) => {
      p.axis = 'x'; p.line = 0; p.off = -5 + (i % 2) * 9;
      p.along = t.x - 7 + i * 3.8; p.dir = i % 2 ? -1 : 1;
      p.syncPos();
    });
  } else if (name === 'complete') {
    S.money = 150; S.rep = 1; // M1 banked; Rep 1 keeps the payout exactly $300
    missions.next = 1;
    missions.start(1); // Hot Package, $300
    const a = missions.active;
    a.phase = 'deliver';
    a.target = a.deliverTo;
    // Stand right at the delivery point: the real completion path fires,
    // pays out with the Rep multiplier and raises the banner itself.
    player.x = a.deliverTo.x; player.z = a.deliverTo.z;
    missions.setBeacon(a.target.x, a.target.z, 0xff5f6d);
  }
}
