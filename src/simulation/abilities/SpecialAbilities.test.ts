import { expect, it } from 'vitest';
import { ANIMALS } from '../../content/animals';
import { Battle } from '../battle/Battle';
import type { AnimalDefinition, BattleEvent, BattleConfig } from '../types';

const durable = (animal: AnimalDefinition): AnimalDefinition => ({
  ...animal,
  baseStats: { ...animal.baseStats, health: 5000, attackRange: 8 },
});
const dummy: AnimalDefinition = {
  id: 'dummy',
  name: 'Dummy',
  tier: 1,
  traits: [],
  assetKey: 'dummy',
  baseStats: {
    health: 5000,
    attack: 1,
    attackRange: 8,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
  },
};
const eventsFor = (config: BattleConfig, ticks: number) => {
  const battle = new Battle(config);
  const events: BattleEvent[] = [...battle.drainEvents()];
  for (let i = 0; i < ticks && !battle.isFinished(); i++) {
    battle.step();
    events.push(...battle.drainEvents());
  }
  return events;
};

it('Bear Hug triggers every third normal attack and prevents actions for exactly one second', () => {
  const bear = durable(ANIMALS.find((a) => a.id === 'bear')!);
  const events = eventsFor(
    {
      seed: 'hug',
      animals: [bear, dummy],
      units: [
        {
          instanceId: 'a-bear',
          animalId: 'bear',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'b-dummy',
          animalId: 'dummy',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
      ],
    },
    45,
  );
  expect(
    events
      .filter((e) => e.type === 'abilityTriggered' && e.ability === 'bearHug')
      .map((e) => e.tick),
  ).toEqual([29]);
  const enemyTicks = events
    .filter((e) => e.type === 'unitAttacked' && e.unitId === 'b-dummy')
    .map((e) => e.tick);
  expect(enemyTicks).toContain(28);
  expect(enemyTicks).not.toContain(29);
  expect(enemyTicks).not.toContain(38);
  expect(enemyTicks).toContain(39);
});

it('Howl accelerates the caster and nearby allied Wolves, excludes distant Wolves, and is deterministic', () => {
  const wolf = durable(ANIMALS.find((a) => a.id === 'wolf')!);
  const config: BattleConfig = {
    seed: 'howl',
    animals: [wolf, dummy],
    units: [
      {
        instanceId: 'a-caster',
        animalId: 'wolf',
        team: 'player',
        starLevel: 1,
        position: { x: 0, y: 0 },
      },
      {
        instanceId: 'b-near',
        animalId: 'wolf',
        team: 'player',
        starLevel: 1,
        position: { x: 1, y: 0 },
      },
      {
        instanceId: 'c-far',
        animalId: 'wolf',
        team: 'player',
        starLevel: 1,
        position: { x: 7, y: 5 },
      },
      {
        instanceId: 'z-dummy',
        animalId: 'dummy',
        team: 'enemy',
        starLevel: 1,
        position: { x: 2, y: 1 },
      },
    ],
  };
  const run = () => eventsFor(config, 42);
  const first = run();
  expect(run()).toEqual(first);
  const applied = first.filter(
    (e) => e.type === 'statusApplied' && e.status === 'howl' && e.tick === 21,
  );
  const targets = applied.map((e) =>
    e.type === 'statusApplied' ? e.targetId : '',
  );
  expect(targets).toEqual(['a-caster', 'b-near', 'a-caster', 'b-near']);
  expect(targets).not.toContain('c-far');
  expect(
    first
      .filter((e) => e.type === 'unitAttacked' && e.unitId === 'a-caster')
      .map((e) => e.tick),
  ).toContain(29);
});

it('does not trigger a special after its triggering hit kills the target', () => {
  const bear = {
    ...durable(ANIMALS.find((a) => a.id === 'bear')!),
    specialAbility: { kind: 'bearHug' as const, every: 1, stunMs: 1000 },
    baseStats: {
      ...durable(ANIMALS.find((a) => a.id === 'bear')!).baseStats,
      attack: 5000,
    },
  };
  expect(
    eventsFor(
      {
        seed: 'lethal',
        animals: [bear, dummy],
        units: [
          {
            instanceId: 'a',
            animalId: 'bear',
            team: 'player',
            starLevel: 1,
            position: { x: 0, y: 0 },
          },
          {
            instanceId: 'b',
            animalId: 'dummy',
            team: 'enemy',
            starLevel: 1,
            position: { x: 1, y: 0 },
          },
        ],
      },
      1,
    ).some((e) => e.type === 'abilityTriggered' && e.ability === 'bearHug'),
  ).toBe(false);
});
