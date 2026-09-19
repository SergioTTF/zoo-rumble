import type {
  AnimalDefinition,
  AnimalInstance,
  AnimalStats,
  StarLevel,
  TraitDefinition,
  TraitEffect,
  TraitThreshold,
  Team,
} from '../types';
import { STAR_MULTIPLIERS } from '../../content/balance';
export interface TraitStatus {
  readonly definition: TraitDefinition;
  readonly count: number;
  readonly active: TraitThreshold | null;
  readonly next: TraitThreshold | null;
}
export function calculateTraits(
  units: readonly Pick<AnimalInstance, 'animalId'>[],
  animals: readonly AnimalDefinition[],
  traits: readonly TraitDefinition[],
): readonly TraitStatus[] {
  const deployed = new Set(units.map((u) => u.animalId));
  return [...traits]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((definition) => {
      const count = animals.filter(
        (a) => deployed.has(a.id) && a.traits.includes(definition.id),
      ).length;
      const thresholds = [...definition.thresholds].sort(
        (a, b) => a.requiredUnits - b.requiredUnits,
      );
      return {
        definition,
        count,
        active:
          [...thresholds].reverse().find((t) => count >= t.requiredUnits) ??
          null,
        next: thresholds.find((t) => count < t.requiredUnits) ?? null,
      };
    });
}
export function teamTraits(
  units: readonly AnimalInstance[],
  animals: readonly AnimalDefinition[],
  traits: readonly TraitDefinition[],
  team: Team,
): readonly TraitStatus[] {
  return calculateTraits(
    units.filter((u) => u.team === team),
    animals,
    traits,
  );
}
export function effectsForAnimal(
  animal: AnimalDefinition,
  statuses: readonly TraitStatus[],
): readonly TraitEffect[] {
  return statuses.flatMap((status) =>
    animal.traits.includes(status.definition.id)
      ? (status.active?.effects ?? [])
      : [],
  );
}
export function resolvedStats(
  animal: AnimalDefinition,
  starLevel: StarLevel,
  effects: readonly TraitEffect[],
  tickMs: number,
): AnimalStats {
  const bonus = (stat: 'health' | 'attack' | 'attackSpeed' | 'moveSpeed') =>
    effects.reduce(
      (sum, effect) =>
        sum +
        (effect.kind === 'statBonus' && effect.stat === stat
          ? effect.amount
          : 0),
      0,
    );
  const multiplier = STAR_MULTIPLIERS[starLevel];
  const stats = animal.baseStats;
  return {
    ...stats,
    health: Math.round(stats.health * multiplier * (1 + bonus('health'))),
    attack: Math.round(stats.attack * multiplier * (1 + bonus('attack'))),
    attackIntervalMs: Math.max(
      tickMs,
      Math.round(stats.attackIntervalMs / (1 + bonus('attackSpeed'))),
    ),
    moveIntervalMs: Math.max(
      tickMs,
      Math.round(stats.moveIntervalMs / (1 + bonus('moveSpeed'))),
    ),
  };
}
