export const BATTLE_RULES = {
  width: 8,
  height: 6,
  tickMs: 100,
  maxDurationMs: 60_000,
} as const;
export const SQUAD_RULES = {
  benchCapacity: 8,
  deployedCapacity: 2,
  deploymentColumns: 3,
} as const;
export const STAR_MULTIPLIERS = { 1: 1, 2: 1.8, 3: 3.2 } as const;
