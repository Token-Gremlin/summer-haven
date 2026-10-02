/** Access audit for every authored home, including the two new neighborhoods. */
export async function reviewNeighborhoodAccess() {
  const g = window.__haven;
  const { BUILDINGS } = await import('/src/data/world.ts');
  const checks = BUILDINGS.map((b) => {
    const door = g.village.interactions.find((i) => i.id === b.id);
    const route = g.villagers.nav.route([0, 17], [door.x, door.z]);
    const end = route.at(-1);
    const distance = end ? Math.hypot(end[0] - door.x, end[1] - door.z) : Infinity;
    return { building: b.name, pass: !!end && distance < door.radius, distance, nodes: route.length };
  });
  return {
    date: new Date().toISOString(),
    checks,
    passed: checks.filter((c) => c.pass).length,
    failed: checks.filter((c) => !c.pass),
    buildings: BUILDINGS.length,
    trees: g.village.woodland.stats().total,
    plantedInstances: g.village.vegetation.reduce((n, m) => n + m.userData.max, 0),
    villagers: g.villagers.actors.length,
  };
}

/** Check authored seat anchors through the same interaction action as the E key. */
export async function reviewGardenSeats() {
  const g = window.__haven;
  const originalPosition = g.player.position.clone();
  const frame = () => new Promise(requestAnimationFrame);
  const checks = [];
  g.start();
  for (const seat of g.village.interactions.filter((i) => i.id.startsWith('pergola-'))) {
    g.player.seated = false;
    g.teleport(seat.x, seat.z);
    for (let i = 0; i < 3; i++) await frame();
    g.interact();
    for (let i = 0; i < 3; i++) await frame();
    const actual = g.player.character.group.position.toArray();
    const anchored = Math.hypot(actual[0] - seat.seat[0], actual[2] - seat.seat[1] - 0.13) < 0.02;
    const seated = g.player.seated;
    g.input.keys.add('KeyW');
    for (let i = 0; i < 3; i++) await frame();
    g.input.clear();
    checks.push({ id: seat.id, pass: seated && anchored && !g.player.seated, actual, seat: seat.seat });
  }
  g.teleport(originalPosition.x, originalPosition.z);
  return { date: new Date().toISOString(), checks, passed: checks.filter((c) => c.pass).length };
}
