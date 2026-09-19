import type { Position } from '../simulation/types';
import { BATTLE_RULES } from '../content/balance';

export const ARENA_SIZE = { width: 960, height: 640 } as const;
const origin = { x: 175, y: 370 };
const half = { width: 57, height: 32 };

export function project(p: Position) {
  return {
    x: origin.x + (p.x + p.y) * half.width,
    y: origin.y + (p.y - p.x) * half.height,
  };
}
export function cellAt(x: number, y: number): Position | null {
  const u = (x - origin.x) / half.width;
  const v = (y - origin.y) / half.height;
  const cell = {
    x: Math.floor((u - v) / 2 + 0.5),
    y: Math.floor((u + v) / 2 + 0.5),
  };
  return cell.x >= 0 &&
    cell.x < BATTLE_RULES.width &&
    cell.y >= 0 &&
    cell.y < BATTLE_RULES.height
    ? cell
    : null;
}
export function tileCorners(p: Position) {
  const center = project(p);
  return [
    { x: center.x, y: center.y - half.height },
    { x: center.x + half.width, y: center.y },
    { x: center.x, y: center.y + half.height },
    { x: center.x - half.width, y: center.y },
  ];
}
export function clientCell(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return cellAt(
    ((clientX - rect.left) * ARENA_SIZE.width) / rect.width,
    ((clientY - rect.top) * ARENA_SIZE.height) / rect.height,
  );
}
export function unitDepth(p: Position) {
  return 100 + project(p).y + p.x * 0.001;
}
