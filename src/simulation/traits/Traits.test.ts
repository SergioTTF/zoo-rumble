import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../content/animals';
import { TRAITS } from '../../content/traits';
import { Battle } from '../battle/Battle';
import { damageForHit } from '../abilities/effects';
import { calculateTraits, effectsForAnimal, resolvedStats } from './Traits';
import type { AnimalInstance, BattleConfig } from '../types';
const units = (
  ids: string[],
  team: 'player' | 'enemy' = 'player',
): AnimalInstance[] =>
  ids.map((animalId, index) => ({
    animalId,
    instanceId: `${team}-${index}`,
    team,
    starLevel: 1,
    position: { x: team === 'player' ? 2 : 5, y: index },
  }));
const status = (ids: string[], traitId: string) =>
  calculateTraits(units(ids), ANIMALS, TRAITS).find(
    (s) => s.definition.id === traitId,
  )!;
describe('trait thresholds', () => {
  it('activates Canine at two and four different deployed species', () => {
    expect(status(['wolf'], 'canine').active).toBeNull();
    expect(status(['wolf', 'dog'], 'canine').active?.requiredUnits).toBe(2);
    expect(status(['wolf', 'dog', 'fox'], 'canine').next?.requiredUnits).toBe(
      4,
    );
    expect(
      status(['wolf', 'dog', 'fox', 'jackal'], 'canine').active?.requiredUnits,
    ).toBe(4);
  });
  it('duplicates, stars, and bench copies cannot inflate counts', () => {
    expect(status(['wolf', 'wolf', 'wolf'], 'canine').count).toBe(1);
    const owned = [
      ...units(['wolf']),
      {
        ...units(['fox'])[0],
        location: { kind: 'bench' },
        instanceId: 'bench',
      },
    ];
    const deployed = owned.filter((u) => !('location' in u));
    expect(
      calculateTraits(deployed, ANIMALS, TRAITS).find(
        (s) => s.definition.id === 'canine',
      )?.active,
    ).toBeNull();
    expect(
      calculateTraits(
        units(['wolf', 'dog']).map((u) => ({ ...u, starLevel: 3 as const })),
        ANIMALS,
        TRAITS,
      ).find((s) => s.definition.id === 'canine')?.count,
    ).toBe(2);
  });
  it('supports overlapping traits and picks only the highest threshold', () => {
    const statuses = calculateTraits(
      units(['wolf', 'fox', 'dog', 'jackal']),
      ANIMALS,
      TRAITS,
    );
    const wolf = ANIMALS.find((a) => a.id === 'wolf')!;
    const effects = effectsForAnimal(wolf, statuses);
    expect(
      effects.filter((e) => e.kind === 'statBonus' && e.stat === 'attackSpeed'),
    ).toEqual([{ kind: 'statBonus', stat: 'attackSpeed', amount: 0.35 }]);
    expect(effects.some((e) => e.kind === 'damageBelowHealth')).toBe(true);
    expect(
      effectsForAnimal(
        ANIMALS.find((a) => a.id === 'bear')!,
        statuses,
      ),
    ).toEqual([]);
  });
});
describe('combat integration', () => {
  const config = (ids: string[]): BattleConfig => ({
    seed: 'trait-battle',
    animals: ANIMALS,
    traits: TRAITS,
    units: [...units(ids), ...units(['wolf', 'wolf'], 'enemy')],
  });
  it('applies scoped star/stat bonuses once and resolves attack/move intervals', () => {
    const primates = new Battle(config(['monkey', 'gorilla']));
    expect(
      primates.snapshot.units.find((u) => u.animalId === 'monkey'),
    ).toMatchObject({ maxHealth: 88, attack: 15 });
    expect(
      primates.snapshot.units.find((u) => u.team === 'enemy'),
    ).toMatchObject({ maxHealth: 90, attack: 18 });
    const canine = ANIMALS.find((a) => a.id === 'wolf')!;
    const effects = effectsForAnimal(
      canine,
      calculateTraits(units(['wolf', 'dog']), ANIMALS, TRAITS),
    );
    expect(resolvedStats(canine, 2, effects, 100)).toMatchObject({
      health: 162,
      attack: 32,
      attackIntervalMs: 870,
    });
    const chicken = ANIMALS.find((a) => a.id === 'chicken')!;
    const birds = effectsForAnimal(
      chicken,
      calculateTraits(units(['chicken', 'penguin']), ANIMALS, TRAITS),
    );
    expect(resolvedStats(chicken, 1, birds, 100)).toMatchObject({
      moveIntervalMs: 333,
      attackIntervalMs: 636,
    });
  });
  it('uses Canine cooldowns in the actual attack schedule', () => {
    const base = config(['wolf', 'dog']);
    const animals = ANIMALS.map((a) => ({
      ...a,
      baseStats: { ...a.baseStats, health: 10000, attackRange: 8 },
    }));
    const battle = new Battle({ ...base, animals });
    const ticks: number[] = [];
    for (let i = 0; i < 20; i++) {
      battle.step();
      for (const event of battle.drainEvents())
        if (event.type === 'unitAttacked' && event.unitId === 'player-0')
          ticks.push(event.tick);
    }
    expect(ticks).toEqual([1, 10, 19]);
  });
  it('evaluates Predator before each hit and multiplies with abilities before rounding', () => {
    const wolf = ANIMALS.find((a) => a.id === 'wolf')!;
    const effects = effectsForAnimal(
      wolf,
      calculateTraits(units(['wolf', 'fox']), ANIMALS, TRAITS),
    );
    expect(damageForHit(18, wolf.ability, 40, 100, effects).damage).toBe(18);
    expect(damageForHit(18, wolf.ability, 39, 100, effects).damage).toBe(31);
    expect(damageForHit(9, wolf.ability, 39, 100, effects).damage).toBe(16);
  });
  it('emits ordered trait events, freezes battle-start bonuses, and replays deterministically', () => {
    const run = () => {
      const battle = new Battle(config(['wolf', 'fox', 'dog', 'jackal']));
      const events = [...battle.drainEvents()];
      const traits = battle.snapshot.traits;
      while (!battle.isFinished()) {
        battle.step();
        events.push(...battle.drainEvents());
      }
      expect(battle.snapshot.traits).toEqual(traits);
      return { result: battle.result, events };
    };
    const first = run();
    expect(run()).toEqual(first);
    expect(first.events[0].type).toBe('battleStarted');
    expect(
      first.events.filter((e) => e.type === 'traitActivated'),
    ).toHaveLength(3);
  });
  it('has reachable thresholds, all five tiers, and only defined trait references', () => {
    expect(new Set(ANIMALS.map((a) => a.tier)).size).toBe(5);
    for (const animal of ANIMALS)
      for (const id of animal.traits)
        expect(TRAITS.some((t) => t.id === id)).toBe(true);
    for (const trait of TRAITS)
      expect(
        ANIMALS.filter((a) => a.traits.includes(trait.id)).length,
      ).toBeGreaterThanOrEqual(
        Math.max(...trait.thresholds.map((t) => t.requiredUnits)),
      );
  });
});
