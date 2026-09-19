import type { Position } from '../types';

export const distance = (a: Position, b: Position): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const cellKey = (p: Position): string => `${p.x},${p.y}`;

// East, south, west, north is the documented tie order for both teams.
const neighbors = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
export function nextPathCell(
  start: Position,
  target: Position,
  range: number,
  width: number,
  height: number,
  occupied: ReadonlySet<string>,
): Position | null {
  const queue: { position: Position; first: Position | null }[] = [
    { position: start, first: null },
  ];
  const visited = new Set([cellKey(start)]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (distance(current.position, target) <= range) return current.first;
    for (const delta of neighbors) {
      const position = {
        x: current.position.x + delta.x,
        y: current.position.y + delta.y,
      };
      const key = cellKey(position);
      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x >= width ||
        position.y >= height ||
        occupied.has(key) ||
        visited.has(key)
      )
        continue;
      visited.add(key);
      queue.push({ position, first: current.first ?? position });
    }
  }
  return null;
}
