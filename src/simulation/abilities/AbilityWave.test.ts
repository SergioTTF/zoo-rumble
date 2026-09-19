import { describe, expect, it } from 'vitest';
import { Battle } from '../battle/Battle';
import type {
  AnimalDefinition,
  BattleConfig,
  BattleEvent,
  SpecialAbilityDefinition,
} from '../types';

const animal = (
  id: string,
  specialAbility?: SpecialAbilityDefinition,
  overrides: Partial<AnimalDefinition['baseStats']> = {},
): AnimalDefinition => ({
  id,
  name: id,
  tier: 1,
  traits: [],
  assetKey: id,
  baseStats: {
    health: 100,
    attack: 10,
    attackRange: 20,
    attackIntervalMs: 100,
    moveIntervalMs: 100,
    ...overrides,
  },
  specialAbility,
});

const run = (config: BattleConfig, ticks: number) => {
  const battle = new Battle(config);
  const events: BattleEvent[] = [...battle.drainEvents()];
  for (let tick = 0; tick < ticks && !battle.isFinished(); tick++) {
    battle.step();
    events.push(...battle.drainEvents());
  }
  return { battle, events };
};

describe('second special ability wave', () => {
  it('Loyal Guard shields the allied unit with the lowest health ratio', () => {
    const dog = animal('dog', {
      kind: 'loyalGuard',
      every: 1,
      shieldRatio: 0.2,
    });
    const friend = animal('friend');
    const enemy = animal('enemy', undefined, { attack: 10 });
    const { battle, events } = run(
      {
        seed: 'guard',
        animals: [dog, friend, enemy],
        units: [
          {
            instanceId: 'a-enemy',
            animalId: 'enemy',
            team: 'enemy',
            starLevel: 1,
            position: { x: 1, y: 0 },
          },
          {
            instanceId: 'b-ally',
            animalId: 'friend',
            team: 'player',
            starLevel: 1,
            position: { x: 0, y: 0 },
          },
          {
            instanceId: 'c-guard',
            animalId: 'dog',
            team: 'player',
            starLevel: 1,
            position: { x: 7, y: 5 },
          },
        ],
      },
      1,
    );
    expect(
      events.find(
        (event) => event.type === 'statusApplied' && event.status === 'guarded',
      ),
    ).toMatchObject({ unitId: 'c-guard', targetId: 'b-ally' });
    expect(
      battle.snapshot.units.find((unit) => unit.instanceId === 'b-ally')
        ?.shield,
    ).toBe(20);
  });

  it('Pounce adds a separately ordered burst of rounded bonus damage', () => {
    const fox = animal('fox', {
      kind: 'pounce',
      every: 1,
      bonusDamage: 0.75,
    });
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const { events } = run(
      {
        seed: 'pounce',
        animals: [fox, target],
        units: [
          {
            instanceId: 'a-fox',
            animalId: 'fox',
            team: 'player',
            starLevel: 1,
            position: { x: 0, y: 0 },
          },
          {
            instanceId: 'z-target',
            animalId: 'target',
            team: 'enemy',
            starLevel: 1,
            position: { x: 1, y: 0 },
          },
        ],
      },
      1,
    );
    expect(
      events
        .filter(
          (event) => event.type === 'damageDealt' && event.unitId === 'a-fox',
        )
        .map((event) => (event.type === 'damageDealt' ? event.damage : 0)),
    ).toEqual([10, 8]);
  });

  it('Chill slows future attack cooldowns for its exact duration', () => {
    const penguin = animal('penguin', {
      kind: 'chill',
      every: 3,
      slow: 0.5,
      durationMs: 300,
    });
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const { events } = run(
      {
        seed: 'chill',
        animals: [penguin, target],
        units: [
          {
            instanceId: 'a-penguin',
            animalId: 'penguin',
            team: 'player',
            starLevel: 1,
            position: { x: 0, y: 0 },
          },
          {
            instanceId: 'z-target',
            animalId: 'target',
            team: 'enemy',
            starLevel: 1,
            position: { x: 1, y: 0 },
          },
        ],
      },
      7,
    );
    expect(
      events
        .filter(
          (event) =>
            event.type === 'unitAttacked' && event.unitId === 'z-target',
        )
        .map((event) => event.tick),
    ).toEqual([1, 2, 3, 5, 7]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'statusApplied',
        status: 'slowed',
        targetId: 'z-target',
        durationMs: 300,
      }),
    );
  });

  it('Ground Slam stuns each nearby enemy in stable instance order', () => {
    const gorilla = animal('gorilla', {
      kind: 'groundSlam',
      every: 1,
      stunMs: 200,
      radius: 1,
    });
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const { events } = run(
      {
        seed: 'slam',
        animals: [gorilla, target],
        units: [
          {
            instanceId: 'a-gorilla',
            animalId: 'gorilla',
            team: 'player',
            starLevel: 1,
            position: { x: 1, y: 1 },
          },
          {
            instanceId: 'b-near',
            animalId: 'target',
            team: 'enemy',
            starLevel: 1,
            position: { x: 1, y: 0 },
          },
          {
            instanceId: 'c-near',
            animalId: 'target',
            team: 'enemy',
            starLevel: 1,
            position: { x: 2, y: 1 },
          },
          {
            instanceId: 'd-far',
            animalId: 'target',
            team: 'enemy',
            starLevel: 1,
            position: { x: 4, y: 1 },
          },
        ],
      },
      1,
    );
    expect(
      events
        .filter(
          (event) =>
            event.type === 'statusApplied' && event.status === 'stunned',
        )
        .map((event) => (event.type === 'statusApplied' ? event.targetId : '')),
    ).toEqual(['b-near', 'c-near']);
  });

  it('replays the complete ability event stream deterministically', () => {
    const fox = animal('fox', {
      kind: 'pounce',
      every: 2,
      bonusDamage: 0.8,
    });
    const target = animal('target', undefined, { health: 1000, attack: 1 });
    const config: BattleConfig = {
      seed: 'repeat-special',
      animals: [fox, target],
      units: [
        {
          instanceId: 'fox',
          animalId: 'fox',
          team: 'player',
          starLevel: 1,
          position: { x: 0, y: 0 },
        },
        {
          instanceId: 'target',
          animalId: 'target',
          team: 'enemy',
          starLevel: 1,
          position: { x: 1, y: 0 },
        },
      ],
    };
    expect(run(config, 8).events).toEqual(run(config, 8).events);
  });
});
