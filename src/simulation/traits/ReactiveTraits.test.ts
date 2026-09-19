import { expect, it } from 'vitest';
import { Battle } from '../battle/Battle';
import { ANIMALS } from '../../content/animals';
import { TRAITS } from '../../content/traits';
import { calculateTraits } from './Traits';
import type { AnimalDefinition, AnimalInstance, TraitEffect } from '../types';

const animal = (
  id: string,
  traits: string[],
  attack = 10,
): AnimalDefinition => ({
  id,
  name: id,
  tier: 1,
  traits,
  assetKey: id,
  baseStats: {
    health: 100,
    attack,
    attackRange: 8,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
  },
});
const unit = (
  id: string,
  animalId: string,
  team: 'player' | 'enemy',
  x: number,
): AnimalInstance => ({
  instanceId: id,
  animalId,
  team,
  position: { x, y: 0 },
  starLevel: 1,
});
const battle = (effect: TraitEffect, attack = 10) =>
  new Battle({
    seed: 'reactive',
    animals: [animal('a', ['test']), animal('b', [], attack)],
    traits: [
      {
        id: 'test',
        name: 'Test',
        thresholds: [{ requiredUnits: 1, description: '', effects: [effect] }],
      },
    ],
    units: [unit('a', 'a', 'player', 0), unit('b', 'b', 'enemy', 1)],
  });

it('gives every animal a role and valid trait and supports singleton and 2/4/6 thresholds', () => {
  for (const a of ANIMALS) {
    expect(a.role).toBeTruthy();
    expect(a.traits.length).toBeGreaterThan(0);
  }
  const count = (ids: string[], id: string) =>
    calculateTraits(
      ids.map((animalId) => ({ animalId })),
      ANIMALS,
      TRAITS,
    ).find((t) => t.definition.id === id)!;
  expect(count(['bear'], 'hardy').active?.requiredUnits).toBe(1);
  expect(count(['fox'], 'scavenger').active?.requiredUnits).toBe(1);
  expect(
    count(['fox', 'hyena', 'jackal', 'owl'], 'scavenger').active?.requiredUnits,
  ).toBe(4);
  expect(
    count(['bear', 'rabbit', 'fox', 'owl', 'monkey', 'chimpanzee'], 'woodland')
      .active?.requiredUnits,
  ).toBe(6);
  expect(count(['rabbit', 'rabbit'], 'woodland').active).toBeNull();
});

it('absorbs damage with shields before health and exposes depletion', () => {
  const b = battle({ kind: 'startingShield', ratio: 0.15 });
  expect(b.snapshot.units[0].shield).toBe(15);
  b.step();
  expect(b.snapshot.units[0]).toMatchObject({ shield: 5, health: 100 });
  b.step();
  expect(b.snapshot.units[0]).toMatchObject({ shield: 0, health: 95 });
});

it('duplicate species receive shields without adding to the threshold count', () => {
  const b = new Battle({
    seed: 'duplicates',
    animals: [animal('a', ['test']), animal('b', [])],
    traits: [
      {
        id: 'test',
        name: 'Test',
        thresholds: [
          {
            requiredUnits: 1,
            description: '',
            effects: [{ kind: 'startingShield', ratio: 0.1 }],
          },
        ],
      },
    ],
    units: [
      unit('a', 'a', 'player', 0),
      unit('c', 'a', 'player', 1),
      unit('b', 'b', 'enemy', 2),
    ],
  });
  expect(b.snapshot.traits?.[0].count).toBe(1);
  expect(
    b.snapshot.units.filter((u) => u.team === 'player').map((u) => u.shield),
  ).toEqual([10, 10]);
});

it('retaliation can kill an attacker and ends combat without recursion or post-finish changes', () => {
  const b = battle({ kind: 'retaliation', damage: 100 });
  b.step();
  expect(b.result?.winner).toBe('player');
  expect(b.drainEvents().filter((e) => e.type === 'traitProc')).toHaveLength(1);
  const snapshot = b.snapshot;
  b.step();
  expect(b.snapshot).toEqual(snapshot);
  expect(b.drainEvents()).toEqual([]);
});

it('dead defenders cannot retaliate', () => {
  const b = battle({ kind: 'retaliation', damage: 100 }, 100);
  b.step();
  expect(b.result?.winner).toBe('enemy');
  expect(b.drainEvents().some((e) => e.type === 'traitProc')).toBe(false);
});

it('heals only living trait members after allied death, caps health, and replays deterministically', () => {
  const run = () => {
    const b = new Battle({
      seed: 'healing',
      animals: [
        animal('scavenger', ['test']),
        animal('ally', []),
        animal('enemy', [], 70),
      ],
      traits: [
        {
          id: 'test',
          name: 'Test',
          thresholds: [
            {
              requiredUnits: 1,
              description: '',
              effects: [{ kind: 'allyDeathHeal', ratio: 0.8 }],
            },
          ],
        },
      ],
      units: [
        unit('a-enemy', 'enemy', 'enemy', 2),
        { ...unit('aa-enemy', 'enemy', 'enemy', 0), position: { x: 0, y: 1 } },
        unit('b-ally', 'ally', 'player', 1),
        unit('c-scavenger', 'scavenger', 'player', 0),
      ],
    });
    // Both allies take damage before the first ally falls on tick two.
    const events = [...b.drainEvents()];
    while (!b.isFinished()) {
      b.step();
      events.push(...b.drainEvents());
    }
    expect(b.snapshot.units.every((u) => u.health <= u.maxHealth)).toBe(true);
    expect(
      events.filter((e) => e.type === 'traitProc' && e.effect === 'heal'),
    ).toEqual([
      expect.objectContaining({ unitId: 'c-scavenger', amount: 70, tick: 2 }),
    ]);
    return { events, result: b.result };
  };
  expect(run()).toEqual(run());
});
