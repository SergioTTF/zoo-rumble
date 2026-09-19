export type Facing = 'left' | 'front' | 'rear' | 'right';
export type Pose = 'idle' | 'walk' | 'attack' | 'death';
const row: Readonly<Record<Facing, number>> = {
  left: 0,
  front: 1,
  rear: 2,
  right: 3,
};

export function facingFor(dx: number, dy: number, previous: Facing): Facing {
  if (dx === 0 && dy === 0) return previous;
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'front' : 'rear';
  return dx > 0 ? 'right' : 'left';
}

export function directionalFrame(
  facing: Facing,
  pose: Pose,
  elapsedMs: number,
  reducedMotion: boolean,
  timings: readonly number[],
  hasActions = false,
): number {
  const base = row[facing] * 4;
  if (hasActions) {
    const offset = { walk: 0, idle: 16, attack: 32, death: 48 }[pose];
    if (reducedMotion) return pose === 'death' ? 48 + base + 3 : 16 + base;
    const cycle = timings.reduce((sum, ms) => sum + ms, 0);
    let elapsed =
      pose === 'attack' || pose === 'death'
        ? Math.min(Math.max(0, elapsedMs), cycle - 1)
        : Math.max(0, elapsedMs) % cycle;
    let index = 0;
    while (index < 3 && elapsed >= timings[index]) elapsed -= timings[index++];
    return offset + base + index;
  }
  // Sheets contain walking only. Idle/attack keep a contact pose;
  // ordered combat events drive lunges, projectiles, flashes and deaths.
  if (reducedMotion || pose !== 'walk') return base;
  const cycle = timings.reduce((sum, ms) => sum + ms, 0);
  let elapsed = Math.max(0, elapsedMs) % cycle;
  let index = 0;
  while (index < 3 && elapsed >= timings[index]) {
    elapsed -= timings[index++];
  }
  return base + index;
}
